from datetime import date

from app.extensions import db
from app.models import Organization, User, Worker, Attendance


def create_worker(app, organization_id, name="Test Worker", user_id=None):
    with app.app_context():
        worker = Worker(
            organization_id=organization_id,
            user_id=user_id,
            name=name,
            phone="9876543210",
            email=f"{name.lower().replace(' ', '')}@test.com",
            worker_type="Mason",
            daily_wage=800,
            is_active=True,
        )

        db.session.add(worker)
        db.session.commit()

        return worker.id


def test_admin_can_create_attendance(
    client,
    auth_headers,
    admin_user,
    project,
    app,
):
    worker_id = create_worker(
        app,
        admin_user["organization_id"],
    )

    response = client.post(
        "/api/attendance",
        headers=auth_headers,
        json={
            "worker_id": worker_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
            "check_in": "09:00:00",
            "check_out": "18:00:00",
            "notes": "Full day attendance",
        },
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["attendance"]["worker_id"] == worker_id
    assert data["data"]["attendance"]["project_id"] == project
    assert data["data"]["attendance"]["status"] == "present"
    assert data["data"]["attendance"]["check_in"] == "09:00:00"
    assert data["data"]["attendance"]["check_out"] == "18:00:00"


def test_admin_can_get_project_attendance(
    client,
    auth_headers,
    admin_user,
    project,
    app,
):
    worker_id = create_worker(
        app,
        admin_user["organization_id"],
    )

    create_response = client.post(
        "/api/attendance",
        headers=auth_headers,
        json={
            "worker_id": worker_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
        },
    )

    assert create_response.status_code == 201

    response = client.get(
        f"/api/projects/{project}/attendance",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert "attendance" in data["data"]
    assert len(data["data"]["attendance"]) == 1
    assert data["data"]["attendance"][0]["worker_id"] == worker_id


def test_admin_can_update_attendance(
    client,
    auth_headers,
    admin_user,
    project,
    app,
):
    worker_id = create_worker(
        app,
        admin_user["organization_id"],
    )

    create_response = client.post(
        "/api/attendance",
        headers=auth_headers,
        json={
            "worker_id": worker_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
            "check_in": "09:00:00",
        },
    )

    assert create_response.status_code == 201

    attendance_id = (
        create_response
        .get_json()["data"]["attendance"]["id"]
    )

    response = client.put(
        f"/api/attendance/{attendance_id}",
        headers=auth_headers,
        json={
            "status": "half_day",
            "notes": "Worker left early",
        },
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["attendance"]["id"] == attendance_id
    assert data["data"]["attendance"]["status"] == "half_day"
    assert data["data"]["attendance"]["notes"] == "Worker left early"


def test_duplicate_attendance_is_rejected(
    client,
    auth_headers,
    admin_user,
    project,
    app,
):
    worker_id = create_worker(
        app,
        admin_user["organization_id"],
    )

    payload = {
        "worker_id": worker_id,
        "project_id": project,
        "attendance_date": "2026-09-13",
        "status": "present",
    }

    first_response = client.post(
        "/api/attendance",
        headers=auth_headers,
        json=payload,
    )

    assert first_response.status_code == 201

    second_response = client.post(
        "/api/attendance",
        headers=auth_headers,
        json=payload,
    )

    assert second_response.status_code == 409

    data = second_response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "CONFLICT"


def test_invalid_attendance_status_is_rejected(
    client,
    auth_headers,
    admin_user,
    project,
    app,
):
    worker_id = create_worker(
        app,
        admin_user["organization_id"],
    )

    response = client.post(
        "/api/attendance",
        headers=auth_headers,
        json={
            "worker_id": worker_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "working_from_home",
        },
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_checkout_cannot_be_before_checkin(
    client,
    auth_headers,
    admin_user,
    project,
    app,
):
    worker_id = create_worker(
        app,
        admin_user["organization_id"],
    )

    response = client.post(
        "/api/attendance",
        headers=auth_headers,
        json={
            "worker_id": worker_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
            "check_in": "18:00:00",
            "check_out": "09:00:00",
        },
    )

    assert response.status_code == 409

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "ATTENDANCE_ERROR"


def test_unauthenticated_cannot_access_attendance(
    client,
    project,
):
    response = client.get(
        f"/api/projects/{project}/attendance"
    )

    assert response.status_code == 401

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_worker_can_view_project_attendance(
    client,
    auth_headers,
    admin_user,
    project,
    app,
):
    with app.app_context():
        worker_user = User(
            organization_id=admin_user["organization_id"],
            username="attendanceworker",
            email="attendanceworker@test.com",
            role="worker",
            is_active=True,
        )

        worker_user.set_password("Worker@123")

        db.session.add(worker_user)
        db.session.commit()

        worker_user_id = worker_user.id
        worker_email = worker_user.email

    worker_id = create_worker(
        app,
        admin_user["organization_id"],
        user_id=worker_user_id,
    )

    create_response = client.post(
        "/api/attendance",
        headers=auth_headers,
        json={
            "worker_id": worker_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
        },
    )

    assert create_response.status_code == 201

    login = client.post(
        "/api/auth/login",
        json={
            "email": worker_email,
            "password": "Worker@123",
        },
    )

    assert login.status_code == 200

    worker_token = login.get_json()["data"]["access_token"]

    response = client.get(
        f"/api/projects/{project}/attendance",
        headers={
            "Authorization": f"Bearer {worker_token}"
        },
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert len(data["data"]["attendance"]) == 1
    assert data["data"]["attendance"][0]["worker_id"] == worker_id


def test_worker_cannot_create_attendance(
    client,
    admin_user,
    project,
    app,
):
    worker_id = create_worker(
        app,
        admin_user["organization_id"],
    )

    with app.app_context():
        worker_user = User(
            organization_id=admin_user["organization_id"],
            username="attendancecreator",
            email="attendancecreator@test.com",
            role="worker",
            is_active=True,
        )

        worker_user.set_password("Worker@123")

        db.session.add(worker_user)
        db.session.commit()

        worker_email = worker_user.email

    login = client.post(
        "/api/auth/login",
        json={
            "email": worker_email,
            "password": "Worker@123",
        },
    )

    assert login.status_code == 200

    worker_token = login.get_json()["data"]["access_token"]

    response = client.post(
        "/api/attendance",
        headers={
            "Authorization": f"Bearer {worker_token}"
        },
        json={
            "worker_id": worker_id,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
        },
    )

    assert response.status_code == 403

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"