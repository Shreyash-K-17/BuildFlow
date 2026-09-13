def test_admin_can_create_material(client, auth_headers):
    response = client.post(
        "/api/materials",
        headers=auth_headers,
        json={
            "name": "Steel",
            "unit": "kg",
            "current_stock": 500,
            "minimum_stock": 100,
            "unit_cost": 75,
        },
    )


    assert response.status_code == 201

    data = response.get_json()

    assert data["success"] is True
    assert data["data"]["material"]["name"] == "Steel"
    assert data["data"]["material"]["current_stock"] == "500.000"


def test_admin_can_get_materials(client, auth_headers, material):
    response = client.get(
        "/api/materials",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert len(data["data"]["materials"]) == 1
    assert data["data"]["materials"][0]["id"] == material


def test_unauthenticated_cannot_access_materials(client):
    response = client.get("/api/materials")

    assert response.status_code == 401

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_worker_cannot_create_material(client, auth_headers):
    # Admin creates worker
    response = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "inventoryworker",
            "email": "inventoryworker@test.com",
            "password": "Worker@123",
            "full_name": "Inventory Worker",
            "phone": "9876543210",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )

    assert response.status_code == 201

    # Worker login
    response = client.post(
        "/api/auth/login",
        json={
            "email": "inventoryworker@test.com",
            "password": "Worker@123",
        },
    )

    assert response.status_code == 200

    worker_token = response.get_json()["data"]["access_token"]

    worker_headers = {
        "Authorization": f"Bearer {worker_token}"
    }

    # Worker attempts material creation
    response = client.post(
        "/api/materials",
        headers=worker_headers,
        json={
            "name": "Unauthorized Cement",
            "unit": "bags",
            "current_stock": 10,
            "minimum_stock": 5,
            "unit_cost": 400,
        },
    )

    assert response.status_code == 403

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_purchase_increases_stock(
    client,
    auth_headers,
    material,
):
    response = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "purchase",
            "quantity": 50,
            "unit_cost": 420,
        },
    )

    assert response.status_code == 201

    # Verify material stock
    response = client.get(
        "/api/materials",
        headers=auth_headers,
    )

    assert response.status_code == 200

    materials = response.get_json()["data"]["materials"]

    assert materials[0]["current_stock"] == "150.000"


def test_consumption_decreases_stock(
    client,
    auth_headers,
    material,
):
    response = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "consumption",
            "quantity": 30,
        },
    )

    assert response.status_code == 201

    response = client.get(
        "/api/materials",
        headers=auth_headers,
    )

    assert response.status_code == 200

    materials = response.get_json()["data"]["materials"]

    assert materials[0]["current_stock"] == "70.000"


def test_insufficient_stock_rejected(
    client,
    auth_headers,
    material,
):
    response = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "consumption",
            "quantity": 150,
        },
    )

    assert response.status_code == 409

    data = response.get_json()

    assert data["success"] is False

    # Stock must remain unchanged
    response = client.get(
        "/api/materials",
        headers=auth_headers,
    )

    assert response.status_code == 200

    materials = response.get_json()["data"]["materials"]

    assert materials[0]["current_stock"] == "100.000"


def test_zero_quantity_rejected(
    client,
    auth_headers,
    material,
):
    response = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "purchase",
            "quantity": 0,
        },
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data["success"] is False


def test_negative_quantity_rejected(
    client,
    auth_headers,
    material,
):
    response = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "purchase",
            "quantity": -10,
        },
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data["success"] is False


def test_invalid_transaction_type_rejected(
    client,
    auth_headers,
    material,
):
    response = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "invalid_type",
            "quantity": 10,
        },
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data["success"] is False

    # Stock must remain unchanged
    response = client.get(
        "/api/materials",
        headers=auth_headers,
    )

    assert response.status_code == 200

    materials = response.get_json()["data"]["materials"]

    assert materials[0]["current_stock"] == "100.000"


def test_worker_cannot_create_inventory_transaction(
    client,
    auth_headers,
    material,
):
    # Admin creates worker
    response = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "inventorytxworker",
            "email": "inventorytxworker@test.com",
            "password": "Worker@123",
            "full_name": "Inventory Transaction Worker",
            "phone": "9876543210",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
    )

    assert response.status_code == 201

    # Worker login
    response = client.post(
        "/api/auth/login",
        json={
            "email": "inventorytxworker@test.com",
            "password": "Worker@123",
        },
    )

    assert response.status_code == 200

    worker_token = response.get_json()["data"]["access_token"]

    worker_headers = {
        "Authorization": f"Bearer {worker_token}"
    }

    # Worker attempts inventory transaction
    response = client.post(
        "/api/inventory/transactions",
        headers=worker_headers,
        json={
            "material_id": material,
            "transaction_type": "purchase",
            "quantity": 10,
            "unit_cost": 420,
        },
    )

    assert response.status_code == 403

    data = response.get_json()

    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_material_organization_isolation(client):
    # Organization 1
    response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Inventory Organization One",
            "username": "inventoryadmin1",
            "email": "inventoryadmin1@test.com",
            "password": "Admin@123",
        },
    )

    assert response.status_code == 201

    response = client.post(
        "/api/auth/login",
        json={
            "email": "inventoryadmin1@test.com",
            "password": "Admin@123",
        },
    )

    assert response.status_code == 200

    token1 = response.get_json()["data"]["access_token"]

    headers1 = {
        "Authorization": f"Bearer {token1}"
    }

    # Create material in Organization 1
    response = client.post(
        "/api/materials",
        headers=headers1,
        json={
            "name": "Private Cement",
            "unit": "bags",
            "current_stock": 100,
            "minimum_stock": 20,
            "unit_cost": 420,
        },
    )

    assert response.status_code == 201

    material_id = response.get_json()["data"]["material"]["id"]

    # Organization 2
    response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Inventory Organization Two",
            "username": "inventoryadmin2",
            "email": "inventoryadmin2@test.com",
            "password": "Admin@123",
        },
    )

    assert response.status_code == 201

    response = client.post(
        "/api/auth/login",
        json={
            "email": "inventoryadmin2@test.com",
            "password": "Admin@123",
        },
    )

    assert response.status_code == 200

    token2 = response.get_json()["data"]["access_token"]

    headers2 = {
        "Authorization": f"Bearer {token2}"
    }

    # Org 2 cannot access Org 1 material
    response = client.get(
        f"/api/materials/{material_id}/transactions",
        headers=headers2,
    )

    assert response.status_code == 404

    # Org 2 material list must not contain Org 1 material
    response = client.get(
        "/api/materials",
        headers=headers2,
    )

    assert response.status_code == 200

    materials = response.get_json()["data"]["materials"]

    assert materials == []


def test_low_stock_material(
    client,
    auth_headers,
    material,
):
    # Reduce stock from 100 to 10
    response = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "consumption",
            "quantity": 90,
        },
    )

    assert response.status_code == 201

    response = client.get(
        "/api/materials",
        headers=auth_headers,
    )

    assert response.status_code == 200

    materials = response.get_json()["data"]["materials"]

    assert len(materials) == 1

    material_data = materials[0]

    assert material_data["current_stock"] == "10.000"
    assert material_data["minimum_stock"] == "20.000"


def test_consumption_overdraw_prevented_and_stock_preserved(
    client,
    auth_headers,
    material,
):
    # Initial stock is 100.
    # First consumption: 60 units -> succeeds
    res1 = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "consumption",
            "quantity": 60,
        },
    )
    assert res1.status_code == 201
    assert res1.get_json()["data"]["current_stock"] == "40.000"

    # Second consumption: 60 units -> fails (only 40 left)
    res2 = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "consumption",
            "quantity": 60,
        },
    )
    assert res2.status_code == 409
    data2 = res2.get_json()
    assert data2["success"] is False
    assert data2["error"]["code"] == "INVENTORY_ERROR"
    assert "Insufficient material stock." in data2["error"]["message"]

    # Verify material stock is exactly 40.000 and never went negative
    get_res = client.get(
        "/api/materials",
        headers=auth_headers,
    )
    assert get_res.status_code == 200
    materials = get_res.get_json()["data"]["materials"]
    assert materials[0]["current_stock"] == "40.000"

    # Verify transactions count: only the single successful transaction exists
    tx_res = client.get(
        f"/api/materials/{material}/transactions",
        headers=auth_headers,
    )
    assert tx_res.status_code == 200
    transactions = tx_res.get_json()["data"]["transactions"]
    assert len(transactions) == 1
    assert transactions[0]["transaction_type"] == "consumption"
    assert transactions[0]["quantity"] == "60.000"


def test_cross_organization_transaction_returns_404(
    client,
    app,
):
    # Org 1: register and create material
    client.post(
        "/api/auth/register",
        json={
            "organization_name": "Org 1 Material",
            "username": "org1matadmin",
            "email": "org1mat@test.com",
            "password": "Admin@123",
        },
    )
    login1 = client.post(
        "/api/auth/login",
        json={"email": "org1mat@test.com", "password": "Admin@123"},
    )
    token1 = login1.get_json()["data"]["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    mat_res = client.post(
        "/api/materials",
        headers=headers1,
        json={
            "name": "Org 1 Timber",
            "unit": "pieces",
            "current_stock": 50,
            "minimum_stock": 10,
        },
    )
    mat_id = mat_res.get_json()["data"]["material"]["id"]

    # Org 2: register
    client.post(
        "/api/auth/register",
        json={
            "organization_name": "Org 2 Material",
            "username": "org2matadmin",
            "email": "org2mat@test.com",
            "password": "Admin@123",
        },
    )
    login2 = client.post(
        "/api/auth/login",
        json={"email": "org2mat@test.com", "password": "Admin@123"},
    )
    token2 = login2.get_json()["data"]["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Org 2 attempts to transact on Org 1 material -> 404
    tx_res = client.post(
        "/api/inventory/transactions",
        headers=headers2,
        json={
            "material_id": mat_id,
            "transaction_type": "consumption",
            "quantity": 10,
        },
    )
    assert tx_res.status_code == 404


def test_adjustment_transactions_update_stock_correctly(
    client,
    auth_headers,
    material,
):
    # Initial stock is 100
    # adjustment_in +25 -> 125
    res1 = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "adjustment_in",
            "quantity": 25,
        },
    )
    assert res1.status_code == 201
    assert res1.get_json()["data"]["current_stock"] == "125.000"

    # adjustment_out -35 -> 90
    res2 = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "adjustment_out",
            "quantity": 35,
        },
    )
    assert res2.status_code == 201
    assert res2.get_json()["data"]["current_stock"] == "90.000"

    # adjustment_out -100 (exceeds 90) -> 409
    res3 = client.post(
        "/api/inventory/transactions",
        headers=auth_headers,
        json={
            "material_id": material,
            "transaction_type": "adjustment_out",
            "quantity": 100,
        },
    )
    assert res3.status_code == 409
    assert "Insufficient material stock." in res3.get_json()["error"]["message"]