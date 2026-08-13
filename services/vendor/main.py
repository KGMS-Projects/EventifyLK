"""Vendor Service — Vendor Registration, Catalog, Services & Availability for EventSphere."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
import uuid
import httpx

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.config import BaseServiceSettings
from shared.database import create_db_engine, create_session_factory
from shared.auth import decode_access_token


# ─── Settings ───────────────────────────────────────────────
class Settings(BaseServiceSettings):
    SERVICE_NAME: str = "vendor-service"
    IDENTITY_SERVICE_URL: str = "http://localhost:8001"

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
class VendorRegister(BaseModel):
    business_name: str
    category: str
    location: str
    description: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None

class VendorResponse(BaseModel):
    id: str
    user_id: str
    business_name: str
    category: str
    location: str
    description: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    is_verified: bool = False
    verification_status: str = "pending"
    rating: float = 0.0
    total_reviews: int = 0
    created_at: Optional[str] = None

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    duration: Optional[str] = None
    price: float
    includes: Optional[List[str]] = []
    images: Optional[List[str]] = []

class ServiceResponse(BaseModel):
    id: str
    vendor_id: str
    name: str
    description: Optional[str] = None
    category: str
    duration: Optional[str] = None
    price: float
    includes: List[str] = []
    images: List[str] = []
    is_active: bool = True

class PortfolioCreate(BaseModel):
    title: str
    description: Optional[str] = None
    images: List[str]
    event_type: Optional[str] = None

class PortfolioResponse(BaseModel):
    id: str
    vendor_id: str
    title: str
    description: Optional[str] = None
    images: List[str]
    event_type: Optional[str] = None

class RentalItemCreate(BaseModel):
    item_name: str
    description: Optional[str] = None
    total_quantity: int
    price_per_unit: float
    price_per_day: Optional[float] = None
    image: Optional[str] = None
    category: Optional[str] = None

class RentalItemResponse(BaseModel):
    id: str
    vendor_id: str
    item_name: str
    description: Optional[str] = None
    total_quantity: int
    available_quantity: int
    price_per_unit: float
    price_per_day: Optional[float] = None
    image: Optional[str] = None
    category: Optional[str] = None
    is_active: bool = True

class AvailabilitySet(BaseModel):
    date: str
    status: str = "available"

# ─── App ────────────────────────────────────────────────────
app = FastAPI(
    title="EventSphere Vendor Service",
    description="Vendor Registration, Service Catalog & Management",
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

# ─── Vendor Routes ──────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "vendor"}

@app.post("/vendors/register", response_model=VendorResponse, status_code=201)
async def register_vendor(
    data: VendorRegister,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["sub"]

    # Check if vendor profile already exists
    result = await db.execute(
        text("SELECT id FROM vendor_profiles WHERE user_id = :uid"),
        {"uid": user_id}
    )
    if result.fetchone():
        raise HTTPException(status_code=400, detail="Vendor profile already exists")

    vendor_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO vendor_profiles (id, user_id, business_name, category, location, description, logo, cover_image)
            VALUES (:id, :user_id, :business_name, :category, :location, :description, :logo, :cover_image)
        """),
        {
            "id": vendor_id,
            "user_id": user_id,
            "business_name": data.business_name,
            "category": data.category,
            "location": data.location,
            "description": data.description,
            "logo": data.logo,
            "cover_image": data.cover_image,
        }
    )

    # Update user role to vendor
    await db.execute(
        text("UPDATE users SET role = 'vendor' WHERE id = :id"),
        {"id": user_id}
    )

    return VendorResponse(
        id=vendor_id,
        user_id=user_id,
        business_name=data.business_name,
        category=data.category,
        location=data.location,
        description=data.description,
        logo=data.logo,
        cover_image=data.cover_image,
    )

@app.get("/vendors", response_model=List[VendorResponse])
async def list_vendors(
    category: Optional[str] = None,
    location: Optional[str] = None,
    min_rating: Optional[float] = None,
    verified_only: bool = False,
    search: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = "SELECT * FROM vendor_profiles WHERE 1=1"
    params = {}

    if category:
        query += " AND category = :category"
        params["category"] = category
    if location:
        query += " AND location ILIKE :location"
        params["location"] = f"%{location}%"
    if min_rating:
        query += " AND rating >= :min_rating"
        params["min_rating"] = min_rating
    if verified_only:
        query += " AND is_verified = TRUE"
    if search:
        query += " AND (business_name ILIKE :search OR description ILIKE :search)"
        params["search"] = f"%{search}%"

    query += " ORDER BY rating DESC, created_at DESC LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset

    result = await db.execute(text(query), params)
    vendors = result.fetchall()

    return [
        VendorResponse(
            id=str(v.id), user_id=str(v.user_id),
            business_name=v.business_name, category=v.category,
            location=v.location, description=v.description,
            logo=v.logo, cover_image=v.cover_image,
            is_verified=v.is_verified, verification_status=v.verification_status,
            rating=float(v.rating), total_reviews=v.total_reviews,
            created_at=str(v.created_at) if v.created_at else None,
        )
        for v in vendors
    ]

@app.get("/vendors/{vendor_id}", response_model=VendorResponse)
async def get_vendor(vendor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM vendor_profiles WHERE id = :id"),
        {"id": vendor_id}
    )
    v = result.fetchone()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return VendorResponse(
        id=str(v.id), user_id=str(v.user_id),
        business_name=v.business_name, category=v.category,
        location=v.location, description=v.description,
        logo=v.logo, cover_image=v.cover_image,
        is_verified=v.is_verified, verification_status=v.verification_status,
        rating=float(v.rating), total_reviews=v.total_reviews,
        created_at=str(v.created_at) if v.created_at else None,
    )

# ─── Admin: Approve/Reject Vendor ───────────────────────────
@app.put("/vendors/{vendor_id}/verify")
async def verify_vendor(
    vendor_id: str,
    action: str = Query(..., regex="^(approved|rejected)$"),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    is_verified = action == "approved"
    await db.execute(
        text("UPDATE vendor_profiles SET verification_status = :status, is_verified = :verified, updated_at = NOW() WHERE id = :id"),
        {"status": action, "verified": is_verified, "id": vendor_id}
    )
    return {"message": f"Vendor {action}"}

# ─── Service Routes ─────────────────────────────────────────
@app.post("/vendors/{vendor_id}/services", response_model=ServiceResponse, status_code=201)
async def add_service(
    vendor_id: str,
    data: ServiceCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO vendor_services (id, vendor_id, name, description, category, duration, price, includes, images)
            VALUES (:id, :vendor_id, :name, :description, :category, :duration, :price, :includes, :images)
        """),
        {
            "id": service_id,
            "vendor_id": vendor_id,
            "name": data.name,
            "description": data.description,
            "category": data.category,
            "duration": data.duration,
            "price": data.price,
            "includes": data.includes or [],
            "images": data.images or [],
        }
    )

    return ServiceResponse(
        id=service_id, vendor_id=vendor_id,
        name=data.name, description=data.description,
        category=data.category, duration=data.duration,
        price=data.price, includes=data.includes or [],
        images=data.images or [],
    )

@app.get("/vendors/{vendor_id}/services", response_model=List[ServiceResponse])
async def list_services(vendor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM vendor_services WHERE vendor_id = :vid AND is_active = TRUE ORDER BY created_at DESC"),
        {"vid": vendor_id}
    )
    services = result.fetchall()
    return [
        ServiceResponse(
            id=str(s.id), vendor_id=str(s.vendor_id),
            name=s.name, description=s.description,
            category=s.category, duration=s.duration,
            price=float(s.price), includes=s.includes or [],
            images=s.images or [], is_active=s.is_active,
        )
        for s in services
    ]

# ─── Portfolio Routes ───────────────────────────────────────
@app.post("/vendors/{vendor_id}/portfolio", response_model=PortfolioResponse, status_code=201)
async def add_portfolio(
    vendor_id: str,
    data: PortfolioCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    portfolio_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO vendor_portfolio (id, vendor_id, title, description, images, event_type)
            VALUES (:id, :vendor_id, :title, :description, :images, :event_type)
        """),
        {
            "id": portfolio_id,
            "vendor_id": vendor_id,
            "title": data.title,
            "description": data.description,
            "images": data.images,
            "event_type": data.event_type,
        }
    )
    return PortfolioResponse(
        id=portfolio_id, vendor_id=vendor_id,
        title=data.title, description=data.description,
        images=data.images, event_type=data.event_type,
    )

@app.get("/vendors/{vendor_id}/portfolio", response_model=List[PortfolioResponse])
async def list_portfolio(vendor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM vendor_portfolio WHERE vendor_id = :vid ORDER BY created_at DESC"),
        {"vid": vendor_id}
    )
    items = result.fetchall()
    return [
        PortfolioResponse(
            id=str(p.id), vendor_id=str(p.vendor_id),
            title=p.title, description=p.description,
            images=p.images or [], event_type=p.event_type,
        )
        for p in items
    ]

# ─── Rental Inventory Routes ───────────────────────────────
@app.post("/vendors/{vendor_id}/inventory", response_model=RentalItemResponse, status_code=201)
async def add_rental_item(
    vendor_id: str,
    data: RentalItemCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO rental_inventory (id, vendor_id, item_name, description, total_quantity, available_quantity, price_per_unit, price_per_day, image, category)
            VALUES (:id, :vendor_id, :item_name, :description, :total_quantity, :available_quantity, :price_per_unit, :price_per_day, :image, :category)
        """),
        {
            "id": item_id,
            "vendor_id": vendor_id,
            "item_name": data.item_name,
            "description": data.description,
            "total_quantity": data.total_quantity,
            "available_quantity": data.total_quantity,
            "price_per_unit": data.price_per_unit,
            "price_per_day": data.price_per_day,
            "image": data.image,
            "category": data.category,
        }
    )
    return RentalItemResponse(
        id=item_id, vendor_id=vendor_id,
        item_name=data.item_name, description=data.description,
        total_quantity=data.total_quantity, available_quantity=data.total_quantity,
        price_per_unit=data.price_per_unit, price_per_day=data.price_per_day,
        image=data.image, category=data.category,
    )

@app.get("/vendors/{vendor_id}/inventory", response_model=List[RentalItemResponse])
async def list_inventory(vendor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM rental_inventory WHERE vendor_id = :vid AND is_active = TRUE"),
        {"vid": vendor_id}
    )
    items = result.fetchall()
    return [
        RentalItemResponse(
            id=str(i.id), vendor_id=str(i.vendor_id),
            item_name=i.item_name, description=i.description,
            total_quantity=i.total_quantity, available_quantity=i.available_quantity,
            price_per_unit=float(i.price_per_unit),
            price_per_day=float(i.price_per_day) if i.price_per_day else None,
            image=i.image, category=i.category, is_active=i.is_active,
        )
        for i in items
    ]

# ─── Availability Routes ───────────────────────────────────
@app.get("/vendors/{vendor_id}/availability")
async def get_availability(
    vendor_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    query = "SELECT * FROM vendor_availability WHERE vendor_id = :vid"
    params = {"vid": vendor_id}

    if month and year:
        query += " AND EXTRACT(MONTH FROM date) = :month AND EXTRACT(YEAR FROM date) = :year"
        params["month"] = month
        params["year"] = year

    query += " ORDER BY date"
    result = await db.execute(text(query), params)
    dates = result.fetchall()

    return [
        {"date": str(d.date), "status": d.status}
        for d in dates
    ]

@app.post("/vendors/{vendor_id}/availability")
async def set_availability(
    vendor_id: str,
    data: AvailabilitySet,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("""
            INSERT INTO vendor_availability (id, vendor_id, date, status)
            VALUES (:id, :vendor_id, :date, :status)
            ON CONFLICT (vendor_id, date) DO UPDATE SET status = :status
        """),
        {
            "id": str(uuid.uuid4()),
            "vendor_id": vendor_id,
            "date": data.date,
            "status": data.status,
        }
    )
    return {"message": "Availability updated"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
