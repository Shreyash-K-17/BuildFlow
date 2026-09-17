from app.models import AuditLog


def test_create_dependency_creates_audit_log(client, auth_headers, phase):
    # Create two tasks
    task1_res = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Foundation Pouring",
            "priority": "high",
        },
    )
    task1_id = task1_res.get_json()["data"]["task"]["id"]

    task2_res = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Curing",
            "priority": "medium",
        },
    )
    task2_id = task2_res.get_json()["data"]["task"]["id"]

    # task2 depends on task1
    dep_res = client.post(
        f"/api/tasks/{task2_id}/dependencies",
        headers=auth_headers,
        json={"depends_on_task_id": task1_id},
    )
    assert dep_res.status_code == 201
    dep_id = dep_res.get_json()["data"]["dependency"]["id"]

    audit = AuditLog.query.filter_by(
        entity_type="task_dependency",
        entity_id=dep_id,
        action="create",
    ).first()
    assert audit is not None
    assert audit.new_values["task_id"] == task2_id
    assert audit.new_values["depends_on_task_id"] == task1_id
    assert audit.old_values is None


def test_delete_dependency_creates_audit_log(client, auth_headers, phase):
    task1_res = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={"title": "Excavation", "priority": "high"},
    )
    task1_id = task1_res.get_json()["data"]["task"]["id"]

    task2_res = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={"title": "Footing", "priority": "high"},
    )
    task2_id = task2_res.get_json()["data"]["task"]["id"]

    dep_res = client.post(
        f"/api/tasks/{task2_id}/dependencies",
        headers=auth_headers,
        json={"depends_on_task_id": task1_id},
    )
    assert dep_res.status_code == 201
    dep_id = dep_res.get_json()["data"]["dependency"]["id"]

    del_res = client.delete(
        f"/api/tasks/{task2_id}/dependencies/{dep_id}",
        headers=auth_headers,
    )
    assert del_res.status_code == 200

    audit = (
        AuditLog.query.filter_by(
            entity_type="task_dependency",
            entity_id=dep_id,
            action="delete",
        )
        .order_by(AuditLog.id.desc())
        .first()
    )
    assert audit is not None
    assert audit.old_values["task_id"] == task2_id
    assert audit.old_values["depends_on_task_id"] == task1_id
    assert audit.new_values is None
