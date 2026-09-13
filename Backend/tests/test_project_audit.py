def test_creating_project_creates_audit_log(
    client,
    auth_headers,
    admin_user,
    app,
):
    response = client.post(
        "/api/projects",
        headers=auth_headers,
        json={
            "name": "Audit Construction Project",
            "description": "Project audit test",
            "client_name": "Audit Client",
            "location": "Mumbai",
            "status": "planning",
            "budget": 2500000,
            "start_date": "2026-09-13",
            "expected_end_date": "2027-09-13",
        },
    )

    assert response.status_code == 201

    project_id = (
        response.get_json()["data"]["project"]["id"]
    )

    from app.models import AuditLog

    with app.app_context():
        audit_log = AuditLog.query.filter_by(
            organization_id=admin_user["organization_id"],
            user_id=admin_user["user_id"],
            action="create",
            entity_type="project",
            entity_id=project_id,
        ).first()

        assert audit_log is not None

        assert audit_log.old_values is None

        assert audit_log.new_values["name"] == (
            "Audit Construction Project"
        )

        assert audit_log.new_values["status"] == (
            "planning"
        )

        assert audit_log.new_values["budget"] == (
            "2500000.00"
        )

        assert audit_log.new_values["location"] == (
            "Mumbai"
        )


def test_updating_project_creates_audit_log_with_old_and_new_values(
    client,
    auth_headers,
    admin_user,
    app,
):
    create_response = client.post(
        "/api/projects",
        headers=auth_headers,
        json={
            "name": "Original Project",
            "description": "Original description",
            "client_name": "Original Client",
            "location": "Mumbai",
            "status": "planning",
            "budget": 1000000,
        },
    )

    assert create_response.status_code == 201

    project_id = (
        create_response.get_json()["data"]["project"]["id"]
    )

    update_response = client.put(
        f"/api/projects/{project_id}",
        headers=auth_headers,
        json={
            "name": "Updated Project",
            "status": "active",
            "budget": 1500000,
        },
    )

    assert update_response.status_code == 200

    from app.models import AuditLog

    with app.app_context():
        audit_log = AuditLog.query.filter_by(
            organization_id=admin_user["organization_id"],
            user_id=admin_user["user_id"],
            action="update",
            entity_type="project",
            entity_id=project_id,
        ).first()

        assert audit_log is not None

        assert audit_log.old_values["name"] == (
            "Original Project"
        )

        assert audit_log.old_values["status"] == (
            "planning"
        )

        assert audit_log.old_values["budget"] == (
            "1000000.00"
        )

        assert audit_log.new_values["name"] == (
            "Updated Project"
        )

        assert audit_log.new_values["status"] == (
            "active"
        )

        assert audit_log.new_values["budget"] == (
            "1500000.00"
        )