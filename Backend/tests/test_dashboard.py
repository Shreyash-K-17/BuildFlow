def test_admin_can_access_dashboard(client, auth_headers):
    response = client.get(
        "/api/dashboard",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert "projects" in data["data"]
    assert "tasks" in data["data"]
    assert "workforce" in data["data"]
    assert "materials" in data["data"]
    assert "finance" in data["data"]


def test_dashboard_contains_project_statistics(client, auth_headers):
    response = client.get(
        "/api/dashboard",
        headers=auth_headers,
    )

    assert response.status_code == 200

    dashboard = response.get_json()["data"]

    assert "projects" in dashboard

    projects = dashboard["projects"]

    assert "total" in projects
    assert "active" in projects
    assert "completed" in projects
    assert "on_hold" in projects


def test_dashboard_contains_task_statistics(client, auth_headers):
    response = client.get(
        "/api/dashboard",
        headers=auth_headers,
    )

    assert response.status_code == 200

    dashboard = response.get_json()["data"]

    assert "tasks" in dashboard

    tasks = dashboard["tasks"]

    assert "total" in tasks
    assert "completed" in tasks
    assert "in_progress" in tasks
    assert "blocked" in tasks
    assert "average_progress" in tasks


def test_dashboard_contains_workforce_statistics(client, auth_headers):
    response = client.get(
        "/api/dashboard",
        headers=auth_headers,
    )

    assert response.status_code == 200

    dashboard = response.get_json()["data"]

    assert "workforce" in dashboard

    workforce = dashboard["workforce"]

    assert "active_workers" in workforce
    assert "attendance" in workforce

    attendance = workforce["attendance"]

    assert "present" in attendance
    assert "absent" in attendance
    assert "half_day" in attendance
    assert "leave" in attendance

def test_dashboard_contains_material_statistics(client, auth_headers):
    response = client.get(
        "/api/dashboard",
        headers=auth_headers,
    )

    assert response.status_code == 200

    dashboard = response.get_json()["data"]

    assert "materials" in dashboard

    materials = dashboard["materials"]

    assert "total_active" in materials
    assert "low_stock_count" in materials
    assert "low_stock_materials" in materials


def test_dashboard_contains_finance_statistics(client, auth_headers):
    response = client.get(
        "/api/dashboard",
        headers=auth_headers,
    )

    assert response.status_code == 200

    dashboard = response.get_json()["data"]

    assert "finance" in dashboard

    finance = dashboard["finance"]

    assert "total_expenses" in finance
    assert "remaining_budget" in finance
    assert "budget_utilization" in finance


def test_unauthenticated_cannot_access_dashboard(client):
    response = client.get("/api/dashboard")

    assert response.status_code == 401

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_worker_cannot_access_admin_dashboard(client, app):
    from app.models import Organization, User
    from app.extensions import db

    with app.app_context():
        organization = Organization(
            name="Dashboard Worker Organization"
        )

        db.session.add(organization)
        db.session.flush()

        worker = User(
            organization_id=organization.id,
            username="dashboardworker",
            email="dashboardworker@test.com",
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

    response = client.get(
        "/api/dashboard",
        headers={
            "Authorization": f"Bearer {worker_token}"
        },
    )

    assert response.status_code == 403

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_dashboard_contains_all_project_statuses(
    client,
    auth_headers,
):
    response = client.get(
        "/api/dashboard",
        headers=auth_headers,
    )

    assert response.status_code == 200

    projects = (
        response
        .get_json()["data"]["projects"]
    )

    assert projects["total"] == 0
    assert projects["planning"] == 0
    assert projects["active"] == 0
    assert projects["on_hold"] == 0
    assert projects["completed"] == 0
    assert projects["cancelled"] == 0
    assert projects["total_budget"] == "0.00"


def test_dashboard_contains_all_task_statuses(
    client,
    auth_headers,
):
    response = client.get(
        "/api/dashboard",
        headers=auth_headers,
    )

    assert response.status_code == 200

    tasks = (
        response
        .get_json()["data"]["tasks"]
    )

    assert tasks["total"] == 0
    assert tasks["not_started"] == 0
    assert tasks["in_progress"] == 0
    assert tasks["blocked"] == 0
    assert tasks["on_hold"] == 0
    assert tasks["completed"] == 0
    assert tasks["average_progress"] == 0.0


def test_dashboard_finance_contains_budget_metrics(
    client,
    auth_headers,
):
    response = client.get(
        "/api/dashboard",
        headers=auth_headers,
    )

    assert response.status_code == 200

    finance = (
        response
        .get_json()["data"]["finance"]
    )

    assert finance["total_budget"] == "0.00"
    assert finance["total_expenses"] == "0.00"
    assert finance["remaining_budget"] == "0.00"
    assert finance["budget_utilization"] == 0