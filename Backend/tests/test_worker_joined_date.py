from app.extensions import db
from app.models import AuditLog, Worker


# ============================================================
# CREATE WORKER WITH EXPLICIT JOINED DATE
# ============================================================

def test_create_worker_with_explicit_joined_date(client, auth_headers):
    response = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "joinedworker",
            "email": "joinedworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Joined Worker",
            "phone": "9876543210",
            "worker_type": "Mason",
            "daily_wage": 850,
            "joined_date": "2024-03-12",
        },
    )

    assert response.status_code == 201
    data = response.get_json()["data"]["worker"]
    assert data["name"] == "Joined Worker"
    assert data["joined_date"] == "2024-03-12"

    worker = db.session.get(Worker, data["id"])
    assert str(worker.joined_date) == "2024-03-12"


# ============================================================
# OMITTED JOINED DATE REMAINS NULL
# ============================================================

def test_create_worker_without_joined_date_remains_null(client, auth_headers):
    response = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "nulljoinedworker",
            "email": "nulljoinedworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Null Joined Worker",
            "phone": "9876543211",
            "worker_type": "Electrician",
            "daily_wage": 900,
        },
    )

    assert response.status_code == 201
    data = response.get_json()["data"]["worker"]
    assert data["joined_date"] is None

    worker = db.session.get(Worker, data["id"])
    assert worker.joined_date is None


# ============================================================
# ADMIN CAN UPDATE JOINED DATE
# ============================================================

def test_admin_can_update_joined_date(client, auth_headers):
    create_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "updatejoinedworker",
            "email": "updatejoinedworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Update Joined Worker",
            "joined_date": "2023-01-15",
        },
    )
    assert create_res.status_code == 201
    worker_id = create_res.get_json()["data"]["worker"]["id"]

    # Update joined date
    update_res = client.put(
        f"/api/workers/{worker_id}",
        headers=auth_headers,
        json={
            "joined_date": "2024-06-20",
        },
    )
    assert update_res.status_code == 200
    data = update_res.get_json()["data"]["worker"]
    assert data["joined_date"] == "2024-06-20"

    worker = db.session.get(Worker, worker_id)
    assert str(worker.joined_date) == "2024-06-20"


# ============================================================
# JOINED DATE APPEARS IN GET LIST & DETAIL
# ============================================================

def test_joined_date_in_get_endpoints(client, auth_headers):
    create_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "getjoinedworker",
            "email": "getjoinedworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Get Joined Worker",
            "joined_date": "2022-11-05",
        },
    )
    assert create_res.status_code == 201
    worker_id = create_res.get_json()["data"]["worker"]["id"]

    # GET list
    list_res = client.get("/api/workers", headers=auth_headers)
    assert list_res.status_code == 200
    workers = list_res.get_json()["data"]["workers"]
    found = next((w for w in workers if w["id"] == worker_id), None)
    assert found is not None
    assert found["joined_date"] == "2022-11-05"

    # GET detail
    detail_res = client.get(f"/api/workers/{worker_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    detail_worker = detail_res.get_json()["data"]["worker"]
    assert detail_worker["joined_date"] == "2022-11-05"


# ============================================================
# AUDIT LOG CONTAINS JOINED DATE OLD/NEW VALUES
# ============================================================

def test_joined_date_in_audit_log(client, auth_headers):
    create_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "auditjoinedworker",
            "email": "auditjoinedworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Audit Joined Worker",
            "joined_date": "2024-01-01",
        },
    )
    assert create_res.status_code == 201
    worker_id = create_res.get_json()["data"]["worker"]["id"]

    # Verify create audit log
    create_audit = AuditLog.query.filter_by(
        entity_type="worker",
        entity_id=worker_id,
        action="create",
    ).first()
    assert create_audit is not None
    assert create_audit.new_values["joined_date"] == "2024-01-01"

    # Update joined date
    client.put(
        f"/api/workers/{worker_id}",
        headers=auth_headers,
        json={
            "joined_date": "2024-05-15",
        },
    )

    # Verify update audit log
    update_audit = AuditLog.query.filter_by(
        entity_type="worker",
        entity_id=worker_id,
        action="update",
    ).order_by(AuditLog.id.desc()).first()
    assert update_audit is not None
    assert update_audit.old_values["joined_date"] == "2024-01-01"
    assert update_audit.new_values["joined_date"] == "2024-05-15"


# ============================================================
# INVALID DATE FORMAT RETURNS 400
# ============================================================

def test_invalid_joined_date_format_rejected(client, auth_headers):
    response = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "invaliddateworker",
            "email": "invaliddateworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Invalid Date Worker",
            "joined_date": "12-03-2024",  # Not YYYY-MM-DD
        },
    )

    assert response.status_code == 400
    assert response.get_json()["success"] is False
    assert "joined_date" in response.get_json()["error"]["details"]


# ============================================================
# WORKER CANNOT UPDATE WORKER JOINED DATE
# ============================================================

def test_worker_cannot_update_worker_joined_date(
    client,
    worker_auth_headers,
    worker,
):
    response = client.put(
        f"/api/workers/{worker}",
        headers=worker_auth_headers,
        json={
            "joined_date": "2020-01-01",
        },
    )

    assert response.status_code == 403
