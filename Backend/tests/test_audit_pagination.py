import pytest
from app.extensions import db
from app.models import AuditLog, Organization, User
from app.services.audit_service import create_audit_log


def test_audit_logs_default_pagination(client, admin_user, auth_headers):
    # Create 30 audit logs for admin's organization
    with client.application.app_context():
        for i in range(30):
            create_audit_log(
                organization_id=admin_user["organization_id"],
                user_id=admin_user["user_id"],
                action="create",
                entity_type="project",
                entity_id=i + 1,
                new_values={"name": f"Project {i + 1}"},
            )
        db.session.commit()

    response = client.get("/api/audit-logs", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True

    # Default per_page is 25
    assert len(data["data"]["audit_logs"]) == 25
    pagination = data["data"]["pagination"]
    assert pagination["page"] == 1
    assert pagination["per_page"] == 25
    assert pagination["total"] == 30
    assert pagination["pages"] == 2


def test_audit_logs_custom_pagination(client, admin_user, auth_headers):
    with client.application.app_context():
        for i in range(15):
            create_audit_log(
                organization_id=admin_user["organization_id"],
                user_id=admin_user["user_id"],
                action="update",
                entity_type="task",
                entity_id=i + 1,
                new_values={"title": f"Task {i + 1}"},
            )
        db.session.commit()

    # Request page 2 with 10 per page -> items 11 to 15 (5 items)
    response = client.get(
        "/api/audit-logs?page=2&per_page=10",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert len(data["data"]["audit_logs"]) == 5
    pagination = data["data"]["pagination"]
    assert pagination["page"] == 2
    assert pagination["per_page"] == 10
    assert pagination["total"] == 15
    assert pagination["pages"] == 2


def test_audit_logs_max_per_page_succeeds(client, admin_user, auth_headers):
    response = client.get(
        "/api/audit-logs?page=1&per_page=100",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["pagination"]["per_page"] == 100


def test_audit_logs_over_max_per_page_fails(client, auth_headers):
    response = client.get(
        "/api/audit-logs?per_page=101",
        headers=auth_headers,
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_audit_logs_invalid_pagination_parameters(client, auth_headers):
    # page = 0
    res1 = client.get("/api/audit-logs?page=0", headers=auth_headers)
    assert res1.status_code == 400
    assert res1.get_json()["error"]["code"] == "VALIDATION_ERROR"

    # per_page = 0
    res2 = client.get("/api/audit-logs?per_page=0", headers=auth_headers)
    assert res2.status_code == 400
    assert res2.get_json()["error"]["code"] == "VALIDATION_ERROR"

    # non-numeric page
    res3 = client.get("/api/audit-logs?page=abc", headers=auth_headers)
    assert res3.status_code == 400
    assert res3.get_json()["error"]["code"] == "VALIDATION_ERROR"

    # negative values
    res4 = client.get("/api/audit-logs?page=-1&per_page=-5", headers=auth_headers)
    assert res4.status_code == 400
    assert res4.get_json()["error"]["code"] == "VALIDATION_ERROR"


def test_audit_logs_organization_isolation(client, admin_user, auth_headers):
    # Create logs in org 1
    with client.application.app_context():
        create_audit_log(
            organization_id=admin_user["organization_id"],
            user_id=admin_user["user_id"],
            action="create",
            entity_type="project",
            entity_id=101,
            new_values={"name": "Org 1 Project"},
        )

        # Create another organization with logs
        org2 = Organization(name="Other Organization")
        db.session.add(org2)
        db.session.flush()

        user2 = User(
            organization_id=org2.id,
            username="otheradmin",
            email="otheradmin@example.com",
            role="admin",
            is_active=True,
        )
        user2.set_password("Admin@123")
        db.session.add(user2)
        db.session.flush()

        for k in range(5):
            create_audit_log(
                organization_id=org2.id,
                user_id=user2.id,
                action="create",
                entity_type="material",
                entity_id=200 + k,
                new_values={"name": f"Org 2 Material {k}"},
            )
        db.session.commit()

    # User 1 queries logs -> must only see Org 1 logs
    response = client.get("/api/audit-logs", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["data"]["pagination"]["total"] == 1
    assert len(data["data"]["audit_logs"]) == 1
    assert data["data"]["audit_logs"][0]["organization_id"] == admin_user["organization_id"]


def test_audit_logs_deterministic_ordering(client, admin_user, auth_headers):
    with client.application.app_context():
        for i in range(5):
            create_audit_log(
                organization_id=admin_user["organization_id"],
                user_id=admin_user["user_id"],
                action="create",
                entity_type="task",
                entity_id=i + 1,
                new_values={"order": i + 1},
            )
        db.session.commit()

    response = client.get("/api/audit-logs?per_page=5", headers=auth_headers)
    assert response.status_code == 200
    logs = response.get_json()["data"]["audit_logs"]

    # Verify decreasing IDs (newest first)
    ids = [log["id"] for log in logs]
    assert ids == sorted(ids, reverse=True)


def test_audit_logs_page_beyond_last_page(client, admin_user, auth_headers):
    with client.application.app_context():
        create_audit_log(
            organization_id=admin_user["organization_id"],
            user_id=admin_user["user_id"],
            action="create",
            entity_type="worker",
            entity_id=1,
            new_values={"name": "Worker 1"},
        )
        db.session.commit()

    response = client.get("/api/audit-logs?page=10&per_page=10", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["audit_logs"] == []
    assert data["data"]["pagination"]["page"] == 10
    assert data["data"]["pagination"]["total"] == 1
    assert data["data"]["pagination"]["pages"] == 1


def test_audit_logs_empty_organization(client, admin_user, auth_headers):
    response = client.get("/api/audit-logs", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["audit_logs"] == []
    assert data["data"]["pagination"]["total"] == 0
    assert data["data"]["pagination"]["pages"] == 0
    assert data["data"]["pagination"]["page"] == 1


def test_audit_logs_worker_forbidden(client, worker_auth_headers):
    response = client.get("/api/audit-logs", headers=worker_auth_headers)
    assert response.status_code == 403


def test_audit_logs_composite_index_configured():
    from app.models.audit import AuditLog
    index_names = [idx.name for idx in AuditLog.__table__.indexes]
    assert "ix_audit_logs_org_created_id" in index_names
