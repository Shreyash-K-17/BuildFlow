from app.models import AuditLog


def test_create_phase_creates_audit_log(client, auth_headers, project):
    response = client.post(
        f"/api/projects/{project}/phases",
        headers=auth_headers,
        json={
            "name": "Excavation & Foundation",
            "description": "Earthwork and footings",
            "phase_order": 1,
        },
    )
    assert response.status_code == 201
    phase_id = response.get_json()["data"]["phase"]["id"]

    audit = AuditLog.query.filter_by(
        entity_type="phase",
        entity_id=phase_id,
        action="create",
    ).first()
    assert audit is not None
    assert audit.new_values["name"] == "Excavation & Foundation"
    assert audit.new_values["description"] == "Earthwork and footings"
    assert audit.new_values["phase_order"] == 1
    assert audit.new_values["project_id"] == project
    assert audit.old_values is None


def test_update_phase_creates_audit_log(client, auth_headers, project):
    create_res = client.post(
        f"/api/projects/{project}/phases",
        headers=auth_headers,
        json={
            "name": "Structural Framing",
            "description": "Steel and RCC",
            "phase_order": 2,
        },
    )
    assert create_res.status_code == 201
    phase_id = create_res.get_json()["data"]["phase"]["id"]

    update_res = client.put(
        f"/api/phases/{phase_id}",
        headers=auth_headers,
        json={
            "name": "Structural Framing & Slabs",
            "description": "Steel, RCC and composite slabs",
            "phase_order": 3,
        },
    )
    assert update_res.status_code == 200

    audit = (
        AuditLog.query.filter_by(
            entity_type="phase",
            entity_id=phase_id,
            action="update",
        )
        .order_by(AuditLog.id.desc())
        .first()
    )
    assert audit is not None
    assert audit.old_values["name"] == "Structural Framing"
    assert audit.old_values["description"] == "Steel and RCC"
    assert audit.old_values["phase_order"] == 2
    assert audit.new_values["name"] == "Structural Framing & Slabs"
    assert audit.new_values["description"] == "Steel, RCC and composite slabs"
    assert audit.new_values["phase_order"] == 3
