def test_creating_task_creates_audit_log(
    client,
    auth_headers,
    phase,
    admin_user,
    app,
):
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Foundation Excavation",
            "description": "Excavate foundation area",
            "status": "not_started",
            "progress": 0,
            "priority": "high",
        },
    )

    assert response.status_code == 201

    task_id = response.get_json()["data"]["task"]["id"]

    from app.extensions import db
    from app.models import AuditLog

    with app.app_context():
        audit_log = AuditLog.query.filter_by(
            organization_id=admin_user["organization_id"],
            user_id=admin_user["user_id"],
            action="create",
            entity_type="task",
            entity_id=task_id,
        ).first()

        assert audit_log is not None

        assert audit_log.new_values["title"] == (
            "Foundation Excavation"
        )

        assert audit_log.new_values["status"] == (
            "not_started"
        )

        assert audit_log.new_values["progress"] == 0

        assert audit_log.old_values is None


def test_updating_task_creates_audit_log_with_old_and_new_values(
    client,
    auth_headers,
    phase,
    admin_user,
    app,
):
    create_response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Concrete Work",
            "status": "not_started",
            "progress": 0,
            "priority": "medium",
        },
    )

    assert create_response.status_code == 201

    task_id = create_response.get_json()["data"]["task"]["id"]

    update_response = client.put(
        f"/api/tasks/{task_id}",
        headers=auth_headers,
        json={
            "status": "completed",
            "progress": 100,
        },
    )

    assert update_response.status_code == 200

    from app.extensions import db
    from app.models import AuditLog

    with app.app_context():
        audit_log = AuditLog.query.filter_by(
            organization_id=admin_user["organization_id"],
            user_id=admin_user["user_id"],
            action="update",
            entity_type="task",
            entity_id=task_id,
        ).first()

        assert audit_log is not None

        assert audit_log.old_values["status"] == (
            "not_started"
        )

        assert audit_log.old_values["progress"] == 0

        assert audit_log.new_values["status"] == (
            "completed"
        )

        assert audit_log.new_values["progress"] == 100