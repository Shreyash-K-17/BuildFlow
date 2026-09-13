from app.models import AuditLog


def test_worker_create_creates_audit_log(
    client,
    auth_headers,
):
    response = client.post(
        "/api/workers",
        json={
            "username": "auditworker",
            "email": "auditworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Audit Worker",
            "phone": "9876543210",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
        headers=auth_headers,
    )

    assert response.status_code == 201

    worker_id = response.get_json()["data"]["worker"]["id"]

    audit = AuditLog.query.filter_by(
        entity_type="worker",
        entity_id=worker_id,
        action="create",
    ).first()

    assert audit is not None
    assert audit.organization_id is not None
    assert audit.user_id is not None

    assert audit.new_values["name"] == "Audit Worker"
    assert audit.new_values["phone"] == "9876543210"
    assert audit.new_values["email"] == "auditworker@test.com"
    assert audit.new_values["worker_type"] == "Mason"
    assert audit.new_values["daily_wage"] == "800.00"
    assert audit.new_values["is_active"] is True
    assert audit.new_values["user_id"] is not None