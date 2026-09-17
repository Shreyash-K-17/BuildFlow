from datetime import date
from app.extensions import db
from app.models import AuditLog, Expense, Organization, Project, User


def test_admin_can_delete_expense(client, auth_headers, project):
    # Create an expense first
    create_res = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Equipment",
            "description": "Scaffolding rental",
            "amount": 25000,
            "expense_date": "2026-09-15",
        },
    )
    assert create_res.status_code == 201
    expense_id = create_res.get_json()["data"]["expense"]["id"]

    # Delete the expense
    delete_res = client.delete(
        f"/api/expenses/{expense_id}",
        headers=auth_headers,
    )
    assert delete_res.status_code == 200
    data = delete_res.get_json()
    assert data["success"] is True
    assert data["message"] == "Expense deleted successfully."

    # Verify expense is gone from project expenses
    list_res = client.get(
        f"/api/projects/{project}/expenses",
        headers=auth_headers,
    )
    assert list_res.status_code == 200
    expense_ids = [e["id"] for e in list_res.get_json()["data"]["expenses"]]
    assert expense_id not in expense_ids

    # Verify audit log was created
    audit = AuditLog.query.filter_by(
        entity_type="expense",
        entity_id=expense_id,
        action="delete",
    ).first()
    assert audit is not None
    assert audit.old_values is not None
    assert audit.old_values["description"] == "Scaffolding rental"
    assert audit.old_values["amount"] == "25000.00"
    assert audit.old_values["category"] == "Equipment"
    assert audit.new_values is None


def test_worker_cannot_delete_expense(client, auth_headers, worker_auth_headers, project):
    create_res = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Material",
            "description": "Steel rods",
            "amount": 40000,
            "expense_date": "2026-09-15",
        },
    )
    assert create_res.status_code == 201
    expense_id = create_res.get_json()["data"]["expense"]["id"]

    # Worker attempts deletion
    res = client.delete(
        f"/api/expenses/{expense_id}",
        headers=worker_auth_headers,
    )
    assert res.status_code == 403
    assert res.get_json()["success"] is False
    assert res.get_json()["error"]["code"] == "FORBIDDEN"


def test_delete_nonexistent_expense_returns_404(client, auth_headers):
    res = client.delete(
        "/api/expenses/999999",
        headers=auth_headers,
    )
    assert res.status_code == 404
    assert res.get_json()["success"] is False
    assert res.get_json()["error"]["code"] == "NOT_FOUND"


def test_delete_cross_organization_expense_returns_404(app, client, auth_headers):
    with app.app_context():
        other_org = Organization(name="Other Construction Org")
        db.session.add(other_org)
        db.session.commit()

        other_project = Project(
            organization_id=other_org.id,
            name="Other Project",
            status="active",
            budget=100000,
        )
        db.session.add(other_project)
        db.session.commit()

        other_expense = Expense(
            organization_id=other_org.id,
            project_id=other_project.id,
            category="Permits",
            description="Municipal permit",
            amount=15000,
            expense_date=date(2026, 9, 15),
        )
        db.session.add(other_expense)
        db.session.commit()
        other_expense_id = other_expense.id

    # Attempt to delete cross-org expense
    res = client.delete(
        f"/api/expenses/{other_expense_id}",
        headers=auth_headers,
    )
    assert res.status_code == 404
    assert res.get_json()["success"] is False
