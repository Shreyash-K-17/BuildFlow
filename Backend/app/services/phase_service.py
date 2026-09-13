from ..extensions import db
from ..models import ProjectPhase


def create_phase(
    project_id,
    name,
    description=None,
    phase_order=1,
):
    name = name.strip()

    if not name:
        raise ValueError("Phase name cannot be empty.")

    if phase_order <= 0:
        raise ValueError("Phase order must be greater than 0.")

    phase = ProjectPhase(
        project_id=project_id,
        name=name,
        description=description.strip() if description else None,
        phase_order=phase_order,
    )

    db.session.add(phase)
    db.session.commit()

    return phase


def get_all_phases(project_id):
    return ProjectPhase.query.filter_by(
        project_id=project_id
    ).order_by(
        ProjectPhase.phase_order.asc(),
        ProjectPhase.id.asc(),
    ).all()


def get_phase(phase):
    return phase


def update_phase(
    phase,
    name=None,
    description=None,
    phase_order=None,
):
    if name is not None:
        name = name.strip()

        if not name:
            raise ValueError(
                "Phase name cannot be empty."
            )

        phase.name = name

    if description is not None:
        phase.description = (
            description.strip()
            if description
            else None
        )

    if phase_order is not None:
        if phase_order <= 0:
            raise ValueError(
                "Phase order must be greater than 0."
            )

        phase.phase_order = phase_order

    db.session.commit()

    return phase