"""Identity Service — Authentication & User Management for EventSphere."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from shared.config import BaseServiceSettings
from shared.database import create_db_engine, create_session_factory, Base
from shared.auth import hash_password, verify_password, create_access_token, decode_access_token


# ─── Settings ───────────────────────────────────────────────
class Settings(BaseServiceSettings):
    SERVICE_NAME: str = "identity-service"

settings = Settings()

# ─── Database ───────────────────────────────────────────────
engine = create_db_engine(settings.DATABASE_URL)
session_factory = create_session_factory(engine)

async def get_db():
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# ─── Schemas ────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "customer"
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    avatar: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None

# ─── App ────────────────────────────────────────────────────
app = FastAPI(
    title="EventSphere Identity Service",
    description="Authentication & User Management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

# ─── Auth Dependency ────────────────────────────────────────
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(credentials.credentials, settings.JWT_SECRET, settings.JWT_ALGORITHM)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    result = await db.execute(
        text("SELECT id, email, full_name, role, avatar, phone, is_active, created_at FROM users WHERE id = :id"),
        {"id": user_id}
    )
    user = result.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "avatar": user.avatar,
        "phone": user.phone,
        "is_active": user.is_active,
        "created_at": str(user.created_at) if user.created_at else None,
    }

# ─── Routes ─────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "identity"}

@app.post("/auth/register", response_model=TokenResponse, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": data.email}
    )
    if result.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user_id = str(uuid.uuid4())
    hashed = hash_password(data.password)

    await db.execute(
        text("""
            INSERT INTO users (id, email, password_hash, full_name, role, phone)
            VALUES (:id, :email, :password_hash, :full_name, :role, :phone)
        """),
        {
            "id": user_id,
            "email": data.email,
            "password_hash": hashed,
            "full_name": data.full_name,
            "role": data.role,
            "phone": data.phone,
        }
    )

    token = create_access_token(
        {"sub": user_id, "role": data.role},
        settings.JWT_SECRET,
        settings.JWT_ALGORITHM,
        settings.JWT_EXPIRATION_MINUTES,
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=data.email,
            full_name=data.full_name,
            role=data.role,
            phone=data.phone,
        ),
    )

@app.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT id, email, password_hash, full_name, role, avatar, phone, is_active, created_at FROM users WHERE email = :email"),
        {"email": data.email}
    )
    user = result.fetchone()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token(
        {"sub": str(user.id), "role": user.role},
        settings.JWT_SECRET,
        settings.JWT_ALGORITHM,
        settings.JWT_EXPIRATION_MINUTES,
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            avatar=user.avatar,
            phone=user.phone,
            is_active=user.is_active,
            created_at=str(user.created_at) if user.created_at else None,
        ),
    )

@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

@app.put("/auth/profile", response_model=UserResponse)
async def update_profile(
    data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = current_user["id"]

    await db.execute(
        text(f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = :id"),
        updates
    )

    # Fetch updated user
    result = await db.execute(
        text("SELECT id, email, full_name, role, avatar, phone, is_active, created_at FROM users WHERE id = :id"),
        {"id": current_user["id"]}
    )
    user = result.fetchone()
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        avatar=user.avatar,
        phone=user.phone,
        is_active=user.is_active,
        created_at=str(user.created_at) if user.created_at else None,
    )

@app.get("/auth/users", response_model=list[UserResponse])
async def list_users(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(
        text("SELECT id, email, full_name, role, avatar, phone, is_active, created_at FROM users ORDER BY created_at DESC")
    )
    users = result.fetchall()
    return [
        UserResponse(
            id=str(u.id),
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            avatar=u.avatar,
            phone=u.phone,
            is_active=u.is_active,
            created_at=str(u.created_at) if u.created_at else None,
        )
        for u in users
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
