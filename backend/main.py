import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
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

JWT_SECRET = os.getenv("JWT_SECRET") or secrets.token_urlsafe(32)
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "15"))
SESSION_SECURE = os.getenv("SESSION_SECURE", "false").lower() == "true"
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.strip().encode("utf-8"), bytes.fromhex(salt), 200_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored_value: str) -> bool:
    if not stored_value or "$" not in stored_value:
        return False
    salt, expected_hash = stored_value.split("$", 1)
    digest = hashlib.pbkdf2_hmac("sha256", password.strip().encode("utf-8"), bytes.fromhex(salt), 200_000)
    return digest.hex() == expected_hash


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": subject,
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


Base.metadata.create_all(bind=engine)


def seed_default_admin():
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        return

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == admin_email.lower().strip()).first()
        if not admin:
            db.add(
                User(
                    name="Admin User",
                    email=admin_email.lower().strip(),
                    password_hash=hash_password(admin_password),
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


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
):
    token = None
    if credentials:
        token = credentials.credentials
    else:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload.",
            )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from exc

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    return user


@app.post("/auth/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup_user(
    user_data: UserCreate,
    response: Response,
    db: Session = Depends(get_db),
):
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

    token = create_access_token(str(new_user.id))
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=JWT_EXPIRE_MINUTES * 60,
    )
    new_user.token = token
    return new_user


@app.post("/auth/login", response_model=UserResponse)
def login_user(
    user_data: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    normalized_email = user_data.email.lower().strip()
    stored_user = db.query(User).filter(User.email == normalized_email).first()

    if not stored_user or not verify_password(user_data.password, stored_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(str(stored_user.id))
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=JWT_EXPIRE_MINUTES * 60,
    )
    stored_user.token = token
    return stored_user


@app.post("/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    del current_user
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
def get_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    del current_user
    return db.query(Appointment).order_by(Appointment.created_at.desc()).all()


@app.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    del current_user
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
    current_user: User = Depends(get_current_user),
):
    del current_user
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
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    del current_user
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
    current_user: User = Depends(get_current_user),
):
    del current_user
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
