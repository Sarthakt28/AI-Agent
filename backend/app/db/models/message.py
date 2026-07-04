from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from app.db.base import Base

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=False)
    role = Column(String, nullable=False)           # user | assistant | thinking | tool_call | tool_result
    content = Column(Text, nullable=False)          # Message text content
    tool_name = Column(String, nullable=True)       # which tool is used (only in tool_call/tool_result)
    tool_data = Column(JSON, nullable=True)         # Tool extra data (JSON format mein)
    created_at = Column(DateTime(timezone=True), server_default=func.now())