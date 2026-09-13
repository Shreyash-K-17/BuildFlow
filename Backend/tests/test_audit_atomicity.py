from app.extensions import db
from app.models import (
    AuditLog,
    Attendance,
    Expense,
    Material,
    InventoryTransaction,
    Project,
    Task,
    User,
    Worker,
)


# ============================================================
# WORKER ATOMICITY REGRESSION TESTS
# ============================================================

def test_worker_create_rolls_back_when_audit_fails(
    client,
    auth_headers,
    monkeypatch,
    app,
):
    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.workers.create_audit_log",
        failing_audit_log,
    )

    response = client.post(
        "/api/workers",
        json={
            "username": "atomic_worker",
            "email": "atomic_worker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Atomic Worker",
            "phone": "9876543210",
            "worker_type": "Mason",
            "daily_wage": 850,
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        # Assert user and worker were NOT persisted
        assert User.query.filter_by(username="atomic_worker").first() is None
        assert Worker.query.filter_by(email="atomic_worker@test.com").first() is None
        # Assert no audit log was persisted
        assert AuditLog.query.filter_by(entity_type="worker").count() == 0


def test_worker_update_rolls_back_when_audit_fails(
    client,
    auth_headers,
    worker,
    monkeypatch,
    app,
):
    with app.app_context():
        original_worker = db.session.get(Worker, worker)
        original_name = original_worker.name

    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.workers.create_audit_log",
        failing_audit_log,
    )

    response = client.put(
        f"/api/workers/{worker}",
        json={
            "full_name": "Changed Name Should Rollback",
            "daily_wage": 999,
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        worker_record = db.session.get(Worker, worker)
        assert worker_record.name == original_name
        assert AuditLog.query.filter_by(entity_type="worker", action="update").count() == 0


# ============================================================
# PROJECT ATOMICITY REGRESSION TESTS
# ============================================================

def test_project_create_rolls_back_when_audit_fails(
    client,
    auth_headers,
    monkeypatch,
    app,
):
    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.projects.create_audit_log",
        failing_audit_log,
    )

    response = client.post(
        "/api/projects",
        json={
            "name": "Atomic Rollback Project",
            "budget": 5000000,
            "status": "planning",
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        assert Project.query.filter_by(name="Atomic Rollback Project").first() is None
        assert AuditLog.query.filter_by(entity_type="project").count() == 0


def test_project_update_rolls_back_when_audit_fails(
    client,
    auth_headers,
    project,
    monkeypatch,
    app,
):
    with app.app_context():
        original_project = db.session.get(Project, project)
        original_name = original_project.name

    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.projects.create_audit_log",
        failing_audit_log,
    )

    response = client.put(
        f"/api/projects/{project}",
        json={
            "name": "Should Rollback Project Name",
            "budget": 9999999,
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        project_record = db.session.get(Project, project)
        assert project_record.name == original_name
        assert AuditLog.query.filter_by(entity_type="project", action="update").count() == 0


# ============================================================
# TASK ATOMICITY REGRESSION TESTS
# ============================================================

def test_task_create_rolls_back_when_audit_fails(
    client,
    auth_headers,
    phase,
    monkeypatch,
    app,
):
    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.tasks.create_audit_log",
        failing_audit_log,
    )

    response = client.post(
        f"/api/phases/{phase}/tasks",
        json={
            "title": "Atomic Task Rollback",
            "priority": "high",
            "status": "not_started",
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        assert Task.query.filter_by(title="Atomic Task Rollback").first() is None
        assert AuditLog.query.filter_by(entity_type="task").count() == 0


def test_task_update_rolls_back_when_audit_fails(
    client,
    auth_headers,
    task,
    monkeypatch,
    app,
):
    with app.app_context():
        original_task = db.session.get(Task, task)
        original_title = original_task.title

    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.tasks.create_audit_log",
        failing_audit_log,
    )

    response = client.put(
        f"/api/tasks/{task}",
        json={
            "title": "Should Rollback Task Title",
            "priority": "low",
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        task_record = db.session.get(Task, task)
        assert task_record.title == original_title
        assert AuditLog.query.filter_by(entity_type="task", action="update").count() == 0


# ============================================================
# ATTENDANCE ATOMICITY REGRESSION TESTS
# ============================================================

def test_attendance_create_rolls_back_when_audit_fails(
    client,
    auth_headers,
    project,
    worker,
    monkeypatch,
    app,
):
    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.attendance.create_audit_log",
        failing_audit_log,
    )

    response = client.post(
        "/api/attendance",
        json={
            "worker_id": worker,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
            "notes": "Atomic Attendance Note",
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        assert Attendance.query.filter_by(notes="Atomic Attendance Note").first() is None
        assert AuditLog.query.filter_by(entity_type="attendance").count() == 0


def test_attendance_update_rolls_back_when_audit_fails(
    client,
    auth_headers,
    project,
    worker,
    monkeypatch,
    app,
):
    create_response = client.post(
        "/api/attendance",
        json={
            "worker_id": worker,
            "project_id": project,
            "attendance_date": "2026-09-13",
            "status": "present",
            "notes": "Original Note",
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    attendance_id = create_response.get_json()["data"]["attendance"]["id"]

    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.attendance.create_audit_log",
        failing_audit_log,
    )

    response = client.put(
        f"/api/attendance/{attendance_id}",
        json={
            "notes": "Updated Note Should Rollback",
            "status": "absent",
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        record = db.session.get(Attendance, attendance_id)
        assert record.notes == "Original Note"
        assert record.status == "present"
        assert AuditLog.query.filter_by(entity_type="attendance", action="update").count() == 0


# ============================================================
# INVENTORY ATOMICITY REGRESSION TESTS
# ============================================================

def test_material_create_rolls_back_when_audit_fails(
    client,
    auth_headers,
    monkeypatch,
    app,
):
    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.inventory.create_audit_log",
        failing_audit_log,
    )

    response = client.post(
        "/api/materials",
        json={
            "name": "Atomic Steel",
            "unit": "kg",
            "current_stock": 500,
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        assert Material.query.filter_by(name="Atomic Steel").first() is None
        assert AuditLog.query.filter_by(entity_type="material").count() == 0


def test_inventory_transaction_rolls_back_stock_and_record_when_audit_fails(
    client,
    auth_headers,
    material,
    monkeypatch,
    app,
):
    with app.app_context():
        original_material = db.session.get(Material, material)
        initial_stock = original_material.current_stock

    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.inventory.create_audit_log",
        failing_audit_log,
    )

    response = client.post(
        "/api/inventory/transactions",
        json={
            "material_id": material,
            "transaction_type": "consumption",
            "quantity": 30,
            "notes": "Should rollback consumption",
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        mat = db.session.get(Material, material)
        # Material stock must NOT have been deducted
        assert mat.current_stock == initial_stock
        # InventoryTransaction record must NOT have been persisted
        assert InventoryTransaction.query.filter_by(material_id=material).count() == 0
        # No audit log persisted
        assert AuditLog.query.filter_by(entity_type="inventory_transaction").count() == 0


# ============================================================
# EXPENSE ATOMICITY REGRESSION TESTS
# ============================================================

def test_expense_create_rolls_back_when_audit_fails(
    client,
    auth_headers,
    project,
    monkeypatch,
    app,
):
    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.expenses.create_audit_log",
        failing_audit_log,
    )

    response = client.post(
        "/api/expenses",
        json={
            "project_id": project,
            "category": "Equipment",
            "description": "Atomic Expense Rollback",
            "amount": 75000,
            "expense_date": "2026-09-13",
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        assert Expense.query.filter_by(description="Atomic Expense Rollback").first() is None
        assert AuditLog.query.filter_by(entity_type="expense").count() == 0


def test_expense_update_rolls_back_when_audit_fails(
    client,
    auth_headers,
    project,
    monkeypatch,
    app,
):
    create_response = client.post(
        "/api/expenses",
        json={
            "project_id": project,
            "category": "Equipment",
            "description": "Original Expense",
            "amount": 25000,
            "expense_date": "2026-09-13",
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    expense_id = create_response.get_json()["data"]["expense"]["id"]

    def failing_audit_log(*args, **kwargs):
        raise RuntimeError("Simulated audit log failure")

    monkeypatch.setattr(
        "app.routes.expenses.create_audit_log",
        failing_audit_log,
    )

    response = client.put(
        f"/api/expenses/{expense_id}",
        json={
            "description": "Updated Description Should Rollback",
            "amount": 90000,
        },
        headers=auth_headers,
    )

    assert response.status_code == 500

    with app.app_context():
        record = db.session.get(Expense, expense_id)
        assert record.description == "Original Expense"
        assert record.amount == 25000
        assert AuditLog.query.filter_by(entity_type="expense", action="update").count() == 0
