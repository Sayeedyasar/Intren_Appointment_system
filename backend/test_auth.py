import uuid

from fastapi.testclient import TestClient

from main import app


def unique_email(prefix: str) -> str:
    return f"{prefix}+{uuid.uuid4().hex[:8]}@example.com"


def test_user_signup_and_login():
    client = TestClient(app)
    email = unique_email("alice")
    signup_payload = {
        "name": "Alice Johnson",
        "email": email,
        "password": "secret123",
    }

    signup_response = client.post("/auth/signup", json=signup_payload)
    assert signup_response.status_code == 201, signup_response.text

    login_response = client.post(
        "/auth/login",
        json={"email": email, "password": "secret123"},
    )
    assert login_response.status_code == 200, login_response.text
    data = login_response.json()
    assert data["email"] == email
    assert data["name"] == "Alice Johnson"
    assert data["role"] == "user"
    assert "token" in data
    assert data["token"]


def test_protected_appointments_require_token():
    client = TestClient(app)
    response = client.get("/appointments")
    assert response.status_code == 401

    response = client.get("/appointments", headers={"Authorization": "Bearer invalid-token"})
    assert response.status_code == 401


def test_appointments_are_accessible_with_valid_token():
    client = TestClient(app)
    email = unique_email("bob")
    signup_payload = {
        "name": "Bob Test",
        "email": email,
        "password": "securepass123",
    }

    signup_response = client.post("/auth/signup", json=signup_payload)
    assert signup_response.status_code == 201, signup_response.text

    login_response = client.post(
        "/auth/login",
        json={"email": email, "password": "securepass123"},
    )
    token = login_response.json()["token"]

    auth_response = client.get(
        "/appointments",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert auth_response.status_code == 200
