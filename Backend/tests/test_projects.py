def test_admin_can_create_project(client, auth_headers):
    response = client.post(
        "/api/projects",
        headers=auth_headers,
        json={
            "name": "New Construction Project",
            "description": "Project created through automated test",
            "client_name": "ABC Developers",
            "location": "Mumbai",
            "status": "planning",
            "budget": 2500000,
        },
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["project"]["name"] == "New Construction Project"


def test_admin_can_get_project(client, auth_headers, project):
    response = client.get(
        f"/api/projects/{project}",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["project"]["id"] == project


def test_admin_can_get_phases(client, auth_headers, project, phase):
    response = client.get(
        f"/api/projects/{project}/phases",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert len(data["data"]["phases"]) == 1
    assert data["data"]["phases"][0]["id"] == phase


def test_admin_can_get_tasks(client, auth_headers, phase, task):
    response = client.get(
        f"/api/phases/{phase}/tasks",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert len(data["data"]["tasks"]) == 1
    assert data["data"]["tasks"][0]["id"] == task