from datetime import date, timedelta
from sqlalchemy import event

from app.extensions import db
from app.models import Organization, Project, User, Worker, Attendance
from app.services.attendance_service import get_paginated_project_attendance


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
    assert "pagination" in data["data"]
    assert data["data"]["pagination"]["page"] == 1
    assert data["data"]["pagination"]["per_page"] == 25
    assert data["data"]["pagination"]["total"] == 1
    assert data["data"]["pagination"]["pages"] == 1
    assert data["data"]["project_id"] == project


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


# ============================================================
# PAGINATION REGRESSION TESTS
# ============================================================

def test_attendance_default_pagination(client, auth_headers, admin_user, project, app):
    with app.app_context():
        worker_id = create_worker(app, admin_user["organization_id"])
        # Create 30 attendance records
        for i in range(30):
            att = Attendance(
                worker_id=worker_id,
                project_id=project,
                attendance_date=date(2026, 1, 1) + timedelta(days=i),
                status="present",
                check_in=None,
                check_out=None,
            )
            db.session.add(att)
        db.session.commit()

    response = client.get(
        f"/api/projects/{project}/attendance",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]

    assert len(data["attendance"]) == 25
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["per_page"] == 25
    assert data["pagination"]["total"] == 30
    assert data["pagination"]["pages"] == 2
    assert data["project_id"] == project


def test_attendance_custom_pagination(client, auth_headers, admin_user, project, app):
    with app.app_context():
        worker_id = create_worker(app, admin_user["organization_id"])
        for i in range(25):
            att = Attendance(
                worker_id=worker_id,
                project_id=project,
                attendance_date=date(2026, 1, 1) + timedelta(days=i),
                status="present",
            )
            db.session.add(att)
        db.session.commit()

    response = client.get(
        f"/api/projects/{project}/attendance?page=2&per_page=10",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]

    assert len(data["attendance"]) == 10
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["per_page"] == 10
    assert data["pagination"]["total"] == 25
    assert data["pagination"]["pages"] == 3


def test_attendance_max_per_page(client, auth_headers, project):
    response = client.get(
        f"/api/projects/{project}/attendance?page=1&per_page=100",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["pagination"]["per_page"] == 100


def test_attendance_over_max_per_page_returns_400(client, auth_headers, project):
    response = client.get(
        f"/api/projects/{project}/attendance?per_page=101",
        headers=auth_headers,
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_attendance_invalid_pagination_parameters(client, auth_headers, project):
    # page=0
    res = client.get(
        f"/api/projects/{project}/attendance?page=0",
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "VALIDATION_ERROR"

    # per_page=0
    res = client.get(
        f"/api/projects/{project}/attendance?per_page=0",
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "VALIDATION_ERROR"

    # non-numeric page
    res = client.get(
        f"/api/projects/{project}/attendance?page=abc",
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "VALIDATION_ERROR"


def test_attendance_page_beyond_last_page(client, auth_headers, admin_user, project, app):
    with app.app_context():
        worker_id = create_worker(app, admin_user["organization_id"])
        att = Attendance(
            worker_id=worker_id,
            project_id=project,
            attendance_date=date(2026, 9, 10),
            status="present",
        )
        db.session.add(att)
        db.session.commit()

    response = client.get(
        f"/api/projects/{project}/attendance?page=5&per_page=10",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["attendance"] == []
    assert data["pagination"]["page"] == 5
    assert data["pagination"]["total"] == 1
    assert data["pagination"]["pages"] == 1


def test_attendance_empty_project(client, auth_headers, project):
    response = client.get(
        f"/api/projects/{project}/attendance",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["attendance"] == []
    assert data["pagination"]["total"] == 0
    assert data["pagination"]["pages"] == 0
    assert data["pagination"]["page"] == 1


def test_attendance_deterministic_ordering(client, auth_headers, admin_user, project, app):
    with app.app_context():
        worker_id_1 = create_worker(app, admin_user["organization_id"], name="Worker One")
        worker_id_2 = create_worker(app, admin_user["organization_id"], name="Worker Two")

        a1 = Attendance(
            worker_id=worker_id_1,
            project_id=project,
            attendance_date=date(2026, 9, 1),
            status="present",
        )
        a2 = Attendance(
            worker_id=worker_id_1,
            project_id=project,
            attendance_date=date(2026, 9, 15),
            status="present",
        )
        a3 = Attendance(
            worker_id=worker_id_2,
            project_id=project,
            attendance_date=date(2026, 9, 15),
            status="present",
        )
        db.session.add_all([a1, a2, a3])
        db.session.commit()

        a1_id = a1.id
        a2_id = a2.id
        a3_id = a3.id

    response = client.get(
        f"/api/projects/{project}/attendance",
        headers=auth_headers,
    )
    assert response.status_code == 200
    records = response.get_json()["data"]["attendance"]

    # Expect: date 2026-09-15 with higher id (a3), then date 2026-09-15 with lower id (a2), then 2026-09-01 (a1)
    assert [r["id"] for r in records] == [a3_id, a2_id, a1_id]


def test_attendance_sql_pagination_used(app, project, admin_user):
    with app.app_context():
        worker_id = create_worker(app, admin_user["organization_id"])
        att = Attendance(
            worker_id=worker_id,
            project_id=project,
            attendance_date=date(2026, 9, 10),
            status="present",
        )
        db.session.add(att)
        db.session.commit()

        queries = []

        def statement_listener(conn, cursor, statement, parameters, context, executemany):
            queries.append(statement.upper())

        event.listen(db.engine, "before_cursor_execute", statement_listener)
        try:
            records, total, pages = get_paginated_project_attendance(
                project_id=project,
                page=2,
                per_page=10,
            )
            # Verify SQL contains LIMIT and OFFSET
            select_queries = [q for q in queries if "LIMIT" in q and "OFFSET" in q]
            assert len(select_queries) >= 1
        finally:
            event.remove(db.engine, "before_cursor_execute", statement_listener)


def test_worker_privacy_in_paginated_attendance(client, auth_headers, admin_user, project, app):
    with app.app_context():
        # Create Worker 1 with login
        worker1_user = User(
            organization_id=admin_user["organization_id"],
            username="workerone",
            email="workerone@test.com",
            role="worker",
            is_active=True,
        )
        worker1_user.set_password("Worker@123")
        db.session.add(worker1_user)
        db.session.commit()

        w1_id = create_worker(app, admin_user["organization_id"], name="Worker One", user_id=worker1_user.id)

        # Create Worker 2 with login
        worker2_user = User(
            organization_id=admin_user["organization_id"],
            username="workertwo",
            email="workertwo@test.com",
            role="worker",
            is_active=True,
        )
        worker2_user.set_password("Worker@123")
        db.session.add(worker2_user)
        db.session.commit()

        w2_id = create_worker(app, admin_user["organization_id"], name="Worker Two", user_id=worker2_user.id)

        # Create attendance for both workers
        a1 = Attendance(
            worker_id=w1_id,
            project_id=project,
            attendance_date=date(2026, 9, 10),
            status="present",
        )
        a2 = Attendance(
            worker_id=w2_id,
            project_id=project,
            attendance_date=date(2026, 9, 10),
            status="present",
        )
        db.session.add_all([a1, a2])
        db.session.commit()

    # Login Worker 1
    login1 = client.post(
        "/api/auth/login",
        json={"email": "workerone@test.com", "password": "Worker@123"},
    )
    token1 = login1.get_json()["data"]["access_token"]

    # Worker 1 requests project attendance
    res1 = client.get(
        f"/api/projects/{project}/attendance",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert res1.status_code == 200
    data1 = res1.get_json()["data"]
    assert len(data1["attendance"]) == 1
    assert data1["attendance"][0]["worker_id"] == w1_id
    assert data1["pagination"]["total"] == 1

    # Login Worker 2
    login2 = client.post(
        "/api/auth/login",
        json={"email": "workertwo@test.com", "password": "Worker@123"},
    )
    token2 = login2.get_json()["data"]["access_token"]

    # Worker 2 requests project attendance
    res2 = client.get(
        f"/api/projects/{project}/attendance",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert res2.status_code == 200
    data2 = res2.get_json()["data"]
    assert len(data2["attendance"]) == 1
    assert data2["attendance"][0]["worker_id"] == w2_id
    assert data2["pagination"]["total"] == 1

    # Admin sees BOTH records
    res_admin = client.get(
        f"/api/projects/{project}/attendance",
        headers=auth_headers,
    )
    assert res_admin.status_code == 200
    data_admin = res_admin.get_json()["data"]
    assert len(data_admin["attendance"]) == 2
    assert data_admin["pagination"]["total"] == 2


def test_worker_cannot_access_cross_org_project_attendance(client, admin_user, app):
    with app.app_context():
        # Create Org 2 with a project
        org2 = Organization(name="Other Org")
        db.session.add(org2)
        db.session.commit()

        p2 = Project(
            organization_id=org2.id,
            name="Org 2 Project",
            status="active",
            budget=500000,
        )
        db.session.add(p2)
        db.session.commit()
        p2_id = p2.id

        # Create Worker in Org 1
        worker_user = User(
            organization_id=admin_user["organization_id"],
            username="org1worker",
            email="org1worker@test.com",
            role="worker",
            is_active=True,
        )
        worker_user.set_password("Worker@123")
        db.session.add(worker_user)
        db.session.commit()

    login = client.post(
        "/api/auth/login",
        json={"email": "org1worker@test.com", "password": "Worker@123"},
    )
    token = login.get_json()["data"]["access_token"]

    # Worker from Org 1 tries to access Org 2 project attendance -> 404
    res = client.get(
        f"/api/projects/{p2_id}/attendance",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404