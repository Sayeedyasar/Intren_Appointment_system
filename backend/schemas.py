from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class AppointmentBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str = Field(..., min_length=1)
    appointment_date: date
    reason: str = Field(..., min_length=1)


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(AppointmentBase):
    pass


class AppointmentStatusUpdate(BaseModel):
    status: Literal["PENDING", "CONFIRMED"]


class AppointmentResponse(AppointmentBase):
    id: int
    status: Literal["PENDING", "CONFIRMED"]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
