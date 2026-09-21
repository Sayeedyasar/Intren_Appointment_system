from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_user_signup_and_login():
    signup_payload = {
        "name": "Alice Johnson",
        "email": "alice@example.com",
        "password": "secret123",
    }

    signup_response = client.post("/auth/signup", json=signup_payload)
    assert signup_response.status_code == 201, signup_response.text

    login_response = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200, login_response.text
    data = login_response.json()
    assert data["email"] == "alice@example.com"
    assert data["name"] == "Alice Johnson"
    assert data["role"] == "user"
