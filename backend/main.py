import hashlib
import os

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine
from model import Appointment, User
from schemas import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentStatusUpdate,
    AppointmentUpdate,
    UserCreate,
    UserLogin,
    UserResponse,
)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.strip().encode("utf-8")).hexdigest()


Base.metadata.create_all(bind=engine)


def seed_default_admin():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@clinic.com").first()
        if not admin:
            db.add(
                User(
                    name="Admin User",
                    email="admin@clinic.com",
                    password_hash=hash_password("admin123"),
                    role="admin",
                )
            )
            db.commit()
    finally:
        db.close()


seed_default_admin()

app = FastAPI(title="Appointment API")

allowed_origins = os.getenv(
    'ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:80,http://127.0.0.1:80',
).split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/auth/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup_user(user_data: UserCreate, db: Session = Depends(get_db)):
    normalized_email = user_data.email.lower().strip()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    new_user = User(
        name=user_data.name.strip(),
        email=normalized_email,
        password_hash=hash_password(user_data.password),
        role="user",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/auth/login", response_model=UserResponse)
def login_user(user_data: UserLogin, db: Session = Depends(get_db)):
    normalized_email = user_data.email.lower().strip()
    stored_user = db.query(User).filter(User.email == normalized_email).first()

    if not stored_user or stored_user.password_hash != hash_password(user_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return stored_user


@app.post("/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(appointment: AppointmentCreate, db: Session = Depends(get_db)):
    db_appointment = Appointment(
        name=appointment.name,
        email=appointment.email,
        phone=appointment.phone,
        appointment_date=appointment.appointment_date,
        reason=appointment.reason,
        status="PENDING",
    )

    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment


@app.get("/appointments", response_model=list[AppointmentResponse])
def get_appointments(db: Session = Depends(get_db)):
    return db.query(Appointment).order_by(Appointment.created_at.desc()).all()


@app.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )
    return appointment


@app.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    db: Session = Depends(get_db),
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    appointment.name = appointment_data.name
    appointment.email = appointment_data.email
    appointment.phone = appointment_data.phone
    appointment.appointment_date = appointment_data.appointment_date
    appointment.reason = appointment_data.reason

    db.commit()
    db.refresh(appointment)
    return appointment


@app.delete("/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    db.delete(appointment)
    db.commit()
    return None


@app.patch("/appointments/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status(
    appointment_id: int,
    status_data: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    appointment.status = status_data.status
    db.commit()
    db.refresh(appointment)
    return appointment


@app.get("/")
def read_root():
    return {"message": "Appointment API is running"}
