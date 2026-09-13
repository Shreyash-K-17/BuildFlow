from datetime import date

def test_worker_cannot_create_expense(client, app, project):
    from app.models import Organization, User
    from app.extensions import db

    with app.app_context():
        organization = db.session.get(Organization, 1)

        worker = User(
            organization_id=organization.id,
            username="financeworker",
            email="financeworker@test.com",
            role="worker",
            is_active=True,
        )
        worker.set_password("Worker@123")
        db.session.add(worker)
        db.session.commit()

        worker_email = worker.email

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
        "/api/expenses",
        headers={"Authorization": f"Bearer {worker_token}"},
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


def test_admin_can_update_expense(client, auth_headers, project):
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


def test_expense_project_must_belong_to_same_organization(
    client,
    auth_headers,
    project,
    app,
):
    from app.models import Organization, Project
    from app.extensions import db

    with app.app_context():
        other_org = Organization(name="Other Finance Organization")
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

    response = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": other_project_id,
            "category": "Material",
            "description": "Cross organization expense",
            "amount": 5000,
            "expense_date": "2026-09-13",
        },
    )

    assert response.status_code == 404

    data = response.get_json()
    assert data["success"] is False


def test_cannot_update_another_organizations_expense(
    client,
    auth_headers,
    project,
    app,
):
    from app.models import Organization, Project, Expense
    from app.extensions import db

    with app.app_context():
        other_org = Organization(name="Second Finance Organization")
        db.session.add(other_org)
        db.session.flush()

        other_project = Project(
            organization_id=other_org.id,
            name="Second Project",
            description="Other project",
            client_name="Other Client",
            location="Mumbai",
            status="active",
            budget=500000,
        )

        db.session.add(other_project)
        db.session.flush()

        expense = Expense(
            organization_id=other_org.id,
            project_id=other_project.id,
            category="Material",
            description="Other organization expense",
            amount=8000,
            expense_date=date(2026, 9, 13),
        )

        db.session.add(expense)
        db.session.commit()

        expense_id = expense.id

    response = client.put(
        f"/api/expenses/{expense_id}",
        headers=auth_headers,
        json={
            "description": "Unauthorized update",
            "amount": 1,
        },
    )

    assert response.status_code == 404

    data = response.get_json()
    assert data["success"] is False