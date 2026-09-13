from app.models import AuditLog


def test_attendance_create_creates_audit_log(
    client,
    auth_headers,
    project,
    worker,
):
    response = client.post(
        "/api/attendance",
        json={
            "worker_id": worker,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
            "check_in": "09:00:00",
            "check_out": "18:00:00",
            "notes": "Full day attendance",
        },
        headers=auth_headers,
    )

    assert response.status_code == 201

    attendance_id = (
        response.get_json()
        ["data"]
        ["attendance"]
        ["id"]
    )

    audit = AuditLog.query.filter_by(
        entity_type="attendance",
        entity_id=attendance_id,
        action="create",
    ).first()

    assert audit is not None
    assert audit.new_values["worker_id"] == worker
    assert audit.new_values["project_id"] == project
    assert audit.new_values["attendance_date"] == "2026-09-13"
    assert audit.new_values["status"] == "present"
    assert audit.new_values["check_in"] == "09:00:00"
    assert audit.new_values["check_out"] == "18:00:00"
    assert audit.new_values["notes"] == "Full day attendance"


def test_attendance_update_creates_audit_log_with_old_and_new_values(
    client,
    auth_headers,
    project,
    worker,
):
    create_response = client.post(
        "/api/attendance",
        json={
            "worker_id": worker,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
            "check_in": "09:00:00",
            "check_out": "18:00:00",
            "notes": "Full day attendance",
        },
        headers=auth_headers,
    )

    assert create_response.status_code == 201

    attendance_id = (
        create_response.get_json()
        ["data"]
        ["attendance"]
        ["id"]
    )

    response = client.put(
        f"/api/attendance/{attendance_id}",
        json={
            "status": "half_day",
            "check_in": "09:00:00",
            "check_out": "13:00:00",
            "notes": "Left after half day",
        },
        headers=auth_headers,
    )

    assert response.status_code == 200

    audit = AuditLog.query.filter_by(
        entity_type="attendance",
        entity_id=attendance_id,
        action="update",
    ).order_by(
        AuditLog.id.desc()
    ).first()

    assert audit is not None

    assert audit.old_values["worker_id"] == worker
    assert audit.old_values["project_id"] == project
    assert audit.old_values["attendance_date"] == "2026-09-13"
    assert audit.old_values["status"] == "present"
    assert audit.old_values["check_in"] == "09:00:00"
    assert audit.old_values["check_out"] == "18:00:00"
    assert audit.old_values["notes"] == "Full day attendance"

    assert audit.new_values["worker_id"] == worker
    assert audit.new_values["project_id"] == project
    assert audit.new_values["attendance_date"] == "2026-09-13"
    assert audit.new_values["status"] == "half_day"
    assert audit.new_values["check_in"] == "09:00:00"
    assert audit.new_values["check_out"] == "13:00:00"
    assert audit.new_values["notes"] == "Left after half day"