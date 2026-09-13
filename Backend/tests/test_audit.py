def test_create_audit_log(app, admin_user):
    from app.extensions import db
    from app.models import AuditLog
    from app.services.audit_service import create_audit_log

    with app.app_context():
        audit_log = create_audit_log(
            organization_id=admin_user["organization_id"],
            user_id=admin_user["user_id"],
            action="update",
            entity_type="task",
            entity_id=123,
            old_values={
                "status": "in_progress",
                "progress": 80,
            },
            new_values={
                "status": "completed",
                "progress": 100,
            },
        )

        assert audit_log.id is not None
        assert audit_log.organization_id == admin_user["organization_id"]
        assert audit_log.user_id == admin_user["user_id"]
        assert audit_log.action == "update"
        assert audit_log.entity_type == "task"
        assert audit_log.entity_id == 123

        assert audit_log.old_values["status"] == "in_progress"
        assert audit_log.old_values["progress"] == 80

        assert audit_log.new_values["status"] == "completed"
        assert audit_log.new_values["progress"] == 100


def test_create_audit_log_supports_create_action(
    app,
    admin_user,
):
    from app.services.audit_service import create_audit_log

    with app.app_context():
        audit_log = create_audit_log(
            organization_id=admin_user["organization_id"],
            user_id=admin_user["user_id"],
            action="create",
            entity_type="project",
            entity_id=1,
            new_values={
                "name": "New Construction Project",
                "status": "planning",
            },
        )

        assert audit_log.id is not None
        assert audit_log.action == "create"
        assert audit_log.entity_type == "project"
        assert audit_log.old_values is None
        assert audit_log.new_values["name"] == "New Construction Project"


def test_create_audit_log_supports_delete_action(
    app,
    admin_user,
):
    from app.services.audit_service import create_audit_log

    with app.app_context():
        audit_log = create_audit_log(
            organization_id=admin_user["organization_id"],
            user_id=admin_user["user_id"],
            action="delete",
            entity_type="material",
            entity_id=10,
            old_values={
                "name": "Cement",
                "current_stock": 50,
            },
        )

        assert audit_log.id is not None
        assert audit_log.action == "delete"
        assert audit_log.entity_type == "material"
        assert audit_log.old_values["name"] == "Cement"
        assert audit_log.new_values is None


def test_audit_log_is_organization_scoped(
    app,
    admin_user,
):
    from app.extensions import db
    from app.models import AuditLog, Organization
    from app.services.audit_service import create_audit_log

    with app.app_context():
        other_org = Organization(
            name="Other Audit Organization"
        )

        db.session.add(other_org)
        db.session.commit()

        audit_log = create_audit_log(
            organization_id=other_org.id,
            user_id=None,
            action="create",
            entity_type="project",
            entity_id=1,
            new_values={"name": "Other Project"},
        )

        stored_log = db.session.get(
            AuditLog,
            audit_log.id,
        )

        assert stored_log.organization_id == other_org.id
        assert stored_log.organization_id != admin_user["organization_id"]