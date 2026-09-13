def test_create_task_dependency(client, auth_headers, phase):
    # Create Task A
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Excavation",
            "description": "Excavation work",
            "status": "not_started",
            "progress": 0,
            "priority": "high",
        },
    )

    assert response.status_code == 201

    task_a = response.get_json()["data"]["task"]["id"]

    # Create Task B
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Foundation",
            "description": "Foundation work",
            "status": "not_started",
            "progress": 0,
            "priority": "high",
        },
    )

    assert response.status_code == 201

    task_b = response.get_json()["data"]["task"]["id"]

    # B depends on A
    response = client.post(
        f"/api/tasks/{task_b}/dependencies",
        headers=auth_headers,
        json={
            "depends_on_task_id": task_a,
        },
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["success"] is True


def test_self_dependency_rejected(client, auth_headers, task):
    response = client.post(
        f"/api/tasks/{task}/dependencies",
        headers=auth_headers,
        json={
            "depends_on_task_id": task,
        },
    )

    assert response.status_code == 409

    data = response.get_json()

    assert data["success"] is False


def test_duplicate_dependency_rejected(client, auth_headers, phase):
    # Create Task A
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Task A",
            "status": "not_started",
            "progress": 0,
            "priority": "medium",
        },
    )

    assert response.status_code == 201

    task_a = response.get_json()["data"]["task"]["id"]

    # Create Task B
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Task B",
            "status": "not_started",
            "progress": 0,
            "priority": "medium",
        },
    )

    assert response.status_code == 201

    task_b = response.get_json()["data"]["task"]["id"]

    dependency = {
        "depends_on_task_id": task_a,
    }

    # First dependency
    response = client.post(
        f"/api/tasks/{task_b}/dependencies",
        headers=auth_headers,
        json=dependency,
    )

    assert response.status_code == 201

    # Duplicate dependency
    response = client.post(
        f"/api/tasks/{task_b}/dependencies",
        headers=auth_headers,
        json=dependency,
    )

    assert response.status_code == 409


def test_incomplete_dependency_blocks_task(
    client,
    auth_headers,
    phase,
):
    # Task A
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Excavation",
            "status": "in_progress",
            "progress": 50,
            "priority": "high",
        },
    )

    assert response.status_code == 201

    task_a = response.get_json()["data"]["task"]["id"]

    # Task B
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Foundation",
            "status": "not_started",
            "progress": 0,
            "priority": "high",
        },
    )

    assert response.status_code == 201

    task_b = response.get_json()["data"]["task"]["id"]

    # B depends on A
    response = client.post(
        f"/api/tasks/{task_b}/dependencies",
        headers=auth_headers,
        json={
            "depends_on_task_id": task_a,
        },
    )

    assert response.status_code == 201

    # Try starting B
    response = client.put(
        f"/api/tasks/{task_b}",
        headers=auth_headers,
        json={
            "status": "in_progress",
            "progress": 10,
        },
    )

    assert response.status_code == 409

    data = response.get_json()

    assert data["success"] is False


def test_completed_dependency_allows_task_start(
    client,
    auth_headers,
    phase,
):
    # Task A
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Excavation",
            "status": "completed",
            "progress": 100,
            "priority": "high",
        },
    )

    assert response.status_code == 201

    task_a = response.get_json()["data"]["task"]["id"]

    # Task B
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Foundation",
            "status": "not_started",
            "progress": 0,
            "priority": "high",
        },
    )

    assert response.status_code == 201

    task_b = response.get_json()["data"]["task"]["id"]

    # B depends on A
    response = client.post(
        f"/api/tasks/{task_b}/dependencies",
        headers=auth_headers,
        json={
            "depends_on_task_id": task_a,
        },
    )

    assert response.status_code == 201

    # Now B should be allowed to start
    response = client.put(
        f"/api/tasks/{task_b}",
        headers=auth_headers,
        json={
            "status": "in_progress",
            "progress": 10,
        },
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True


def test_circular_dependency_rejected(client, auth_headers, phase):
    # Create Task A
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Task A",
            "status": "not_started",
            "progress": 0,
            "priority": "medium",
        },
    )

    assert response.status_code == 201
    task_a = response.get_json()["data"]["task"]["id"]

    # Create Task B
    response = client.post(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
        json={
            "title": "Task B",
            "status": "not_started",
            "progress": 0,
            "priority": "medium",
        },
    )

    assert response.status_code == 201
    task_b = response.get_json()["data"]["task"]["id"]

    # A depends on B
    response = client.post(
        f"/api/tasks/{task_a}/dependencies",
        headers=auth_headers,
        json={
            "depends_on_task_id": task_b,
        },
    )

    assert response.status_code == 201

    # B depends on A → circular dependency
    response = client.post(
        f"/api/tasks/{task_b}/dependencies",
        headers=auth_headers,
        json={
            "depends_on_task_id": task_a,
        },
    )

    assert response.status_code == 409

    data = response.get_json()

    assert data["success"] is False


def test_cross_project_dependency_rejected(
    client,
    auth_headers,
):
    # ---------------------------------------------------------
    # Project 1
    # ---------------------------------------------------------
    response = client.post(
        "/api/projects",
        headers=auth_headers,
        json={
            "name": "Project One",
            "status": "active",
            "budget": 500000,
        },
    )

    assert response.status_code == 201

    project1 = response.get_json()["data"]["project"]["id"]

    # Phase in Project 1
    response = client.post(
        f"/api/projects/{project1}/phases",
        headers=auth_headers,
        json={
            "name": "Phase One",
            "phase_order": 1,
        },
    )

    assert response.status_code == 201

    phase1 = response.get_json()["data"]["phase"]["id"]

    # Task in Project 1
    response = client.post(
        f"/api/phases/{phase1}/tasks",
        headers=auth_headers,
        json={
            "title": "Project One Task",
            "status": "not_started",
            "progress": 0,
            "priority": "medium",
        },
    )

    assert response.status_code == 201

    task1 = response.get_json()["data"]["task"]["id"]

    # ---------------------------------------------------------
    # Project 2
    # ---------------------------------------------------------
    response = client.post(
        "/api/projects",
        headers=auth_headers,
        json={
            "name": "Project Two",
            "status": "active",
            "budget": 500000,
        },
    )

    assert response.status_code == 201

    project2 = response.get_json()["data"]["project"]["id"]

    # Phase in Project 2
    response = client.post(
        f"/api/projects/{project2}/phases",
        headers=auth_headers,
        json={
            "name": "Phase Two",
            "phase_order": 1,
        },
    )

    assert response.status_code == 201

    phase2 = response.get_json()["data"]["phase"]["id"]

    # Task in Project 2
    response = client.post(
        f"/api/phases/{phase2}/tasks",
        headers=auth_headers,
        json={
            "title": "Project Two Task",
            "status": "not_started",
            "progress": 0,
            "priority": "medium",
        },
    )

    assert response.status_code == 201

    task2 = response.get_json()["data"]["task"]["id"]

    # Project 2 task cannot depend on Project 1 task
    response = client.post(
        f"/api/tasks/{task2}/dependencies",
        headers=auth_headers,
        json={
            "depends_on_task_id": task1,
        },
    )

    assert response.status_code == 409

    data = response.get_json()

    assert data["success"] is False