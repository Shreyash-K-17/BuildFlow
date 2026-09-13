from app.extensions import db
from app.models import User


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


def test_admin_can_get_all_workers_in_organization(client, auth_headers):
    # Admin creates Worker 1
    w1_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "adminreadw1",
            "email": "adminreadw1@test.com",
            "password": "Worker@123",
            "full_name": "Admin Read Worker 1",
            "phone": "9876543201",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )
    assert w1_res.status_code == 201
    w1_id = w1_res.get_json()["data"]["worker"]["id"]

    # Admin creates Worker 2
    w2_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "adminreadw2",
            "email": "adminreadw2@test.com",
            "password": "Worker@123",
            "full_name": "Admin Read Worker 2",
            "phone": "9876543202",
            "worker_type": "Carpenter",
            "daily_wage": 900,
        },
    )
    assert w2_res.status_code == 201
    w2_id = w2_res.get_json()["data"]["worker"]["id"]

    # Admin GET all workers
    response = client.get("/api/workers", headers=auth_headers)
    assert response.status_code == 200
    workers = response.get_json()["data"]["workers"]
    worker_ids = [w["id"] for w in workers]
    assert w1_id in worker_ids
    assert w2_id in worker_ids

    # Admin GET each single worker
    r1 = client.get(f"/api/workers/{w1_id}", headers=auth_headers)
    assert r1.status_code == 200
    assert r1.get_json()["data"]["worker"]["id"] == w1_id

    r2 = client.get(f"/api/workers/{w2_id}", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.get_json()["data"]["worker"]["id"] == w2_id


def test_worker_get_workers_returns_only_own_worker(client, auth_headers):
    # Admin creates Worker 1
    w1_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "workeruser1",
            "email": "workeruser1@test.com",
            "password": "Worker@123",
            "full_name": "Worker User 1",
            "phone": "9876543201",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )
    assert w1_res.status_code == 201
    w1_id = w1_res.get_json()["data"]["worker"]["id"]

    # Admin creates Worker 2
    w2_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "workeruser2",
            "email": "workeruser2@test.com",
            "password": "Worker@123",
            "full_name": "Worker User 2",
            "phone": "9876543202",
            "worker_type": "Electrician",
            "daily_wage": 850,
        },
    )
    assert w2_res.status_code == 201
    w2_id = w2_res.get_json()["data"]["worker"]["id"]

    # Login as Worker 1
    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "workeruser1@test.com",
            "password": "Worker@123",
        },
    )
    assert login_res.status_code == 200
    token1 = login_res.get_json()["data"]["access_token"]
    worker1_headers = {"Authorization": f"Bearer {token1}"}

    # Worker 1 calls GET /api/workers
    res = client.get("/api/workers", headers=worker1_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    worker_list = data["data"]["workers"]
    assert len(worker_list) == 1
    assert worker_list[0]["id"] == w1_id
    assert worker_list[0]["name"] == "Worker User 1"


def test_worker_get_single_worker_access(client, auth_headers):
    # Admin creates Worker 1
    w1_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "workersingle1",
            "email": "workersingle1@test.com",
            "password": "Worker@123",
            "full_name": "Worker Single 1",
            "phone": "9876543201",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )
    assert w1_res.status_code == 201
    w1_id = w1_res.get_json()["data"]["worker"]["id"]

    # Admin creates Worker 2
    w2_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "workersingle2",
            "email": "workersingle2@test.com",
            "password": "Worker@123",
            "full_name": "Worker Single 2",
            "phone": "9876543202",
            "worker_type": "Plumber",
            "daily_wage": 850,
        },
    )
    assert w2_res.status_code == 201
    w2_id = w2_res.get_json()["data"]["worker"]["id"]

    # Login as Worker 1
    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "workersingle1@test.com",
            "password": "Worker@123",
        },
    )
    assert login_res.status_code == 200
    token1 = login_res.get_json()["data"]["access_token"]
    worker1_headers = {"Authorization": f"Bearer {token1}"}

    # Worker 1 GET own record -> 200
    own_res = client.get(f"/api/workers/{w1_id}", headers=worker1_headers)
    assert own_res.status_code == 200
    assert own_res.get_json()["data"]["worker"]["id"] == w1_id
    assert own_res.get_json()["data"]["worker"]["name"] == "Worker Single 1"

    # Worker 1 GET Worker 2 record in same organization -> 404 (not 403)
    other_res = client.get(f"/api/workers/{w2_id}", headers=worker1_headers)
    assert other_res.status_code == 404


def test_worker_cannot_access_worker_from_another_organization(client):
    # ---------------------------------------------------------
    # Organization 1 & Worker 1
    # ---------------------------------------------------------
    client.post(
        "/api/auth/register",
        json={
            "organization_name": "Org Alpha",
            "username": "adminalpha",
            "email": "adminalpha@test.com",
            "password": "Admin@123",
        },
    )
    login1 = client.post(
        "/api/auth/login",
        json={
            "email": "adminalpha@test.com",
            "password": "Admin@123",
        },
    )
    token_admin1 = login1.get_json()["data"]["access_token"]
    admin1_headers = {"Authorization": f"Bearer {token_admin1}"}

    w1_res = client.post(
        "/api/workers",
        headers=admin1_headers,
        json={
            "username": "workeralpha",
            "email": "workeralpha@test.com",
            "password": "Worker@123",
            "full_name": "Worker Alpha",
            "phone": "9876543201",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )
    w1_id = w1_res.get_json()["data"]["worker"]["id"]

    # ---------------------------------------------------------
    # Organization 2 & Worker 2
    # ---------------------------------------------------------
    client.post(
        "/api/auth/register",
        json={
            "organization_name": "Org Beta",
            "username": "adminbeta",
            "email": "adminbeta@test.com",
            "password": "Admin@123",
        },
    )
    login2 = client.post(
        "/api/auth/login",
        json={
            "email": "adminbeta@test.com",
            "password": "Admin@123",
        },
    )
    token_admin2 = login2.get_json()["data"]["access_token"]
    admin2_headers = {"Authorization": f"Bearer {token_admin2}"}

    w2_res = client.post(
        "/api/workers",
        headers=admin2_headers,
        json={
            "username": "workerbeta",
            "email": "workerbeta@test.com",
            "password": "Worker@123",
            "full_name": "Worker Beta",
            "phone": "9876543202",
            "worker_type": "Electrician",
            "daily_wage": 850,
        },
    )
    w2_id = w2_res.get_json()["data"]["worker"]["id"]

    # Worker Beta logs in
    w2_login = client.post(
        "/api/auth/login",
        json={
            "email": "workerbeta@test.com",
            "password": "Worker@123",
        },
    )
    w2_token = w2_login.get_json()["data"]["access_token"]
    w2_headers = {"Authorization": f"Bearer {w2_token}"}

    # Worker Beta GET /api/workers -> only returns Worker Beta, NOT Worker Alpha
    w2_list_res = client.get("/api/workers", headers=w2_headers)
    assert w2_list_res.status_code == 200
    w2_list = w2_list_res.get_json()["data"]["workers"]
    assert len(w2_list) == 1
    assert w2_list[0]["id"] == w2_id

    # Worker Beta GET Worker Alpha by ID -> 404
    w2_cross_res = client.get(f"/api/workers/{w1_id}", headers=w2_headers)
    assert w2_cross_res.status_code == 404


def test_admin_can_view_project_wide_attendance(client, auth_headers, project):
    # Admin creates Worker 1
    w1_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "attadminw1",
            "email": "attadminw1@test.com",
            "password": "Worker@123",
            "full_name": "Attendance Admin Worker 1",
            "phone": "9876543201",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )
    assert w1_res.status_code == 201
    w1_id = w1_res.get_json()["data"]["worker"]["id"]

    # Admin creates Worker 2
    w2_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "attadminw2",
            "email": "attadminw2@test.com",
            "password": "Worker@123",
            "full_name": "Attendance Admin Worker 2",
            "phone": "9876543202",
            "worker_type": "Carpenter",
            "daily_wage": 900,
        },
    )
    assert w2_res.status_code == 201
    w2_id = w2_res.get_json()["data"]["worker"]["id"]

    # Admin creates attendance for Worker 1
    att1_res = client.post(
        "/api/attendance",
        headers=auth_headers,
        json={
            "worker_id": w1_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
        },
    )
    assert att1_res.status_code == 201

    # Admin creates attendance for Worker 2
    att2_res = client.post(
        "/api/attendance",
        headers=auth_headers,
        json={
            "worker_id": w2_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
        },
    )
    assert att2_res.status_code == 201

    # Admin GET project attendance -> sees both records
    res = client.get(
        f"/api/projects/{project}/attendance",
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.get_json()["data"]
    attendance_list = data["attendance"]
    worker_ids = [att["worker_id"] for att in attendance_list]
    assert w1_id in worker_ids
    assert w2_id in worker_ids


def test_worker_can_view_only_own_attendance_in_project(client, auth_headers, project):
    # Admin creates Worker 1
    w1_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "attworker1",
            "email": "attworker1@test.com",
            "password": "Worker@123",
            "full_name": "Attendance Worker 1",
            "phone": "9876543201",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )
    assert w1_res.status_code == 201
    w1_id = w1_res.get_json()["data"]["worker"]["id"]

    # Admin creates Worker 2
    w2_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "attworker2",
            "email": "attworker2@test.com",
            "password": "Worker@123",
            "full_name": "Attendance Worker 2",
            "phone": "9876543202",
            "worker_type": "Electrician",
            "daily_wage": 850,
        },
    )
    assert w2_res.status_code == 201
    w2_id = w2_res.get_json()["data"]["worker"]["id"]

    # Admin creates attendance for Worker 1
    client.post(
        "/api/attendance",
        headers=auth_headers,
        json={
            "worker_id": w1_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
        },
    )

    # Admin creates attendance for Worker 2
    client.post(
        "/api/attendance",
        headers=auth_headers,
        json={
            "worker_id": w2_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
        },
    )

    # Worker 1 logs in
    login1 = client.post(
        "/api/auth/login",
        json={
            "email": "attworker1@test.com",
            "password": "Worker@123",
        },
    )
    assert login1.status_code == 200
    token1 = login1.get_json()["data"]["access_token"]

    # Worker 1 GET project attendance -> sees ONLY their own attendance
    res1 = client.get(
        f"/api/projects/{project}/attendance",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert res1.status_code == 200
    records1 = res1.get_json()["data"]["attendance"]
    assert len(records1) == 1
    assert records1[0]["worker_id"] == w1_id

    # Worker 2 logs in
    login2 = client.post(
        "/api/auth/login",
        json={
            "email": "attworker2@test.com",
            "password": "Worker@123",
        },
    )
    assert login2.status_code == 200
    token2 = login2.get_json()["data"]["access_token"]

    # Worker 2 GET project attendance -> sees ONLY their own attendance
    res2 = client.get(
        f"/api/projects/{project}/attendance",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert res2.status_code == 200
    records2 = res2.get_json()["data"]["attendance"]
    assert len(records2) == 1
    assert records2[0]["worker_id"] == w2_id


def test_worker_cannot_access_attendance_for_other_org_project(client):
    # ---------------------------------------------------------
    # Org Alpha: project1 + worker1 + attendance1
    # ---------------------------------------------------------
    client.post(
        "/api/auth/register",
        json={
            "organization_name": "Org Alpha Att",
            "username": "adminalphaatt",
            "email": "adminalphaatt@test.com",
            "password": "Admin@123",
        },
    )
    login_a = client.post(
        "/api/auth/login",
        json={
            "email": "adminalphaatt@test.com",
            "password": "Admin@123",
        },
    )
    token_a = login_a.get_json()["data"]["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    proj1_res = client.post(
        "/api/projects",
        headers=headers_a,
        json={
            "name": "Project Alpha",
            "description": "Alpha project",
            "client_name": "Client Alpha",
            "location": "Mumbai",
            "status": "active",
            "budget": 100000,
        },
    )
    proj1_id = proj1_res.get_json()["data"]["project"]["id"]

    w1_res = client.post(
        "/api/workers",
        headers=headers_a,
        json={
            "username": "workeralphaatt",
            "email": "workeralphaatt@test.com",
            "password": "Worker@123",
            "full_name": "Worker Alpha Attendance",
            "phone": "9876543201",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )
    w1_id = w1_res.get_json()["data"]["worker"]["id"]

    client.post(
        "/api/attendance",
        headers=headers_a,
        json={
            "worker_id": w1_id,
            "project_id": proj1_id,
            "attendance_date": "2026-09-13",
            "status": "present",
        },
    )

    # ---------------------------------------------------------
    # Org Beta: project2 + worker2 + attendance2
    # ---------------------------------------------------------
    client.post(
        "/api/auth/register",
        json={
            "organization_name": "Org Beta Att",
            "username": "adminbetaatt",
            "email": "adminbetaatt@test.com",
            "password": "Admin@123",
        },
    )
    login_b = client.post(
        "/api/auth/login",
        json={
            "email": "adminbetaatt@test.com",
            "password": "Admin@123",
        },
    )
    token_b = login_b.get_json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    proj2_res = client.post(
        "/api/projects",
        headers=headers_b,
        json={
            "name": "Project Beta",
            "description": "Beta project",
            "client_name": "Client Beta",
            "location": "Delhi",
            "status": "active",
            "budget": 200000,
        },
    )
    proj2_id = proj2_res.get_json()["data"]["project"]["id"]

    w2_res = client.post(
        "/api/workers",
        headers=headers_b,
        json={
            "username": "workerbetaatt",
            "email": "workerbetaatt@test.com",
            "password": "Worker@123",
            "full_name": "Worker Beta Attendance",
            "phone": "9876543202",
            "worker_type": "Electrician",
            "daily_wage": 850,
        },
    )
    w2_id = w2_res.get_json()["data"]["worker"]["id"]

    client.post(
        "/api/attendance",
        headers=headers_b,
        json={
            "worker_id": w2_id,
            "project_id": proj2_id,
            "attendance_date": "2026-09-13",
            "status": "present",
        },
    )

    # Worker Beta logs in
    w2_login = client.post(
        "/api/auth/login",
        json={
            "email": "workerbetaatt@test.com",
            "password": "Worker@123",
        },
    )
    w2_token = w2_login.get_json()["data"]["access_token"]
    w2_headers = {"Authorization": f"Bearer {w2_token}"}

    # Worker Beta tries to access project1 attendance -> 404 (does not leak project existence)
    cross_res = client.get(
        f"/api/projects/{proj1_id}/attendance",
        headers=w2_headers,
    )
    assert cross_res.status_code == 404


def test_worker_with_no_linked_worker_profile_receives_empty_attendance_list(
    client,
    app,
    admin_user,
    project,
):
    with app.app_context():
        unlinked_worker = User(
            organization_id=admin_user["organization_id"],
            username="unlinkedworker",
            email="unlinkedworker@test.com",
            role="worker",
            is_active=True,
        )
        unlinked_worker.set_password("Worker@123")
        db.session.add(unlinked_worker)
        db.session.commit()

    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "unlinkedworker@test.com",
            "password": "Worker@123",
        },
    )
    token = login_res.get_json()["data"]["access_token"]

    res = client.get(
        f"/api/projects/{project}/attendance",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["data"]["attendance"] == []


def test_worker_cannot_get_project_expenses_security(
    client,
    auth_headers,
    worker_auth_headers,
    project,
):
    # Admin creates an expense
    client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Labor",
            "description": "Security test wage",
            "amount": 5000,
            "expense_date": "2026-09-13",
        },
    )

    # Worker attempts to view expenses -> 403
    response = client.get(
        f"/api/projects/{project}/expenses",
        headers=worker_auth_headers,
    )

    assert response.status_code == 403
    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_worker_cannot_post_expense_security(
    client,
    worker_auth_headers,
    project,
):
    response = client.post(
        "/api/expenses",
        headers=worker_auth_headers,
        json={
            "project_id": project,
            "category": "Material",
            "description": "Unauthorized expense",
            "amount": 5000,
            "expense_date": "2026-09-13",
        },
    )

    assert response.status_code == 403
    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_worker_cannot_put_expense_security(
    client,
    auth_headers,
    worker_auth_headers,
    project,
):
    create_response = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Material",
            "description": "Original expense",
            "amount": 10000,
            "expense_date": "2026-09-13",
        },
    )

    assert create_response.status_code == 201
    expense_id = create_response.get_json()["data"]["expense"]["id"]

    response = client.put(
        f"/api/expenses/{expense_id}",
        headers=worker_auth_headers,
        json={
            "description": "Worker trying to update expense",
            "amount": 20000,
        },
    )

    assert response.status_code == 403
    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"