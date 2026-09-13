def test_health_check(client):
    response = client.get("/api/health")

    assert response.status_code == 200

    data = response.get_json()

    assert data["status"] == "ok"
    assert data["database"] == "connected"


def test_register_admin(client):
    response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Test Construction Co",
            "username": "admin",
            "email": "admin@test.com",
            "password": "Admin@123",
        },
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["success"] is True
    assert "user" in data["data"]
    assert data["data"]["user"]["username"] == "admin"
    assert data["data"]["user"]["email"] == "admin@test.com"


def test_login_success(client):
    # Register user first
    register_response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Login Test Co",
            "username": "loginadmin",
            "email": "login@test.com",
            "password": "Admin@123",
        },
    )

    assert register_response.status_code == 201

    # Login
    response = client.post(
        "/api/auth/login",
        json={
            "email": "login@test.com",
            "password": "Admin@123",
        },
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["email"] == "login@test.com"


def test_login_wrong_password(client):
    # Register user first
    register_response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Wrong Password Co",
            "username": "wrongpass",
            "email": "wrongpass@test.com",
            "password": "Admin@123",
        },
    )

    assert register_response.status_code == 201

    # Login with wrong password
    response = client.post(
        "/api/auth/login",
        json={
            "email": "wrongpass@test.com",
            "password": "WrongPassword@123",
        },
    )

    assert response.status_code == 401

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_CREDENTIALS"


def test_me_requires_authentication(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"

def test_admin_fixture_authentication(client, admin_user, auth_headers):
    response = client.get(
        "/api/auth/me",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["user"]["id"] == admin_user["user_id"]
    assert data["data"]["user"]["email"] == admin_user["email"]