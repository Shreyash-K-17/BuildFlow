from datetime import date
from decimal import Decimal
from sqlalchemy import event

from app.extensions import db
from app.models import Organization, Project, Expense, User
from app.services.expense_service import get_paginated_project_expenses


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
    assert "pagination" in data["data"]
    assert data["data"]["pagination"]["page"] == 1
    assert data["data"]["pagination"]["per_page"] == 25


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


# ============================================================
# PAGINATION REGRESSION TESTS
# ============================================================

def test_expenses_default_pagination(client, auth_headers, project, app):
    with app.app_context():
        # Create 30 expenses
        for i in range(30):
            e = Expense(
                organization_id=1,
                project_id=project,
                category="Material",
                description=f"Expense {i+1}",
                amount=Decimal("100.00"),
                expense_date=date(2026, 9, 1 + (i % 28)),
            )
            db.session.add(e)
        db.session.commit()

    response = client.get(
        f"/api/projects/{project}/expenses",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]

    assert len(data["expenses"]) == 25
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["per_page"] == 25
    assert data["pagination"]["total"] == 30
    assert data["pagination"]["pages"] == 2
    assert float(data["total_expenses"]) == 3000.00


def test_expenses_custom_pagination(client, auth_headers, project, app):
    with app.app_context():
        for i in range(25):
            e = Expense(
                organization_id=1,
                project_id=project,
                category="Labor",
                description=f"Expense {i+1:02d}",
                amount=Decimal("50.00"),
                expense_date=date(2026, 9, 1 + (i % 28)),
            )
            db.session.add(e)
        db.session.commit()

    response = client.get(
        f"/api/projects/{project}/expenses?page=2&per_page=10",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]

    assert len(data["expenses"]) == 10
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["per_page"] == 10
    assert data["pagination"]["total"] == 25
    assert data["pagination"]["pages"] == 3
    assert float(data["total_expenses"]) == 1250.00


def test_expenses_max_per_page(client, auth_headers, project):
    response = client.get(
        f"/api/projects/{project}/expenses?page=1&per_page=100",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["pagination"]["per_page"] == 100


def test_expenses_over_max_per_page_returns_400(client, auth_headers, project):
    response = client.get(
        f"/api/projects/{project}/expenses?per_page=101",
        headers=auth_headers,
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_expenses_invalid_pagination_parameters(client, auth_headers, project):
    # page=0
    res = client.get(
        f"/api/projects/{project}/expenses?page=0",
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "VALIDATION_ERROR"

    # per_page=0
    res = client.get(
        f"/api/projects/{project}/expenses?per_page=0",
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "VALIDATION_ERROR"

    # non-numeric page
    res = client.get(
        f"/api/projects/{project}/expenses?page=abc",
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "VALIDATION_ERROR"


def test_expenses_page_beyond_last_page(client, auth_headers, project, app):
    with app.app_context():
        e = Expense(
            organization_id=1,
            project_id=project,
            category="Material",
            description="Only Expense",
            amount=Decimal("150.00"),
            expense_date=date(2026, 9, 10),
        )
        db.session.add(e)
        db.session.commit()

    response = client.get(
        f"/api/projects/{project}/expenses?page=5&per_page=10",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["expenses"] == []
    assert data["pagination"]["page"] == 5
    assert data["pagination"]["total"] == 1
    assert data["pagination"]["pages"] == 1
    assert float(data["total_expenses"]) == 150.00


def test_expenses_empty_project(client, auth_headers, project):
    response = client.get(
        f"/api/projects/{project}/expenses",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["expenses"] == []
    assert data["pagination"]["total"] == 0
    assert data["pagination"]["pages"] == 0
    assert float(data["total_expenses"]) == 0.0


def test_expenses_deterministic_ordering(client, auth_headers, project, app):
    with app.app_context():
        e1 = Expense(
            organization_id=1,
            project_id=project,
            category="Material",
            description="Old Expense",
            amount=Decimal("100.00"),
            expense_date=date(2026, 9, 1),
        )
        e2 = Expense(
            organization_id=1,
            project_id=project,
            category="Labor",
            description="New Expense 1",
            amount=Decimal("200.00"),
            expense_date=date(2026, 9, 15),
        )
        e3 = Expense(
            organization_id=1,
            project_id=project,
            category="Equipment",
            description="New Expense 2",
            amount=Decimal("300.00"),
            expense_date=date(2026, 9, 15),
        )
        db.session.add_all([e1, e2, e3])
        db.session.commit()

        e1_id = e1.id
        e2_id = e2.id
        e3_id = e3.id

    response = client.get(
        f"/api/projects/{project}/expenses",
        headers=auth_headers,
    )
    assert response.status_code == 200
    expenses = response.get_json()["data"]["expenses"]

    # Expect: date 2026-09-15 with higher id (e3), then date 2026-09-15 with lower id (e2), then 2026-09-01 (e1)
    assert [e["id"] for e in expenses] == [e3_id, e2_id, e1_id]


def test_expenses_sql_pagination_used(app, project):
    with app.app_context():
        queries = []

        def statement_listener(conn, cursor, statement, parameters, context, executemany):
            queries.append(statement.upper())

        event.listen(db.engine, "before_cursor_execute", statement_listener)
        try:
            expenses, total_amount, pagination = get_paginated_project_expenses(
                project_id=project,
                page=2,
                per_page=10,
            )
            # Verify SQL contains LIMIT and OFFSET
            select_queries = [q for q in queries if "LIMIT" in q and "OFFSET" in q]
            assert len(select_queries) >= 1
        finally:
            event.remove(db.engine, "before_cursor_execute", statement_listener)
