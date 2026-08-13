"""Booking Service — Reservation Engine with Inventory Locking for EventSphere."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.config import BaseServiceSettings
from shared.database import create_db_engine, create_session_factory
from shared.auth import decode_access_token


class Settings(BaseServiceSettings):
    SERVICE_NAME: str = "booking-service"
    PLATFORM_COMMISSION_RATE: float = 0.10  # 10%

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
class BookingItemInput(BaseModel):
    rental_item_id: Optional[str] = None
    service_id: Optional[str] = None
    item_name: str
    quantity: int = 1
    unit_price: float

class BookingCreate(BaseModel):
    event_id: Optional[str] = None
    vendor_id: str
    service_id: Optional[str] = None
    booking_date: str
    items: Optional[List[BookingItemInput]] = []
    notes: Optional[str] = None

class BookingResponse(BaseModel):
    id: str
    event_id: Optional[str] = None
    customer_id: str
    vendor_id: str
    service_id: Optional[str] = None
    booking_date: str
    status: str = "pending"
    total_price: float = 0
    deposit_amount: float = 0
    remaining_amount: float = 0
    platform_fee: float = 0
    vendor_amount: float = 0
    notes: Optional[str] = None
    items: List[dict] = []
    created_at: Optional[str] = None

class PaymentCreate(BaseModel):
    amount: float
    payment_type: str = "full"
    method: str = "mock_card"

class PaymentResponse(BaseModel):
    id: str
    booking_id: str
    amount: float
    payment_type: str
    status: str
    method: str
    transaction_ref: Optional[str] = None
    created_at: Optional[str] = None

# ─── App ────────────────────────────────────────────────────
app = FastAPI(
    title="EventSphere Booking Service",
    description="Reservation Engine with Inventory Locking",
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

# ─── Routes ─────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "booking"}

@app.post("/bookings", response_model=BookingResponse, status_code=201)
async def create_booking(
    data: BookingCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking_id = str(uuid.uuid4())
    customer_id = user["sub"]
    total_price = 0.0
    booking_items = []

    # If booking a specific service, get its price
    if data.service_id:
        svc_result = await db.execute(
            text("SELECT * FROM vendor_services WHERE id = :id"),
            {"id": data.service_id}
        )
        service = svc_result.fetchone()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        total_price = float(service.price)

    # Process rental items with pessimistic locking
    for item in (data.items or []):
        if item.rental_item_id:
            # Lock the inventory row to prevent concurrent overbooking
            inv_result = await db.execute(
                text("SELECT * FROM rental_inventory WHERE id = :id FOR UPDATE"),
                {"id": item.rental_item_id}
            )
            inventory = inv_result.fetchone()
            if not inventory:
                raise HTTPException(status_code=404, detail=f"Rental item {item.rental_item_id} not found")
            if inventory.available_quantity < item.quantity:
                raise HTTPException(
                    status_code=409,
                    detail=f"Insufficient inventory for {inventory.item_name}. "
                           f"Available: {inventory.available_quantity}, Requested: {item.quantity}"
                )

            # Reserve inventory
            await db.execute(
                text("UPDATE rental_inventory SET available_quantity = available_quantity - :qty WHERE id = :id"),
                {"qty": item.quantity, "id": item.rental_item_id}
            )

        item_total = item.unit_price * item.quantity
        total_price += item_total

        item_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT INTO booking_items (id, booking_id, rental_item_id, service_id, item_name, quantity, unit_price, total_price)
                VALUES (:id, :booking_id, :rental_item_id, :service_id, :item_name, :quantity, :unit_price, :total_price)
            """),
            {
                "id": item_id,
                "booking_id": booking_id,
                "rental_item_id": item.rental_item_id,
                "service_id": item.service_id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total_price": item_total,
            }
        )
        booking_items.append({
            "id": item_id,
            "item_name": item.item_name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item_total,
        })

    # Calculate financials
    platform_fee = total_price * settings.PLATFORM_COMMISSION_RATE
    vendor_amount = total_price - platform_fee
    deposit_amount = total_price * 0.3  # 30% deposit
    remaining_amount = total_price - deposit_amount

    # Check vendor availability for the date
    avail_result = await db.execute(
        text("SELECT status FROM vendor_availability WHERE vendor_id = :vid AND date = :date"),
        {"vid": data.vendor_id, "date": data.booking_date}
    )
    avail = avail_result.fetchone()
    if avail and avail.status == "booked":
        raise HTTPException(status_code=409, detail="Vendor is not available on this date")

    # Create booking
    await db.execute(
        text("""
            INSERT INTO bookings (id, event_id, customer_id, vendor_id, service_id, booking_date,
                                 total_price, deposit_amount, remaining_amount, platform_fee, vendor_amount, notes)
            VALUES (:id, :event_id, :customer_id, :vendor_id, :service_id, :booking_date,
                    :total_price, :deposit_amount, :remaining_amount, :platform_fee, :vendor_amount, :notes)
        """),
        {
            "id": booking_id,
            "event_id": data.event_id,
            "customer_id": customer_id,
            "vendor_id": data.vendor_id,
            "service_id": data.service_id,
            "booking_date": data.booking_date,
            "total_price": total_price,
            "deposit_amount": deposit_amount,
            "remaining_amount": remaining_amount,
            "platform_fee": platform_fee,
            "vendor_amount": vendor_amount,
            "notes": data.notes,
        }
    )

    # Mark vendor as booked for the date
    await db.execute(
        text("""
            INSERT INTO vendor_availability (id, vendor_id, date, status)
            VALUES (:id, :vendor_id, :date, 'booked')
            ON CONFLICT (vendor_id, date) DO UPDATE SET status = 'booked'
        """),
        {"id": str(uuid.uuid4()), "vendor_id": data.vendor_id, "date": data.booking_date}
    )

    return BookingResponse(
        id=booking_id, event_id=data.event_id,
        customer_id=customer_id, vendor_id=data.vendor_id,
        service_id=data.service_id, booking_date=data.booking_date,
        total_price=total_price, deposit_amount=deposit_amount,
        remaining_amount=remaining_amount, platform_fee=platform_fee,
        vendor_amount=vendor_amount, notes=data.notes,
        items=booking_items,
    )

@app.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM bookings WHERE id = :id"),
        {"id": booking_id}
    )
    b = result.fetchone()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")

    items_result = await db.execute(
        text("SELECT * FROM booking_items WHERE booking_id = :bid"),
        {"bid": booking_id}
    )
    items = [
        {
            "id": str(i.id),
            "item_name": i.item_name,
            "quantity": i.quantity,
            "unit_price": float(i.unit_price),
            "total_price": float(i.total_price),
        }
        for i in items_result.fetchall()
    ]

    return BookingResponse(
        id=str(b.id), event_id=str(b.event_id) if b.event_id else None,
        customer_id=str(b.customer_id), vendor_id=str(b.vendor_id),
        service_id=str(b.service_id) if b.service_id else None,
        booking_date=str(b.booking_date), status=b.status,
        total_price=float(b.total_price), deposit_amount=float(b.deposit_amount),
        remaining_amount=float(b.remaining_amount), platform_fee=float(b.platform_fee),
        vendor_amount=float(b.vendor_amount), notes=b.notes,
        items=items,
        created_at=str(b.created_at) if b.created_at else None,
    )

@app.get("/bookings/customer/{customer_id}", response_model=List[BookingResponse])
async def customer_bookings(customer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM bookings WHERE customer_id = :cid ORDER BY created_at DESC"),
        {"cid": customer_id}
    )
    bookings = result.fetchall()
    return [
        BookingResponse(
            id=str(b.id), event_id=str(b.event_id) if b.event_id else None,
            customer_id=str(b.customer_id), vendor_id=str(b.vendor_id),
            service_id=str(b.service_id) if b.service_id else None,
            booking_date=str(b.booking_date), status=b.status,
            total_price=float(b.total_price), deposit_amount=float(b.deposit_amount),
            remaining_amount=float(b.remaining_amount), platform_fee=float(b.platform_fee),
            vendor_amount=float(b.vendor_amount), notes=b.notes,
            created_at=str(b.created_at) if b.created_at else None,
        )
        for b in bookings
    ]

@app.get("/bookings/vendor/{vendor_id}", response_model=List[BookingResponse])
async def vendor_bookings(vendor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM bookings WHERE vendor_id = :vid ORDER BY created_at DESC"),
        {"vid": vendor_id}
    )
    bookings = result.fetchall()
    return [
        BookingResponse(
            id=str(b.id), event_id=str(b.event_id) if b.event_id else None,
            customer_id=str(b.customer_id), vendor_id=str(b.vendor_id),
            service_id=str(b.service_id) if b.service_id else None,
            booking_date=str(b.booking_date), status=b.status,
            total_price=float(b.total_price), deposit_amount=float(b.deposit_amount),
            remaining_amount=float(b.remaining_amount), platform_fee=float(b.platform_fee),
            vendor_amount=float(b.vendor_amount), notes=b.notes,
            created_at=str(b.created_at) if b.created_at else None,
        )
        for b in bookings
    ]

@app.put("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status: str = Query(..., regex="^(confirmed|cancelled|completed|refunded)$"),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # If cancelling, release inventory
    if status == "cancelled":
        items_result = await db.execute(
            text("SELECT * FROM booking_items WHERE booking_id = :bid AND rental_item_id IS NOT NULL"),
            {"bid": booking_id}
        )
        for item in items_result.fetchall():
            await db.execute(
                text("UPDATE rental_inventory SET available_quantity = available_quantity + :qty WHERE id = :id"),
                {"qty": item.quantity, "id": str(item.rental_item_id)}
            )

        # Release vendor date
        booking_result = await db.execute(
            text("SELECT vendor_id, booking_date FROM bookings WHERE id = :id"),
            {"id": booking_id}
        )
        booking = booking_result.fetchone()
        if booking:
            await db.execute(
                text("DELETE FROM vendor_availability WHERE vendor_id = :vid AND date = :date AND status = 'booked'"),
                {"vid": str(booking.vendor_id), "date": str(booking.booking_date)}
            )

    await db.execute(
        text("UPDATE bookings SET status = :status, updated_at = NOW() WHERE id = :id"),
        {"status": status, "id": booking_id}
    )
    return {"message": f"Booking status updated to {status}"}

# ─── Payment ────────────────────────────────────────────────
@app.post("/bookings/{booking_id}/pay", response_model=PaymentResponse, status_code=201)
async def process_payment(
    booking_id: str,
    data: PaymentCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Mock payment processing
    payment_id = str(uuid.uuid4())
    transaction_ref = f"TXN-{uuid.uuid4().hex[:12].upper()}"

    await db.execute(
        text("""
            INSERT INTO payments (id, booking_id, amount, payment_type, status, method, transaction_ref)
            VALUES (:id, :booking_id, :amount, :payment_type, 'completed', :method, :transaction_ref)
        """),
        {
            "id": payment_id,
            "booking_id": booking_id,
            "amount": data.amount,
            "payment_type": data.payment_type,
            "method": data.method,
            "transaction_ref": transaction_ref,
        }
    )

    # Update booking: reduce remaining, maybe confirm
    if data.payment_type == "deposit":
        await db.execute(
            text("UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = :id"),
            {"id": booking_id}
        )
    elif data.payment_type == "full":
        await db.execute(
            text("UPDATE bookings SET status = 'confirmed', remaining_amount = 0, updated_at = NOW() WHERE id = :id"),
            {"id": booking_id}
        )

    return PaymentResponse(
        id=payment_id, booking_id=booking_id,
        amount=data.amount, payment_type=data.payment_type,
        status="completed", method=data.method,
        transaction_ref=transaction_ref,
    )

@app.get("/bookings/{booking_id}/payments", response_model=List[PaymentResponse])
async def booking_payments(booking_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM payments WHERE booking_id = :bid ORDER BY created_at DESC"),
        {"bid": booking_id}
    )
    payments = result.fetchall()
    return [
        PaymentResponse(
            id=str(p.id), booking_id=str(p.booking_id),
            amount=float(p.amount), payment_type=p.payment_type,
            status=p.status, method=p.method,
            transaction_ref=p.transaction_ref,
            created_at=str(p.created_at) if p.created_at else None,
        )
        for p in payments
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
