def test_unauthenticated_cannot_access_projects(client):
    response = client.get("/api/projects")

    assert response.status_code == 401

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_worker_cannot_create_project(client, admin_user):
    # Create a worker through the admin account
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": admin_user["email"],
            "password": admin_user["password"],
        },
    )

    assert login_response.status_code == 200

    admin_token = login_response.get_json()["data"]["access_token"]

    response = client.post(
        "/api/workers",
        headers={
            "Authorization": f"Bearer {admin_token}"
        },
        json={
            "username": "worker1",
            "email": "worker1@test.com",
            "password": "Worker@123",
            "full_name": "Test Worker",
            "phone": "9876543210",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )

    assert response.status_code == 201



    # Login as worker
    worker_login = client.post(
        "/api/auth/login",
        json={
            "email": "worker1@test.com",
            "password": "Worker@123",
        },
    )

    assert worker_login.status_code == 200

    worker_token = worker_login.get_json()["data"]["access_token"]

    # Worker attempts to create project
    response = client.post(
        "/api/projects",
        headers={
            "Authorization": f"Bearer {worker_token}"
        },
        json={
            "name": "Unauthorized Project",
            "description": "Worker should not create this",
            "client_name": "Test Client",
            "location": "Mumbai",
            "status": "planning",
            "budget": 100000,
        },
    )

    assert response.status_code == 403

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_admin_can_create_project(client, auth_headers):
    response = client.post(
        "/api/projects",
        headers=auth_headers,
        json={
            "name": "Security Test Project",
            "description": "Created by admin test",
            "client_name": "Test Client",
            "location": "Mumbai",
            "status": "planning",
            "budget": 500000,
        },
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["project"]["name"] == "Security Test Project"


def test_admin_can_access_own_project(client, auth_headers):
    # Create project
    create_response = client.post(
        "/api/projects",
        headers=auth_headers,
        json={
            "name": "Own Project Test",
            "description": "Organization isolation test",
            "client_name": "Client",
            "location": "Mumbai",
            "status": "planning",
            "budget": 100000,
        },
    )

    assert create_response.status_code == 201

    project_id = create_response.get_json()["data"]["project"]["id"]

    # Access own project
    response = client.get(
        f"/api/projects/{project_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["project"]["id"] == project_id


def test_organization_isolation(client, app):
    # ---------------------------------------------------------
    # Organization 1
    # ---------------------------------------------------------
    org1_response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Organization One",
            "username": "admin1",
            "email": "admin1@test.com",
            "password": "Admin@123",
        },
    )

    assert org1_response.status_code == 201

    org1_login = client.post(
        "/api/auth/login",
        json={
            "email": "admin1@test.com",
            "password": "Admin@123",
        },
    )

    assert org1_login.status_code == 200

    org1_token = org1_login.get_json()["data"]["access_token"]

    org1_headers = {
        "Authorization": f"Bearer {org1_token}"
    }

    # Create Project belonging to Organization 1
    project_response = client.post(
        "/api/projects",
        headers=org1_headers,
        json={
            "name": "Organization One Project",
            "description": "Private project",
            "client_name": "Client One",
            "location": "Mumbai",
            "status": "planning",
            "budget": 100000,
        },
    )

    assert project_response.status_code == 201

    project_id = project_response.get_json()["data"]["project"]["id"]

    # ---------------------------------------------------------
    # Organization 2
    # ---------------------------------------------------------
    org2_response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Organization Two",
            "username": "admin2",
            "email": "admin2@test.com",
            "password": "Admin@123",
        },
    )

    assert org2_response.status_code == 201

    org2_login = client.post(
        "/api/auth/login",
        json={
            "email": "admin2@test.com",
            "password": "Admin@123",
        },
    )

    assert org2_login.status_code == 200

    org2_token = org2_login.get_json()["data"]["access_token"]

    org2_headers = {
        "Authorization": f"Bearer {org2_token}"
    }

    # ---------------------------------------------------------
    # Organization 2 must NOT access Organization 1 project
    # ---------------------------------------------------------
    response = client.get(
        f"/api/projects/{project_id}",
        headers=org2_headers,
    )

    assert response.status_code == 404

    # ---------------------------------------------------------
    # Organization 2 must NOT modify Organization 1 project
    # ---------------------------------------------------------
    response = client.put(
        f"/api/projects/{project_id}",
        headers=org2_headers,
        json={
            "name": "HACKED PROJECT",
        },
    )

    assert response.status_code == 404

    # ---------------------------------------------------------
    # Verify Organization 1 still sees its original project
    # ---------------------------------------------------------
    response = client.get(
        f"/api/projects/{project_id}",
        headers=org1_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["project"]["name"] == "Organization One Project"


def test_unauthenticated_cannot_access_workers(client):
    response = client.get("/api/workers")

    assert response.status_code == 401

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_worker_cannot_create_worker(client, admin_user, auth_headers):
    # Admin creates Worker 1
    response = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "workerone",
            "email": "workerone@test.com",
            "password": "Worker@123",
            "full_name": "Worker One",
            "phone": "9876543210",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )

    assert response.status_code == 201

    # Worker logs in
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "workerone@test.com",
            "password": "Worker@123",
        },
    )

    assert login_response.status_code == 200

    worker_token = login_response.get_json()["data"]["access_token"]

    worker_headers = {
        "Authorization": f"Bearer {worker_token}"
    }

    # Worker attempts to create another worker
    response = client.post(
        "/api/workers",
        headers=worker_headers,
        json={
            "username": "workertwo",
            "email": "workertwo@test.com",
            "password": "Worker@123",
            "full_name": "Worker Two",
            "phone": "9876543211",
            "worker_type": "Carpenter",
            "daily_wage": 900,
        },
    )

    assert response.status_code == 403

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_worker_organization_isolation(client):
    # ---------------------------------------------------------
    # Organization 1
    # ---------------------------------------------------------
    response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Worker Organization One",
            "username": "workeradmin1",
            "email": "workeradmin1@test.com",
            "password": "Admin@123",
        },
    )

    assert response.status_code == 201

    login = client.post(
        "/api/auth/login",
        json={
            "email": "workeradmin1@test.com",
            "password": "Admin@123",
        },
    )

    assert login.status_code == 200

    token1 = login.get_json()["data"]["access_token"]

    headers1 = {
        "Authorization": f"Bearer {token1}"
    }

    # Create worker belonging to Organization 1
    response = client.post(
        "/api/workers",
        headers=headers1,
        json={
            "username": "org1worker",
            "email": "org1worker@test.com",
            "password": "Worker@123",
            "full_name": "Organization One Worker",
            "phone": "9876543201",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )

    assert response.status_code == 201

    worker_data = response.get_json()["data"]

    worker_id = worker_data["worker"]["id"]

    # ---------------------------------------------------------
    # Organization 2
    # ---------------------------------------------------------
    response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Worker Organization Two",
            "username": "workeradmin2",
            "email": "workeradmin2@test.com",
            "password": "Admin@123",
        },
    )

    assert response.status_code == 201

    login = client.post(
        "/api/auth/login",
        json={
            "email": "workeradmin2@test.com",
            "password": "Admin@123",
        },
    )

    assert login.status_code == 200

    token2 = login.get_json()["data"]["access_token"]

    headers2 = {
        "Authorization": f"Bearer {token2}"
    }

    # Organization 2 cannot GET Organization 1 worker
    response = client.get(
        f"/api/workers/{worker_id}",
        headers=headers2,
    )

    assert response.status_code == 404



    # Organization 1 can still access its worker
    response = client.get(
        f"/api/workers/{worker_id}",
        headers=headers1,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["worker"]["id"] == worker_id
    assert data["data"]["worker"]["name"] == "Organization One Worker"