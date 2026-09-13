from app.models import AuditLog


def test_expense_create_creates_audit_log(
    client,
    auth_headers,
    project,
):
    response = client.post(
        "/api/expenses",
        json={
            "project_id": project,
            "category": "Materials",
            "description": "Cement purchase",
            "amount": 45000,
            "expense_date": "2026-09-13",
        },
        headers=auth_headers,
    )

    assert response.status_code == 201

    expense_id = response.get_json()["data"]["expense"]["id"]

    audit = AuditLog.query.filter_by(
        entity_type="expense",
        entity_id=expense_id,
        action="create",
    ).first()

    assert audit is not None
    assert audit.new_values["project_id"] == project
    assert audit.new_values["category"] == "Materials"
    assert audit.new_values["description"] == "Cement purchase"
    assert audit.new_values["amount"] == "45000.00"
    assert audit.new_values["expense_date"] == "2026-09-13"


def test_expense_update_creates_audit_log_with_old_and_new_values(
    client,
    auth_headers,
    project,
):
    create_response = client.post(
        "/api/expenses",
        json={
            "project_id": project,
            "category": "Materials",
            "description": "Cement purchase",
            "amount": 45000,
            "expense_date": "2026-09-13",
        },
        headers=auth_headers,
    )

    assert create_response.status_code == 201

    expense_id = create_response.get_json()["data"]["expense"]["id"]

    response = client.put(
        f"/api/expenses/{expense_id}",
        json={
            "category": "Labour",
            "description": "Worker payment",
            "amount": 50000,
            "expense_date": "2026-09-14",
        },
        headers=auth_headers,
    )

    assert response.status_code == 200

    audit = AuditLog.query.filter_by(
        entity_type="expense",
        entity_id=expense_id,
        action="update",
    ).order_by(
        AuditLog.id.desc()
    ).first()

    assert audit is not None

    assert audit.old_values["project_id"] == project
    assert audit.old_values["category"] == "Materials"
    assert audit.old_values["description"] == "Cement purchase"
    assert audit.old_values["amount"] == "45000.00"
    assert audit.old_values["expense_date"] == "2026-09-13"

    assert audit.new_values["project_id"] == project
    assert audit.new_values["category"] == "Labour"
    assert audit.new_values["description"] == "Worker payment"
    assert audit.new_values["amount"] == "50000.00"
    assert audit.new_values["expense_date"] == "2026-09-14"