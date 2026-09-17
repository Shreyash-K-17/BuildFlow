from ..extensions import db
from ..models import Task, TaskDependency


def validate_same_project(task, depends_on_task):
    task_project_id = task.phase.project_id
    dependency_project_id = depends_on_task.phase.project_id

    if task_project_id != dependency_project_id:
        raise ValueError(
            "Tasks must belong to the same project."
        )


def validate_not_self(task, depends_on_task):
    if task.id == depends_on_task.id:
        raise ValueError(
            "A task cannot depend on itself."
        )


def creates_cycle(task_id, depends_on_task_id):
    """
    Check whether adding:
        task_id -> depends_on_task_id

    would create a dependency cycle.
    """

    visited = set()
    stack = [depends_on_task_id]

    while stack:
        current_task_id = stack.pop()

        if current_task_id == task_id:
            return True

        if current_task_id in visited:
            continue

        visited.add(current_task_id)

        dependencies = TaskDependency.query.filter_by(
            task_id=current_task_id
        ).all()

        for dependency in dependencies:
            stack.append(
                dependency.depends_on_task_id
            )

    return False


def create_dependency(task, depends_on_task):
    validate_not_self(
        task,
        depends_on_task,
    )

    validate_same_project(
        task,
        depends_on_task,
    )

    existing = TaskDependency.query.filter_by(
        task_id=task.id,
        depends_on_task_id=depends_on_task.id,
    ).first()

    if existing:
        raise ValueError(
            "This task dependency already exists."
        )

    if creates_cycle(
        task.id,
        depends_on_task.id,
    ):
        raise ValueError(
            "This dependency would create a cycle."
        )

    dependency = TaskDependency(
        task_id=task.id,
        depends_on_task_id=depends_on_task.id,
    )

    db.session.add(dependency)
    db.session.flush()
    db.session.refresh(dependency)

    return dependency


def get_dependencies(task_id):
    return TaskDependency.query.filter_by(
        task_id=task_id
    ).all()


def delete_dependency(dependency):
    db.session.delete(dependency)
    db.session.flush()