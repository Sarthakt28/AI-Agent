from pydantic import BaseModel, EmailStr, Field

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True # SQLAlchemy model -> Pydantic model auto convert 
    