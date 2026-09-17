from datetime import date
from decimal import Decimal

from sqlalchemy import event

from app.extensions import db
from app.models import (
    Attendance,
    Expense,
    Material,
    Organization,
    Project,
    ProjectPhase,
    Task,
    User,
    Worker,
)
from app.services.dashboard_service import get_dashboard_data


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


def test_dashboard_service_executes_exactly_6_queries(app, admin_user):
    with app.app_context():
        queries = []

        def statement_listener(conn, cursor, statement, parameters, context, executemany):
            queries.append(statement)

        event.listen(db.engine, "before_cursor_execute", statement_listener)
        try:
            data = get_dashboard_data(admin_user["organization_id"])
            assert len(queries) == 6
            assert "projects" in data
            assert "tasks" in data
            assert "workforce" in data
            assert "materials" in data
            assert "finance" in data
        finally:
            event.remove(db.engine, "before_cursor_execute", statement_listener)


def test_dashboard_http_request_query_count(client, auth_headers, app):
    with app.app_context():
        queries = []

        def statement_listener(conn, cursor, statement, parameters, context, executemany):
            queries.append(statement)

        event.listen(db.engine, "before_cursor_execute", statement_listener)
        try:
            response = client.get("/api/dashboard", headers=auth_headers)
            assert response.status_code == 200
            # 1 auth user query + 6 dashboard service queries = 7 queries
            assert len(queries) == 7
        finally:
            event.remove(db.engine, "before_cursor_execute", statement_listener)


def test_dashboard_populated_organization_metrics(client, app):
    with app.app_context():
        org = Organization(name="Populated Dashboard Org")
        db.session.add(org)
        db.session.flush()

        admin = User(
            organization_id=org.id,
            username="popadmin",
            email="popadmin@test.com",
            role="admin",
            is_active=True,
        )
        admin.set_password("Admin@123")
        db.session.add(admin)

        p1 = Project(organization_id=org.id, name="P1", status="planning", budget=Decimal("10000.00"))
        p2 = Project(organization_id=org.id, name="P2", status="active", budget=Decimal("25000.00"))
        p3 = Project(organization_id=org.id, name="P3", status="completed", budget=Decimal("15000.00"))
        db.session.add_all([p1, p2, p3])
        db.session.flush()

        phase1 = ProjectPhase(project_id=p2.id, name="Phase 1", phase_order=1)
        db.session.add(phase1)
        db.session.flush()

        t1 = Task(phase_id=phase1.id, title="T1", status="not_started", progress=0)
        t2 = Task(phase_id=phase1.id, title="T2", status="in_progress", progress=50)
        t3 = Task(phase_id=phase1.id, title="T3", status="completed", progress=100)
        db.session.add_all([t1, t2, t3])

        w1 = Worker(organization_id=org.id, name="W1", is_active=True)
        w2 = Worker(organization_id=org.id, name="W2", is_active=False)
        db.session.add_all([w1, w2])
        db.session.flush()

        a1 = Attendance(worker_id=w1.id, project_id=p2.id, attendance_date=date(2026, 1, 1), status="present")
        a2 = Attendance(worker_id=w1.id, project_id=p2.id, attendance_date=date(2026, 1, 2), status="half_day")
        db.session.add_all([a1, a2])

        m1 = Material(organization_id=org.id, name="Cement", unit="bags", current_stock=Decimal("5"), minimum_stock=Decimal("10"), is_active=True)
        m2 = Material(organization_id=org.id, name="Steel", unit="tons", current_stock=Decimal("20"), minimum_stock=Decimal("10"), is_active=True)
        m3 = Material(organization_id=org.id, name="Inactive Material", unit="kg", current_stock=Decimal("0"), minimum_stock=Decimal("10"), is_active=False)
        db.session.add_all([m1, m2, m3])

        e1 = Expense(organization_id=org.id, project_id=p2.id, category="Materials", description="Cement purchase", amount=Decimal("5000.00"), expense_date=date(2026, 1, 1))
        e2 = Expense(organization_id=org.id, project_id=p2.id, category="Labor", description="Daily wages", amount=Decimal("2500.00"), expense_date=date(2026, 1, 2))
        db.session.add_all([e1, e2])
        db.session.commit()

        admin_email = admin.email

    login = client.post("/api/auth/login", json={"email": admin_email, "password": "Admin@123"})
    token = login.get_json()["data"]["access_token"]

    response = client.get("/api/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.get_json()["data"]

    # Verify Projects
    assert data["projects"]["total"] == 3
    assert data["projects"]["planning"] == 1
    assert data["projects"]["active"] == 1
    assert data["projects"]["completed"] == 1
    assert data["projects"]["on_hold"] == 0
    assert data["projects"]["cancelled"] == 0
    assert float(data["projects"]["total_budget"]) == 50000.00

    # Verify Tasks
    assert data["tasks"]["total"] == 3
    assert data["tasks"]["not_started"] == 1
    assert data["tasks"]["in_progress"] == 1
    assert data["tasks"]["completed"] == 1
    assert data["tasks"]["blocked"] == 0
    assert data["tasks"]["on_hold"] == 0
    assert data["tasks"]["average_progress"] == 50.0

    # Verify Workforce
    assert data["workforce"]["active_workers"] == 1
    assert data["workforce"]["attendance"]["present"] == 1
    assert data["workforce"]["attendance"]["half_day"] == 1
    assert data["workforce"]["attendance"]["absent"] == 0
    assert data["workforce"]["attendance"]["leave"] == 0

    # Verify Materials
    assert data["materials"]["total_active"] == 2
    assert data["materials"]["low_stock_count"] == 1
    assert len(data["materials"]["low_stock_materials"]) == 1
    assert data["materials"]["low_stock_materials"][0]["name"] == "Cement"
    assert data["materials"]["low_stock_materials"][0]["current_stock"] == "5.000"
    assert data["materials"]["low_stock_materials"][0]["minimum_stock"] == "10.000"
    assert data["materials"]["low_stock_materials"][0]["unit"] == "bags"

    # Verify Finance
    assert float(data["finance"]["total_budget"]) == 50000.00
    assert float(data["finance"]["total_expenses"]) == 7500.00
    assert float(data["finance"]["remaining_budget"]) == 42500.00
    assert data["finance"]["budget_utilization"] == 15.0


def test_dashboard_organization_isolation(client, app, auth_headers):
    with app.app_context():
        other_org = Organization(name="Other Dashboard Org")
        db.session.add(other_org)
        db.session.flush()

        p = Project(organization_id=other_org.id, name="Other Project", status="active", budget=Decimal("100000.00"))
        db.session.add(p)
        db.session.flush()

        ph = ProjectPhase(project_id=p.id, name="Other Phase", phase_order=1)
        db.session.add(ph)
        db.session.flush()

        t = Task(phase_id=ph.id, title="Other Task", status="completed", progress=100)
        w = Worker(organization_id=other_org.id, name="Other Worker", is_active=True)
        m = Material(organization_id=other_org.id, name="Other Material", unit="kg", current_stock=Decimal("1"), minimum_stock=Decimal("5"), is_active=True)
        e = Expense(organization_id=other_org.id, project_id=p.id, category="Other", description="Other Exp", amount=Decimal("9999.00"), expense_date=date(2026, 1, 1))
        db.session.add_all([t, w, m, e])
        db.session.commit()

    response = client.get("/api/dashboard", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()["data"]

    assert data["projects"]["total"] == 0
    assert data["tasks"]["total"] == 0
    assert data["workforce"]["active_workers"] == 0
    assert data["materials"]["total_active"] == 0
    assert data["materials"]["low_stock_count"] == 0
    assert float(data["finance"]["total_expenses"]) == 0.0