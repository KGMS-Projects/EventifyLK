"""Event Service — Event Creation & Management for EventSphere."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import uuid
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.config import BaseServiceSettings
from shared.database import create_db_engine, create_session_factory
from shared.auth import decode_access_token


class Settings(BaseServiceSettings):
    SERVICE_NAME: str = "event-service"

settings = Settings()
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
class EventCreate(BaseModel):
    name: str
    type: str
    date: str
    time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    location: str
    venue: Optional[str] = None
    description: Optional[str] = None
    expected_guests: int = 0
    budget: Optional[float] = None
    privacy: str = "private"
    cover_image: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    organizer_id: str
    name: str
    type: str
    date: str
    time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    location: str
    venue: Optional[str] = None
    description: Optional[str] = None
    expected_guests: int = 0
    budget: Optional[float] = None
    privacy: str = "private"
    cover_image: Optional[str] = None
    slug: Optional[str] = None
    status: str = "draft"
    created_at: Optional[str] = None

class EventUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    venue: Optional[str] = None
    description: Optional[str] = None
    expected_guests: Optional[int] = None
    budget: Optional[float] = None
    privacy: Optional[str] = None
    cover_image: Optional[str] = None
    status: Optional[str] = None

class ScheduleItemCreate(BaseModel):
    time: str
    title: str
    description: Optional[str] = None
    sort_order: int = 0

class ScheduleItemResponse(BaseModel):
    id: str
    event_id: str
    time: str
    title: str
    description: Optional[str] = None
    sort_order: int = 0

# ─── App ────────────────────────────────────────────────────
app = FastAPI(
    title="EventSphere Event Service",
    description="Event Creation & Management",
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

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials, settings.JWT_SECRET, settings.JWT_ALGORITHM)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload

def generate_slug(name: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return f"{slug}-{uuid.uuid4().hex[:6]}"

# ─── Routes ─────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "event"}

@app.post("/events", response_model=EventResponse, status_code=201)
async def create_event(
    data: EventCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event_id = str(uuid.uuid4())
    slug = generate_slug(data.name)

    await db.execute(
        text("""
            INSERT INTO events (id, organizer_id, name, type, date, time, end_date, end_time, location, venue,
                               description, expected_guests, budget, privacy, cover_image, slug)
            VALUES (:id, :organizer_id, :name, :type, :date, :time, :end_date, :end_time, :location, :venue,
                    :description, :expected_guests, :budget, :privacy, :cover_image, :slug)
        """),
        {
            "id": event_id,
            "organizer_id": user["sub"],
            "name": data.name,
            "type": data.type,
            "date": data.date,
            "time": data.time,
            "end_date": data.end_date,
            "end_time": data.end_time,
            "location": data.location,
            "venue": data.venue,
            "description": data.description,
            "expected_guests": data.expected_guests,
            "budget": data.budget,
            "privacy": data.privacy,
            "cover_image": data.cover_image,
            "slug": slug,
        }
    )

    return EventResponse(
        id=event_id, organizer_id=user["sub"],
        name=data.name, type=data.type,
        date=data.date, time=data.time,
        end_date=data.end_date, end_time=data.end_time,
        location=data.location, venue=data.venue,
        description=data.description,
        expected_guests=data.expected_guests,
        budget=data.budget, privacy=data.privacy,
        cover_image=data.cover_image, slug=slug,
    )

@app.get("/events", response_model=List[EventResponse])
async def list_events(
    type: Optional[str] = None,
    privacy: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    user: Optional[dict] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = "SELECT * FROM events WHERE 1=1"
    params = {}

    # If not admin, only show own events or public events
    if user.get("role") != "admin":
        query += " AND (organizer_id = :uid OR privacy = 'public')"
        params["uid"] = user["sub"]

    if type:
        query += " AND type = :type"
        params["type"] = type
    if privacy:
        query += " AND privacy = :privacy"
        params["privacy"] = privacy
    if status:
        query += " AND status = :status"
        params["status"] = status
    if search:
        query += " AND (name ILIKE :search OR description ILIKE :search)"
        params["search"] = f"%{search}%"

    query += " ORDER BY date DESC LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset

    result = await db.execute(text(query), params)
    events = result.fetchall()

    return [
        EventResponse(
            id=str(e.id), organizer_id=str(e.organizer_id),
            name=e.name, type=e.type,
            date=str(e.date), time=str(e.time) if e.time else None,
            end_date=str(e.end_date) if e.end_date else None,
            end_time=str(e.end_time) if e.end_time else None,
            location=e.location, venue=e.venue,
            description=e.description,
            expected_guests=e.expected_guests,
            budget=float(e.budget) if e.budget else None,
            privacy=e.privacy, cover_image=e.cover_image,
            slug=e.slug, status=e.status,
            created_at=str(e.created_at) if e.created_at else None,
        )
        for e in events
    ]

@app.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM events WHERE id = :id OR slug = :id"),
        {"id": event_id}
    )
    e = result.fetchone()
    if not e:
        raise HTTPException(status_code=404, detail="Event not found")

    return EventResponse(
        id=str(e.id), organizer_id=str(e.organizer_id),
        name=e.name, type=e.type,
        date=str(e.date), time=str(e.time) if e.time else None,
        end_date=str(e.end_date) if e.end_date else None,
        end_time=str(e.end_time) if e.end_time else None,
        location=e.location, venue=e.venue,
        description=e.description,
        expected_guests=e.expected_guests,
        budget=float(e.budget) if e.budget else None,
        privacy=e.privacy, cover_image=e.cover_image,
        slug=e.slug, status=e.status,
        created_at=str(e.created_at) if e.created_at else None,
    )

@app.put("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    data: EventUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = event_id
    updates["uid"] = user["sub"]

    await db.execute(
        text(f"UPDATE events SET {set_clause}, updated_at = NOW() WHERE id = :id AND organizer_id = :uid"),
        updates
    )

    return await get_event(event_id, db)

# ─── Dashboard ──────────────────────────────────────────────
@app.get("/events/{event_id}/dashboard")
async def event_dashboard(
    event_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get event
    event_result = await db.execute(
        text("SELECT * FROM events WHERE id = :id"),
        {"id": event_id}
    )
    event = event_result.fetchone()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get booking stats
    booking_result = await db.execute(
        text("SELECT COUNT(*) as total, COALESCE(SUM(total_price), 0) as total_spent FROM bookings WHERE event_id = :eid"),
        {"eid": event_id}
    )
    booking_stats = booking_result.fetchone()

    # Get booking statuses
    status_result = await db.execute(
        text("SELECT status, COUNT(*) as count FROM bookings WHERE event_id = :eid GROUP BY status"),
        {"eid": event_id}
    )
    statuses = {r.status: r.count for r in status_result.fetchall()}

    return {
        "event": {
            "id": str(event.id),
            "name": event.name,
            "date": str(event.date),
            "expected_guests": event.expected_guests,
            "budget": float(event.budget) if event.budget else 0,
            "status": event.status,
        },
        "bookings": {
            "total": booking_stats.total if booking_stats else 0,
            "total_spent": float(booking_stats.total_spent) if booking_stats else 0,
            "statuses": statuses,
        },
        "budget_remaining": (float(event.budget) if event.budget else 0) - (float(booking_stats.total_spent) if booking_stats else 0),
    }

# ─── Schedule ───────────────────────────────────────────────
@app.post("/events/{event_id}/schedule", response_model=ScheduleItemResponse, status_code=201)
async def add_schedule_item(
    event_id: str,
    data: ScheduleItemCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO event_schedule (id, event_id, time, title, description, sort_order)
            VALUES (:id, :event_id, :time, :title, :description, :sort_order)
        """),
        {
            "id": item_id,
            "event_id": event_id,
            "time": data.time,
            "title": data.title,
            "description": data.description,
            "sort_order": data.sort_order,
        }
    )
    return ScheduleItemResponse(
        id=item_id, event_id=event_id,
        time=data.time, title=data.title,
        description=data.description, sort_order=data.sort_order,
    )

@app.get("/events/{event_id}/schedule", response_model=List[ScheduleItemResponse])
async def get_schedule(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM event_schedule WHERE event_id = :eid ORDER BY sort_order, time"),
        {"eid": event_id}
    )
    items = result.fetchall()
    return [
        ScheduleItemResponse(
            id=str(i.id), event_id=str(i.event_id),
            time=str(i.time), title=i.title,
            description=i.description, sort_order=i.sort_order,
        )
        for i in items
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
