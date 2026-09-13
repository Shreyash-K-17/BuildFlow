from datetime import date
from app.extensions import db
from app.models import Organization, Project, Expense, User


def test_admin_can_create_expense(
    client,
    auth_headers,
    project,
):
    response = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Material",
            "description": "Cement purchase",
            "amount": 35000,
            "expense_date": "2026-09-13",
        },
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["expense"]["project_id"] == project
    assert data["data"]["expense"]["category"] == "Material"


def test_admin_can_get_project_expenses(
    client,
    auth_headers,
    project,
):
    create_response = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Labor",
            "description": "Mason wages",
            "amount": 12000,
            "expense_date": "2026-09-13",
        },
    )

    assert create_response.status_code == 201
    expense_id = create_response.get_json()["data"]["expense"]["id"]

    response = client.get(
        f"/api/projects/{project}/expenses",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert len(data["data"]["expenses"]) >= 1
    expense_ids = [e["id"] for e in data["data"]["expenses"]]
    assert expense_id in expense_ids


def test_worker_cannot_get_project_expenses(
    client,
    auth_headers,
    worker_auth_headers,
    project,
):
    # Admin creates an expense
    client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Labor",
            "description": "Worker wage",
            "amount": 5000,
            "expense_date": "2026-09-13",
        },
    )

    # Worker attempts to view expenses -> 403
    response = client.get(
        f"/api/projects/{project}/expenses",
        headers=worker_auth_headers,
    )

    assert response.status_code == 403

    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_worker_cannot_create_expense(
    client,
    worker_auth_headers,
    project,
):
    response = client.post(
        "/api/expenses",
        headers=worker_auth_headers,
        json={
            "project_id": project,
            "category": "Material",
            "description": "Unauthorized expense",
            "amount": 5000,
            "expense_date": "2026-09-13",
        },
    )

    assert response.status_code == 403

    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_worker_cannot_update_expense(
    client,
    auth_headers,
    worker_auth_headers,
    project,
):
    create_response = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Material",
            "description": "Original expense",
            "amount": 10000,
            "expense_date": "2026-09-13",
        },
    )

    assert create_response.status_code == 201
    expense_id = create_response.get_json()["data"]["expense"]["id"]

    response = client.put(
        f"/api/expenses/{expense_id}",
        headers=worker_auth_headers,
        json={
            "description": "Worker trying to update expense",
            "amount": 20000,
        },
    )

    assert response.status_code == 403

    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_admin_can_update_expense(
    client,
    auth_headers,
    project,
):
    create_response = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Material",
            "description": "Original expense",
            "amount": 10000,
            "expense_date": "2026-09-13",
        },
    )

    assert create_response.status_code == 201
    expense_id = create_response.get_json()["data"]["expense"]["id"]

    update_response = client.put(
        f"/api/expenses/{expense_id}",
        headers=auth_headers,
        json={
            "category": "Labor",
            "description": "Updated expense",
            "amount": 15000,
        },
    )

    assert update_response.status_code == 200

    data = update_response.get_json()
    assert data["success"] is True
    assert data["data"]["expense"]["id"] == expense_id
    assert data["data"]["expense"]["category"] == "Labor"
    assert data["data"]["expense"]["description"] == "Updated expense"
    assert float(data["data"]["expense"]["amount"]) == 15000


def test_cross_organization_expense_access_is_protected(
    client,
    auth_headers,
    app,
):
    with app.app_context():
        other_org = Organization(name="Other Organization For Expenses")
        db.session.add(other_org)
        db.session.flush()

        other_project = Project(
            organization_id=other_org.id,
            name="Other Organization Project",
            description="Isolation test",
            client_name="Other Client",
            location="Mumbai",
            status="active",
            budget=500000,
        )

        db.session.add(other_project)
        db.session.commit()

        other_project_id = other_project.id

        other_expense = Expense(
            organization_id=other_org.id,
            project_id=other_project.id,
            category="Material",
            description="Other expense",
            amount=5000,
            expense_date=date(2026, 9, 13),
        )
        db.session.add(other_expense)
        db.session.commit()

        other_expense_id = other_expense.id

    # Admin 1 GET cross-org project expenses -> 404
    get_res = client.get(
        f"/api/projects/{other_project_id}/expenses",
        headers=auth_headers,
    )
    assert get_res.status_code == 404

    # Admin 1 POST expense to cross-org project -> 404
    post_res = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": other_project_id,
            "category": "Material",
            "description": "Cross org expense",
            "amount": 5000,
            "expense_date": "2026-09-13",
        },
    )
    assert post_res.status_code == 404

    # Admin 1 PUT cross-org expense -> 404
    put_res = client.put(
        f"/api/expenses/{other_expense_id}",
        headers=auth_headers,
        json={
            "description": "Cross org update",
        },
    )
    assert put_res.status_code == 404


def test_unauthenticated_cannot_access_expenses(
    client,
    project,
):
    # Unauthenticated GET -> 401
    get_res = client.get(
        f"/api/projects/{project}/expenses"
    )
    assert get_res.status_code == 401
    assert get_res.get_json()["error"]["code"] == "UNAUTHORIZED"

    # Unauthenticated POST -> 401
    post_res = client.post(
        "/api/expenses",
        json={
            "project_id": project,
            "category": "Material",
            "description": "No auth expense",
            "amount": 1000,
            "expense_date": "2026-09-13",
        },
    )
    assert post_res.status_code == 401
    assert post_res.get_json()["error"]["code"] == "UNAUTHORIZED"

    # Unauthenticated PUT -> 401
    put_res = client.put(
        "/api/expenses/1",
        json={
            "description": "No auth update",
        },
    )
    assert put_res.status_code == 401
    assert put_res.get_json()["error"]["code"] == "UNAUTHORIZED"
