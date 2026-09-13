from app.models import AuditLog


def test_material_create_creates_audit_log(client, auth_headers):
    response = client.post(
        "/api/materials",
        json={
            "name": "Audit Cement",
            "unit": "bags",
            "current_stock": 50,
            "minimum_stock": 20,
            "unit_cost": 450,
        },
        headers=auth_headers,
    )

    assert response.status_code == 201

    material_id = response.get_json()["data"]["material"]["id"]

    audit = AuditLog.query.filter_by(
        entity_type="material",
        entity_id=material_id,
        action="create",
    ).first()

    assert audit is not None
    assert audit.new_values["name"] == "Audit Cement"
    assert audit.new_values["unit"] == "bags"
    assert audit.new_values["current_stock"] == "50.000"
    assert audit.new_values["minimum_stock"] == "20.000"
    assert audit.new_values["unit_cost"] == "450.00"


def test_material_update_creates_audit_log(client, auth_headers):
    create_response = client.post(
        "/api/materials",
        json={
            "name": "Update Cement",
            "unit": "bags",
            "current_stock": 50,
            "minimum_stock": 20,
            "unit_cost": 450,
        },
        headers=auth_headers,
    )

    assert create_response.status_code == 201

    material_id = create_response.get_json()["data"]["material"]["id"]

    response = client.put(
        f"/api/materials/{material_id}",
        json={
            "minimum_stock": 30,
            "unit_cost": 475,
        },
        headers=auth_headers,
    )

    assert response.status_code == 200

    audit = AuditLog.query.filter_by(
        entity_type="material",
        entity_id=material_id,
        action="update",
    ).order_by(
        AuditLog.id.desc()
    ).first()

    assert audit is not None
    assert audit.old_values["minimum_stock"] == "20.000"
    assert audit.old_values["unit_cost"] == "450.00"
    assert audit.new_values["minimum_stock"] == "30.000"
    assert audit.new_values["unit_cost"] == "475.00"


def test_inventory_transaction_creates_audit_log(
    client,
    auth_headers,
):
    material_response = client.post(
        "/api/materials",
        json={
            "name": "Transaction Cement",
            "unit": "bags",
            "current_stock": 100,
            "minimum_stock": 20,
            "unit_cost": 450,
        },
        headers=auth_headers,
    )

    assert material_response.status_code == 201

    material_id = material_response.get_json()["data"]["material"]["id"]

    response = client.post(
        "/api/inventory/transactions",
        json={
            "material_id": material_id,
            "transaction_type": "consumption",
            "quantity": 25,
            "notes": "Used for foundation work",
        },
        headers=auth_headers,
    )

    assert response.status_code == 201

    transaction_id = response.get_json()["data"]["transaction"]["id"]

    audit = AuditLog.query.filter_by(
        entity_type="inventory_transaction",
        entity_id=transaction_id,
        action="create",
    ).first()

    assert audit is not None
    assert audit.new_values["material_id"] == material_id
    assert audit.new_values["transaction_type"] == "consumption"
    assert audit.new_values["quantity"] == "25.000"
    assert audit.new_values["notes"] == "Used for foundation work"
    assert audit.new_values["current_stock_after"] == "75.000"