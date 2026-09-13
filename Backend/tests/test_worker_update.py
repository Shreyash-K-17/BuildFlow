from app.extensions import db
from app.models import AuditLog, User, Worker


# ============================================================
# ADMIN CAN UPDATE WORKER
# ============================================================

def test_admin_can_update_worker(
    client,
    auth_headers,
):
    create_response = client.post(
        "/api/workers",
        json={
            "username": "updateworker",
            "email": "updateworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Original Worker",
            "phone": "9876543210",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
        headers=auth_headers,
    )

    assert create_response.status_code == 201

    worker_id = (
        create_response
        .get_json()["data"]["worker"]["id"]
    )

    response = client.put(
        f"/api/workers/{worker_id}",
        json={
            "username": "updatedworker",
            "email": "updatedworker@test.com",
            "full_name": "Updated Worker",
            "phone": "9999999999",
            "worker_type": "Supervisor",
            "daily_wage": 1200,
            "is_active": False,
        },
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()["data"]["worker"]

    assert data["name"] == "Updated Worker"
    assert data["phone"] == "9999999999"
    assert data["email"] == "updatedworker@test.com"
    assert data["worker_type"] == "Supervisor"
    assert data["daily_wage"] == "1200.00"
    assert data["is_active"] is False

    worker = db.session.get(
        Worker,
        worker_id,
    )

    assert worker.name == "Updated Worker"
    assert worker.email == "updatedworker@test.com"
    assert worker.is_active is False

    user = db.session.get(
        User,
        worker.user_id,
    )

    assert user.username == "updatedworker"
    assert user.email == "updatedworker@test.com"
    assert user.is_active is False


# ============================================================
# WORKER UPDATE CREATES AUDIT LOG
# ============================================================

def test_worker_update_creates_audit_log_with_old_and_new_values(
    client,
    auth_headers,
):
    create_response = client.post(
        "/api/workers",
        json={
            "username": "auditupdateworker",
            "email": "auditupdateworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Audit Original",
            "phone": "9876543210",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
        headers=auth_headers,
    )

    assert create_response.status_code == 201

    worker_id = (
        create_response
        .get_json()["data"]["worker"]["id"]
    )

    response = client.put(
        f"/api/workers/{worker_id}",
        json={
            "full_name": "Audit Updated",
            "worker_type": "Supervisor",
            "daily_wage": 1000,
        },
        headers=auth_headers,
    )

    assert response.status_code == 200

    audit = AuditLog.query.filter_by(
        entity_type="worker",
        entity_id=worker_id,
        action="update",
    ).order_by(
        AuditLog.id.desc()
    ).first()

    assert audit is not None

    # --------------------------------------------------------
    # OLD VALUES
    # --------------------------------------------------------

    assert audit.old_values["name"] == "Audit Original"
    assert audit.old_values["phone"] == "9876543210"
    assert audit.old_values["email"] == (
        "auditupdateworker@test.com"
    )
    assert audit.old_values["worker_type"] == "Mason"
    assert audit.old_values["daily_wage"] == "800.00"
    assert audit.old_values["is_active"] is True

    # --------------------------------------------------------
    # NEW VALUES
    # --------------------------------------------------------

    assert audit.new_values["name"] == "Audit Updated"
    assert audit.new_values["phone"] == "9876543210"
    assert audit.new_values["email"] == (
        "auditupdateworker@test.com"
    )
    assert audit.new_values["worker_type"] == "Supervisor"
    assert audit.new_values["daily_wage"] == "1000.00"
    assert audit.new_values["is_active"] is True


# ============================================================
# WORKER CANNOT UPDATE WORKER
# ============================================================

def test_worker_cannot_update_worker(
    client,
    worker_auth_headers,
    worker,
):
    response = client.put(
        f"/api/workers/{worker}",
        json={
            "full_name": "Unauthorized Update",
        },
        headers=worker_auth_headers,
    )

    assert response.status_code == 403


# ============================================================
# UNAUTHENTICATED USER CANNOT UPDATE WORKER
# ============================================================

def test_unauthenticated_cannot_update_worker(
    client,
    worker,
):
    response = client.put(
        f"/api/workers/{worker}",
        json={
            "full_name": "Unauthorized Update",
        },
    )

    assert response.status_code == 401