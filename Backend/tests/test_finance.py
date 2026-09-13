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
    # Create expense
    response = client.post(
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

    assert response.status_code == 201

    expense_id = response.get_json()["data"]["expense"]["id"]

    # Get project expenses
    response = client.get(
        f"/api/projects/{project}/expenses",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert len(data["data"]["expenses"]) == 1
    assert data["data"]["expenses"][0]["id"] == expense_id


def test_expense_amount_must_be_positive(
    client,
    auth_headers,
    project,
):
    # Zero
    response = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Material",
            "description": "Invalid expense",
            "amount": 0,
            "expense_date": "2026-09-13",
        },
    )

    assert response.status_code == 400

    # Negative
    response = client.post(
        "/api/expenses",
        headers=auth_headers,
        json={
            "project_id": project,
            "category": "Material",
            "description": "Invalid expense",
            "amount": -500,
            "expense_date": "2026-09-13",
        },
    )

    assert response.status_code == 400


def test_expense_description_required(
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
            "amount": 5000,
            "expense_date": "2026-09-13",
        },
    )

    assert response.status_code == 400


def test_unauthenticated_cannot_access_expenses(
    client,
    project,
):
    response = client.get(
        f"/api/projects/{project}/expenses"
    )

    assert response.status_code == 401

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"