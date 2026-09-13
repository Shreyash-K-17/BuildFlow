from ..extensions import db
from ..models import Project


def create_project(
    organization_id,
    name,
    description=None,
    client_name=None,
    location=None,
    status="planning",
    budget=0,
    start_date=None,
    expected_end_date=None,
    actual_end_date=None,
):
    name = name.strip()

    if not name:
        raise ValueError("Project name cannot be empty.")

    if budget < 0:
        raise ValueError("Budget cannot be negative.")

    if (
        start_date
        and expected_end_date
        and expected_end_date < start_date
    ):
        raise ValueError(
            "Expected end date cannot be before start date."
        )

    if (
        start_date
        and actual_end_date
        and actual_end_date < start_date
    ):
        raise ValueError(
            "Actual end date cannot be before start date."
        )

    project = Project(
        organization_id=organization_id,
        name=name,
        description=description.strip() if description else None,
        client_name=client_name.strip() if client_name else None,
        location=location.strip() if location else None,
        status=status,
        budget=budget,
        start_date=start_date,
        expected_end_date=expected_end_date,
        actual_end_date=actual_end_date,
    )

    db.session.add(project)
    db.session.commit()

    return project


def get_project(project):
    return project


def get_all_projects(organization_id):
    return Project.query.filter_by(
        organization_id=organization_id
    ).order_by(
        Project.id.asc()
    ).all()


def update_project(
    project,
    name=None,
    description=None,
    client_name=None,
    location=None,
    status=None,
    budget=None,
    start_date=None,
    expected_end_date=None,
    actual_end_date=None,
):
    if name is not None:
        name = name.strip()

        if not name:
            raise ValueError(
                "Project name cannot be empty."
            )

        project.name = name

    if description is not None:
        project.description = (
            description.strip()
            if description
            else None
        )

    if client_name is not None:
        project.client_name = (
            client_name.strip()
            if client_name
            else None
        )

    if location is not None:
        project.location = (
            location.strip()
            if location
            else None
        )

    if status is not None:
        project.status = status

    if budget is not None:
        if budget < 0:
            raise ValueError(
                "Budget cannot be negative."
            )

        project.budget = budget

    if start_date is not None:
        project.start_date = start_date

    if expected_end_date is not None:
        project.expected_end_date = expected_end_date

    if actual_end_date is not None:
        project.actual_end_date = actual_end_date

    if (
        project.start_date
        and project.expected_end_date
        and project.expected_end_date < project.start_date
    ):
        raise ValueError(
            "Expected end date cannot be before start date."
        )

    if (
        project.start_date
        and project.actual_end_date
        and project.actual_end_date < project.start_date
    ):
        raise ValueError(
            "Actual end date cannot be before start date."
        )

    db.session.commit()

    return project