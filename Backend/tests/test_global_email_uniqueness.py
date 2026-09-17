import pytest
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models import Organization, User


def test_register_with_unused_email_succeeds(client):
    response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Unique Org Alpha",
            "username": "alphaadmin",
            "email": "alpha.admin@example.com",
            "password": "Admin@123",
        },
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == "alpha.admin@example.com"


def test_register_with_duplicate_email_fails(client):
    # First registration
    res1 = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Unique Org One",
            "username": "userone",
            "email": "duplicate@example.com",
            "password": "Admin@123",
        },
    )
    assert res1.status_code == 201

    # Second registration with exact same email (different org)
    res2 = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Unique Org Two",
            "username": "usertwo",
            "email": "duplicate@example.com",
            "password": "Admin@123",
        },
    )
    assert res2.status_code == 409
    data = res2.get_json()
    assert data["success"] is False
    assert "email" in data["error"]["message"].lower()


def test_register_with_case_variant_duplicate_email_fails(client):
    # First registration with lowercase
    res1 = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Case Test Org A",
            "username": "caseadmin1",
            "email": "case.sensitive@example.com",
            "password": "Admin@123",
        },
    )
    assert res1.status_code == 201

    # Second registration with mixed uppercase
    res2 = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Case Test Org B",
            "username": "caseadmin2",
            "email": "CASE.SENSITIVE@EXAMPLE.COM",
            "password": "Admin@123",
        },
    )
    assert res2.status_code == 409
    data = res2.get_json()
    assert data["success"] is False
    assert "email" in data["error"]["message"].lower()


def test_create_worker_with_duplicate_email_across_orgs_fails(client, admin_user, auth_headers):
    # Register an external organization with a specific email
    res = client.post(
        "/api/auth/register",
        json={
            "organization_name": "External Contractor Org",
            "username": "extadmin",
            "email": "shared.identity@example.com",
            "password": "Admin@123",
        },
    )
    assert res.status_code == 201

    # Attempt to create worker in first organization with the same email
    worker_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "unique_worker_name",
            "email": "SHARED.IDENTITY@EXAMPLE.COM",
            "password": "Worker@123",
            "full_name": "Shared Identity Worker",
        },
    )
    assert worker_res.status_code == 409
    data = worker_res.get_json()
    assert data["success"] is False
    assert "email" in data["error"]["message"].lower()


def test_update_worker_with_duplicate_email_fails(client, admin_user, auth_headers):
    # Create worker 1
    w1_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "worker_one",
            "email": "worker1.test@example.com",
            "password": "Worker@123",
            "full_name": "Worker One",
        },
    )
    assert w1_res.status_code == 201

    # Create worker 2
    w2_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "worker_two",
            "email": "worker2.test@example.com",
            "password": "Worker@123",
            "full_name": "Worker Two",
        },
    )
    assert w2_res.status_code == 201
    w2_id = w2_res.get_json()["data"]["worker"]["id"]

    # Attempt to update worker 2 email to worker 1 email (case-variant)
    update_res = client.put(
        f"/api/workers/{w2_id}",
        headers=auth_headers,
        json={
            "email": "WORKER1.TEST@EXAMPLE.COM",
        },
    )
    assert update_res.status_code == 409
    data = update_res.get_json()
    assert data["success"] is False
    assert "email" in data["error"]["message"].lower()


def test_update_worker_keeping_own_email_succeeds(client, admin_user, auth_headers):
    # Create worker
    w_res = client.post(
        "/api/workers",
        headers=auth_headers,
        json={
            "username": "worker_self",
            "email": "self.email@example.com",
            "password": "Worker@123",
            "full_name": "Self Worker",
        },
    )
    assert w_res.status_code == 201
    w_id = w_res.get_json()["data"]["worker"]["id"]

    # Update worker keeping same email
    update_res = client.put(
        f"/api/workers/{w_id}",
        headers=auth_headers,
        json={
            "full_name": "Self Worker Updated",
            "email": "self.email@example.com",
        },
    )
    assert update_res.status_code == 200
    data = update_res.get_json()
    assert data["success"] is True
    assert data["data"]["worker"]["name"] == "Self Worker Updated"


def test_same_username_allowed_in_different_organizations(client):
    # Register org 1 with username "manager"
    res1 = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Manager Org One",
            "username": "manager",
            "email": "manager1@example.com",
            "password": "Admin@123",
        },
    )
    assert res1.status_code == 201

    # Register org 2 with same username "manager" but distinct email
    res2 = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Manager Org Two",
            "username": "manager",
            "email": "manager2@example.com",
            "password": "Admin@123",
        },
    )
    assert res2.status_code == 201
    assert res2.get_json()["success"] is True


def test_login_case_insensitivity_succeeds(client):
    # Register user
    reg_res = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Login Case Org",
            "username": "caseuser",
            "email": "case.login@example.com",
            "password": "Admin@123",
        },
    )
    assert reg_res.status_code == 201

    # Login with mixed case email
    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "CASE.LOGIN@EXAMPLE.COM",
            "password": "Admin@123",
        },
    )
    assert login_res.status_code == 200
    data = login_res.get_json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["email"] == "case.login@example.com"
