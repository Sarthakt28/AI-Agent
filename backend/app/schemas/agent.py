from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AgentRunRequest(BaseModel):
    goal: str

class AgentRunResponse(BaseModel):
    id: int
    goal: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    id: int
    run_id: int
    role: str
    content: str
    tool_name: Optional[str] = None
    tool_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MessageCreateRequest(BaseModel):
    content: str