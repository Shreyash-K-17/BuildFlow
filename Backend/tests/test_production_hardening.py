from unittest.mock import MagicMock
from flask import Flask
from sqlalchemy.exc import OperationalError
from app.extensions import db


def test_health_check_healthy_database(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


def test_health_check_database_failure_no_leak(client, monkeypatch):
    # Simulate a database connection outage with sensitive error details
    def mock_connect(*args, **kwargs):
        raise OperationalError(
            "FATAL: password authentication failed for user 'postgres' on port 5432 host 'db.supabase.co'",
            params={},
            orig=Exception("socket connection closed"),
        )

    with monkeypatch.context() as m:
        m.setattr(db.engine, "connect", mock_connect)

        response = client.get("/api/health")
        assert response.status_code == 500
        data = response.get_json()
        assert data == {
            "status": "error",
            "database": "disconnected",
        }
        # Ensure no internal error strings or credentials leak
        raw_text = response.get_data(as_text=True)
        assert "postgres" not in raw_text
        assert "password" not in raw_text
        assert "supabase" not in raw_text
        assert "5432" not in raw_text


def test_cors_allowed_origin(client):
    response = client.get(
        "/api/health",
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:3000"


def test_cors_disallowed_origin(client):
    response = client.get(
        "/api/health",
        headers={"Origin": "http://unauthorized-domain.com"},
    )
    assert response.status_code == 200
    # Disallowed origin must not receive Access-Control-Allow-Origin
    assert response.headers.get("Access-Control-Allow-Origin") != "http://unauthorized-domain.com"


def test_cors_options_preflight(client):
    response = client.open(
        "/api/projects",
        method="OPTIONS",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization, Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:3000"
    allow_headers = response.headers.get("Access-Control-Allow-Headers", "")
    assert "authorization" in allow_headers.lower()
    assert "content-type" in allow_headers.lower()


def test_wsgi_entrypoint_import():
    from wsgi import app as wsgi_app
    assert isinstance(wsgi_app, Flask)


def test_sqlalchemy_engine_options_configuration(app, monkeypatch):
    # Check that pool_pre_ping is active in the running app
    engine_options = app.config.get("SQLALCHEMY_ENGINE_OPTIONS", {})
    assert engine_options.get("pool_pre_ping") is True

    # Test PostgreSQL configuration options specifically
    with monkeypatch.context() as m:
        m.setenv("DATABASE_URL", "postgresql://postgres:pwd@db.supabase.co:5432/postgres")
        m.setenv("DB_POOL_RECYCLE", "300")
        m.setenv("DB_POOL_TIMEOUT", "30")
        m.setenv("DB_POOL_SIZE", "10")
        m.setenv("DB_MAX_OVERFLOW", "10")
        m.setenv("DB_CONNECT_TIMEOUT", "10")

        # Import or reload Config logic
        import importlib
        import app.config as app_config
        importlib.reload(app_config)

        pg_engine_opts = app_config.Config.SQLALCHEMY_ENGINE_OPTIONS
        assert pg_engine_opts.get("pool_pre_ping") is True
        assert pg_engine_opts.get("pool_recycle") == 300
        assert pg_engine_opts.get("pool_timeout") == 30
        assert pg_engine_opts.get("pool_size") == 10
        assert pg_engine_opts.get("max_overflow") == 10
        assert pg_engine_opts.get("connect_args") == {"connect_timeout": 10}

        # Restore config back to sqlite environment for remaining fixtures
        m.setenv("DATABASE_URL", "sqlite+pysqlite:///:memory:")
        importlib.reload(app_config)

