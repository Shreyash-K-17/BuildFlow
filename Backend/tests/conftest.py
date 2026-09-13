import os

os.environ["SECRET_KEY"] = (
    "test-secret-key-for-buildflow-pytest-32-bytes"
)
os.environ["DATABASE_URL"] = (
    "sqlite+pysqlite:///:memory:"
)
os.environ["CORS_ORIGINS"] = (
    "http://localhost:3000"
)


import pytest

from app import create_app
from app.extensions import db
from app.models import (
    Organization,
    User,
    Project,
    ProjectPhase,
    Task,
    Material,
    Worker,
)


# ============================================================
# APP FIXTURE
# ============================================================

@pytest.fixture
def app():
    app = create_app()

    app.config.update(
        TESTING=True,
    )

    with app.app_context():
        db.create_all()

    yield app

    with app.app_context():
        db.session.remove()
        db.drop_all()


# ============================================================
# CLIENT FIXTURE
# ============================================================

@pytest.fixture
def client(app):
    return app.test_client()


# ============================================================
# ADMIN USER
# ============================================================

@pytest.fixture
def admin_user(app):
    with app.app_context():
        organization = Organization(
            name="Test Construction Organization"
        )

        db.session.add(organization)
        db.session.flush()

        user = User(
            organization_id=organization.id,
            username="testadmin",
            email="testadmin@test.com",
            role="admin",
            is_active=True,
        )

        user.set_password("Admin@123")

        db.session.add(user)
        db.session.commit()

        return {
            "user_id": user.id,
            "organization_id": organization.id,
            "email": user.email,
            "password": "Admin@123",
        }


# ============================================================
# ADMIN TOKEN
# ============================================================

@pytest.fixture
def admin_token(client, admin_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": admin_user["email"],
            "password": admin_user["password"],
        },
    )

    assert response.status_code == 200

    data = response.get_json()

    return data["data"]["access_token"]


# ============================================================
# ADMIN AUTH HEADERS
# ============================================================

@pytest.fixture
def auth_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}"
    }


# ============================================================
# WORKER USER
# Real login account for worker authorization tests
# ============================================================

@pytest.fixture
def worker_user(app, admin_user):
    with app.app_context():
        user = User(
            organization_id=admin_user["organization_id"],
            username="testworker",
            email="worker@test.com",
            role="worker",
            is_active=True,
        )

        user.set_password("Worker@123")

        db.session.add(user)
        db.session.commit()

        return {
            "user_id": user.id,
            "organization_id": user.organization_id,
            "email": user.email,
            "password": "Worker@123",
        }


# ============================================================
# WORKER TOKEN
# ============================================================

@pytest.fixture
def worker_token(client, worker_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": worker_user["email"],
            "password": worker_user["password"],
        },
    )

    assert response.status_code == 200

    data = response.get_json()

    return data["data"]["access_token"]


# ============================================================
# WORKER AUTH HEADERS
# ============================================================

@pytest.fixture
def worker_auth_headers(worker_token):
    return {
        "Authorization": f"Bearer {worker_token}"
    }


# ============================================================
# PROJECT
# ============================================================

@pytest.fixture
def project(app, admin_user):
    with app.app_context():
        project = Project(
            organization_id=admin_user["organization_id"],
            name="Test Construction Project",
            description="Automated test project",
            client_name="Test Client",
            location="Mumbai",
            status="active",
            budget=1000000,
        )

        db.session.add(project)
        db.session.commit()

        return project.id


# ============================================================
# WORKER
# Worker profile linked to real worker User account
# ============================================================

@pytest.fixture
def worker(app, worker_user):
    with app.app_context():
        worker = Worker(
            organization_id=worker_user["organization_id"],
            user_id=worker_user["user_id"],
            name="Test Worker",
            phone="9876543210",
            email=worker_user["email"],
            worker_type="Mason",
            daily_wage=800,
            is_active=True,
        )

        db.session.add(worker)
        db.session.commit()

        return worker.id


# ============================================================
# PROJECT PHASE
# ============================================================

@pytest.fixture
def phase(app, project):
    with app.app_context():
        phase = ProjectPhase(
            project_id=project,
            name="Foundation Phase",
            description="Foundation and site preparation",
            phase_order=1,
        )

        db.session.add(phase)
        db.session.commit()

        return phase.id


# ============================================================
# TASK
# ============================================================

@pytest.fixture
def task(app, phase):
    with app.app_context():
        task = Task(
            phase_id=phase,
            title="Excavation Work",
            description="Excavation for foundation",
            status="not_started",
            progress=0,
            priority="high",
        )

        db.session.add(task)
        db.session.commit()

        return task.id


# ============================================================
# MATERIAL
# ============================================================

@pytest.fixture
def material(app, admin_user):
    with app.app_context():
        material = Material(
            organization_id=admin_user["organization_id"],
            name="Cement",
            category="Construction",
            unit="bags",
            current_stock=100,
            minimum_stock=20,
            unit_cost=420,
            supplier_name="Test Supplier",
            is_active=True,
        )

        db.session.add(material)
        db.session.commit()

        return material.id