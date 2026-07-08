import os
import time
import shutil
import json
import asyncio
from sse_starlette.sse import EventSourceResponse
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.agent_run import AgentRun
from app.db.models.message import Message
from app.schemas.agent import AgentRunRequest, AgentRunResponse, MessageResponse, MessageCreateRequest
from app.core.security import get_current_user
from app.core.rate_limit import RateLimiter
from app.core.config import settings
from app.agent.brain import agent_executor

from app.tools.rag import ingest_document

router = APIRouter(prefix="/agent", tags=["Agent"])

# Temp uploads directory
TEMP_DIR = settings.TEMP_UPLOAD_DIR
os.makedirs(TEMP_DIR, exist_ok=True)

# Max upload size in bytes
MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ====== Helper: Process and save agent messages to DB ======
def _process_and_save_messages(new_messages, run_id: int, db: Session):
    """
    Common helper to process LangChain messages and save them to DB.
    Returns the final assistant Message object (or None).
    """
    final_assistant_msg = None

    for msg in new_messages:
        msg_type = type(msg).__name__
        if msg_type == "HumanMessage":
            continue  # Skip user message (already saved)

        role = "assistant"
        tool_name = None
        tool_data = None
        content = msg.content

        if msg_type == "AIMessage":
            if msg.tool_calls:
                role = "tool_call"
                tool_name = msg.tool_calls[0]["name"]
                tool_data = msg.tool_calls[0]
            else:
                role = "assistant"
                # Normalize content block to string
                if isinstance(content, list):
                    text_parts = []
                    for part in content:
                        if isinstance(part, dict) and "text" in part:
                            text_parts.append(part["text"])
                        elif isinstance(part, str):
                            text_parts.append(part)
                    content = "\n".join(text_parts)
                elif not isinstance(content, str):
                    content = str(content)
        elif msg_type == "ToolMessage":
            role = "tool_result"
            tool_name = getattr(msg, "name", None)
            tool_data = {
                "tool_call_id": getattr(msg, "tool_call_id", None)
            }
            if not isinstance(content, str):
                content = str(content)
        else:
            if not isinstance(content, str):
                content = str(content)

        db_msg = Message(
            run_id=run_id,
            role=role,
            content=content,
            tool_name=tool_name,
            tool_data=tool_data
        )
        db.add(db_msg)
        db.flush()
        if role == "assistant":
            final_assistant_msg = db_msg

    return final_assistant_msg


# ====== Helper: Handle stream error (save error msg + update run status) ======
def _handle_agent_error(db: Session, run_id: int, error: Exception, context: str = ""):
    """Save error state to DB after agent failure. Handles rollback + re-query properly."""
    db.rollback()
    # Re-query run object after rollback (old reference is stale)
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if run:
        run.status = "failed"
    error_msg = Message(
        run_id=run_id,
        role="assistant",
        content=f"[ERROR] Agent failed{' during ' + context if context else ''}: {str(error)}"
    )
    db.add(error_msg)
    db.commit()


# ====== Helper: SSE stream event parsing for token/tool events ======
def _parse_stream_event(event):
    """Extract relevant data from LangGraph stream events. Returns (event_type, data_dict) or None."""
    event_type = event["event"]
    name = event["name"]

    if event_type == "on_tool_start":
        return "tool_start", {
            "tool_name": name,
            "input": event["data"].get("input", {})
        }
    elif event_type == "on_tool_end":
        output_data = event["data"].get("output")
        output_content = ""
        if output_data:
            if hasattr(output_data, "content"):
                output_content = output_data.content
            else:
                output_content = str(output_data)
        return "tool_end", {
            "tool_name": name,
            "output": output_content
        }
    elif event_type == "on_chat_model_stream" and name == "ChatGoogleGenerativeAI":
        content = event["data"]["chunk"].content
        text = ""
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and "text" in part:
                    text += part["text"]
                elif isinstance(part, str):
                    text += part
        elif isinstance(content, str):
            text = content
        if text:
            return "token", text
    return None, None


# ============================================================
# 1. Create a new Agent Run Session
# ============================================================
@router.post("/run", response_model=AgentRunResponse)
def create_run(
    req: AgentRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        run = AgentRun(
            user_id=current_user.id,
            goal=req.goal,
            status="running"
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create run: {str(e)}"
        )


# ============================================================
# 2. Get all runs for current user (Chat History list)
# ============================================================
@router.get("/runs", response_model=List[AgentRunResponse])
def get_runs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    runs = db.query(AgentRun).filter(AgentRun.user_id == current_user.id).order_by(AgentRun.created_at.desc()).all()
    return runs


# ============================================================
# 3. Get all messages in a specific run
# ============================================================
@router.get("/run/{run_id}/messages", response_model=List[MessageResponse])
def get_run_messages(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify run ownership
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.user_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Agent run session not found.")

    messages = db.query(Message).filter(Message.run_id == run_id).order_by(Message.created_at.asc()).all()
    return messages


# ============================================================
# 4a. Send message (non-streaming)
# ============================================================
@router.post("/run/{run_id}/message", response_model=MessageResponse, dependencies=[Depends(RateLimiter(requests_limit=10, window_seconds=60))])
def send_message(
    run_id: int,
    req: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify run ownership
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.user_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Agent run session not found.")

    # Save User message in DB
    user_msg = Message(run_id=run_id, role="user", content=req.content)
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Set run status to running
    run.status = "running"
    db.commit()

    # Invoke Agent Brain
    config = {
        "configurable": {"thread_id": f"run_{run_id}"},
        "recursion_limit": settings.AGENT_MAX_STEPS
    }
    try:
        # Get pre-execution state messages count
        state = agent_executor.get_state(config)
        pre_count = len(state.values.get("messages", [])) if state.values else 0

        response = agent_executor.invoke(
            {"messages": [("user", req.content)]},
            config=config
        )

        # Save intermediate tool messages and final response
        new_messages = response["messages"][pre_count:]
        final_assistant_msg = _process_and_save_messages(new_messages, run_id, db)

        # Update run status
        run.status = "completed"
        db.commit()

        # Return final assistant message if found, else last message in run
        if not final_assistant_msg:
            final_assistant_msg = db.query(Message).filter(Message.run_id == run_id).order_by(Message.id.desc()).first()

        return final_assistant_msg
    except Exception as e:
        _handle_agent_error(db, run_id, e)
        raise HTTPException(status_code=500, detail=f"Agent runtime error: {str(e)}")


# ============================================================
# 4b. Send message (SSE streaming)
# ============================================================
@router.post("/run/{run_id}/message/stream", dependencies=[Depends(RateLimiter(requests_limit=10, window_seconds=60))])
async def send_message_stream(
    run_id: int,
    req: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify run ownership
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.user_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Agent run session not found.")

    # Save User message in DB
    user_msg = Message(run_id=run_id, role="user", content=req.content)
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Set run status to running
    run.status = "running"
    db.commit()

    async def event_generator():
        config = {
            "configurable": {"thread_id": f"run_{run_id}"},
            "recursion_limit": settings.AGENT_MAX_STEPS
        }

        try:
            # 1. Get pre-execution state messages count
            state = agent_executor.get_state(config)
            pre_count = len(state.values.get("messages", [])) if state.values else 0

            # Send initial event
            yield {"event": "status", "data": json.dumps({"status": "connected", "user_message_id": user_msg.id})}

            # 2. Iterate over the events stream
            async for event in agent_executor.astream_events(
                {"messages": [("user", req.content)]},
                version="v2",
                config=config
            ):
                evt_type, evt_data = _parse_stream_event(event)
                if evt_type == "token":
                    yield {"event": "token", "data": evt_data}
                elif evt_type in ("tool_start", "tool_end"):
                    yield {"event": evt_type, "data": json.dumps(evt_data)}

            # 3. Stream completed — save to DB
            state = agent_executor.get_state(config)
            new_messages = state.values.get("messages", [])[pre_count:]
            final_assistant_msg = _process_and_save_messages(new_messages, run_id, db)

            run.status = "completed"
            db.commit()

            if not final_assistant_msg:
                final_assistant_msg = db.query(Message).filter(Message.run_id == run_id).order_by(Message.id.desc()).first()

            yield {
                "event": "done",
                "data": json.dumps({
                    "status": "completed",
                    "assistant_message_id": final_assistant_msg.id if final_assistant_msg else None
                })
            }

        except asyncio.CancelledError:
            # Handle client disconnect mid-stream
            print("Streaming request was cancelled by client connection drop.")
            try:
                state = agent_executor.get_state(config)
                new_messages = state.values.get("messages", [])[pre_count:]
                _process_and_save_messages(new_messages, run_id, db)
                run.status = "completed"
                db.commit()
            except Exception as inner_e:
                print(f"Failed to save state during cancellation: {inner_e}")
                db.rollback()

        except Exception as e:
            _handle_agent_error(db, run_id, e, "streaming")
            yield {
                "event": "error",
                "data": json.dumps({"detail": f"Streaming runtime error: {str(e)}"})
            }

    return EventSourceResponse(event_generator())


# ============================================================
# 5. Delete a run session and all its messages
# ============================================================
@router.delete("/run/{run_id}", status_code=200)
def delete_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.user_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Agent run session not found.")
    # Delete all messages first (FK constraint)
    db.query(Message).filter(Message.run_id == run_id).delete(synchronize_session=False)
    db.delete(run)
    db.commit()

    # Delete associated document chunks from ChromaDB
    from app.tools.rag import collection
    if collection is not None:
        try:
            collection.delete(where={"run_id": run_id})
        except Exception as e:
            print(f"Failed to delete ChromaDB documents for run {run_id}: {e}")

    return {"detail": "Session deleted."}


# ============================================================
# 6. Upload a document to ChromaDB for this agent run session
# ============================================================
@router.post("/run/{run_id}/upload-file")
def upload_file(
    run_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify run ownership
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.user_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Agent run session not found.")

    # Validate file size
    if file.size and file.size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    try:
        # Save file temporarily to disk
        temp_file_path = os.path.join(TEMP_DIR, file.filename)
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Double-check file size on disk (for chunked uploads where file.size may be None)
        file_size = os.path.getsize(temp_file_path)
        if file_size > MAX_UPLOAD_BYTES:
            os.remove(temp_file_path)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        # Index in ChromaDB
        result_msg = ingest_document(file.filename, temp_file_path, run_id=run_id, user_id=current_user.id, file_size=file_size)

        # Delete temp file after successful ingestion
        if os.path.exists(temp_file_path) and not result_msg.startswith("Error"):
            os.remove(temp_file_path)

        # Save system message in DB
        doc_msg = Message(
            run_id=run_id,
            role="assistant",
            content=f"[SYSTEM] Uploaded and processed file: '{file.filename}'. {result_msg}"
        )
        db.add(doc_msg)
        db.commit()

        # Update LangGraph memory checkpointer state
        try:
            from langchain_core.messages import AIMessage
            config = {"configurable": {"thread_id": f"run_{run_id}"}}
            agent_executor.update_state(
                config,
                {"messages": [AIMessage(content=f"[SYSTEM] Uploaded and processed file: '{file.filename}'. {result_msg}")]}
            )
        except Exception as memory_err:
            print(f"Failed to update agent checkpointer state memory: {memory_err}")

        return {"filename": file.filename, "status": "success", "detail": result_msg}
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


# ============================================================
# 7. Edit user query and regenerate response from that point
# ============================================================
@router.put("/run/{run_id}/message/{message_id}", dependencies=[Depends(RateLimiter(requests_limit=10, window_seconds=60))])
async def edit_message(
    run_id: int,
    message_id: int,
    req: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify run ownership
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.user_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Agent run session not found.")

    # Get target message
    msg = db.query(Message).filter(Message.id == message_id, Message.run_id == run_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    if msg.role != "user":
        raise HTTPException(status_code=400, detail="Only user messages can be edited.")

    try:
        # Delete all subsequent messages (both user and assistant) to truncate history chronologically
        db.query(Message).filter(Message.run_id == run_id, Message.id > message_id).delete(synchronize_session=False)
        msg.content = req.content
        db.commit()
        db.refresh(msg)

        # Set run status to running
        run.status = "running"
        db.commit()

        # Load complete history for the run session
        messages = db.query(Message).filter(Message.run_id == run_id).order_by(Message.created_at.asc()).all()

        # Format history for LangGraph ReAct agent (only user and assistant messages)
        langchain_messages = []
        for m in messages:
            if m.role in ["user", "assistant"]:
                langchain_messages.append((m.role, m.content))

        async def event_generator():
            # Start a fresh thread state with history
            config = {
                "configurable": {"thread_id": f"run_{run_id}_edit_{message_id}_{int(time.time())}"},
                "recursion_limit": settings.AGENT_MAX_STEPS
            }

            try:
                # Send initial event with updated messages list
                serialized_msgs = []
                for m in messages:
                    serialized_msgs.append({
                        "id": m.id,
                        "run_id": m.run_id,
                        "role": m.role,
                        "content": m.content,
                        "tool_name": m.tool_name,
                        "tool_data": m.tool_data,
                        "created_at": m.created_at.isoformat()
                    })

                yield {"event": "status", "data": json.dumps({"status": "connected", "messages": serialized_msgs})}

                # Iterate over the events stream
                async for event in agent_executor.astream_events(
                    {"messages": langchain_messages},
                    version="v2",
                    config=config
                ):
                    evt_type, evt_data = _parse_stream_event(event)
                    if evt_type == "token":
                        yield {"event": "token", "data": evt_data}
                    elif evt_type in ("tool_start", "tool_end"):
                        yield {"event": evt_type, "data": json.dumps(evt_data)}

                # Stream completed — save to DB
                state = agent_executor.get_state(config)
                new_messages = state.values.get("messages", [])[len(langchain_messages):] if state.values else []
                final_assistant_msg = _process_and_save_messages(new_messages, run_id, db)

                run.status = "completed"
                db.commit()

                if not final_assistant_msg:
                    final_assistant_msg = db.query(Message).filter(Message.run_id == run_id).order_by(Message.id.desc()).first()

                yield {
                    "event": "done",
                    "data": json.dumps({
                        "status": "completed",
                        "assistant_message_id": final_assistant_msg.id if final_assistant_msg else None
                    })
                }

            except asyncio.CancelledError:
                print("Streaming request (edit) was cancelled by client connection drop.")
                try:
                    state = agent_executor.get_state(config)
                    new_messages = state.values.get("messages", [])[len(langchain_messages):] if state.values else []
                    _process_and_save_messages(new_messages, run_id, db)
                    run.status = "completed"
                    db.commit()
                except Exception as inner_e:
                    print(f"Failed to save state during cancellation (edit): {inner_e}")
                    db.rollback()

            except Exception as e:
                _handle_agent_error(db, run_id, e, "edit streaming")
                yield {
                    "event": "error",
                    "data": json.dumps({"detail": f"Streaming runtime error during edit: {str(e)}"})
                }

        return EventSourceResponse(event_generator())

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to edit and regenerate: {str(e)}")
