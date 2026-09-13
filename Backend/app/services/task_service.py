from datetime import datetime, timezone

from ..extensions import db
from ..models import Task, TaskDependency


def validate_dependencies_completed(task):
    dependencies = TaskDependency.query.filter_by(
        task_id=task.id
    ).all()

    incomplete_dependencies = []

    for dependency in dependencies:
        prerequisite = db.session.get(
            Task,
            dependency.depends_on_task_id,
        )

        if prerequisite is None:
            continue

        if prerequisite.status != "completed":
            incomplete_dependencies.append(
                prerequisite.title
            )

    if incomplete_dependencies:
        raise ValueError(
            "Task cannot start because these prerequisite "
            "tasks are not completed: "
            + ", ".join(incomplete_dependencies)
        )


def create_task(
    phase_id,
    title,
    description=None,
    status="not_started",
    progress=0,
    priority="medium",
    assigned_worker_id=None,
    start_date=None,
    due_date=None,
):
    title = title.strip()

    if not title:
        raise ValueError("Task title cannot be empty.")

    if progress < 0 or progress > 100:
        raise ValueError(
            "Progress must be between 0 and 100."
        )

    if start_date and due_date and due_date < start_date:
        raise ValueError(
            "Due date cannot be before start date."
        )

    if status in ("in_progress", "completed"):
        # Dependencies are checked after the task exists.
        # New tasks currently have no dependencies.
        pass

    if status == "completed":
        if progress != 100:
            raise ValueError(
                "A completed task must have 100% progress."
            )

        completed_at = datetime.now(timezone.utc)
    else:
        completed_at = None

    task = Task(
        phase_id=phase_id,
        title=title,
        description=description.strip() if description else None,
        status=status,
        progress=progress,
        priority=priority,
        assigned_worker_id=assigned_worker_id,
        start_date=start_date,
        due_date=due_date,
        completed_at=completed_at,
    )

    db.session.add(task)
    db.session.flush()
    db.session.refresh(task)

    return task


def get_all_tasks(phase_id):
    return Task.query.filter_by(
        phase_id=phase_id
    ).order_by(
        Task.id.asc()
    ).all()


def get_task(task):
    return task


def update_task(
    task,
    title=None,
    description=None,
    status=None,
    progress=None,
    priority=None,
    assigned_worker_id=None,
    start_date=None,
    due_date=None,
):
    if title is not None:
        title = title.strip()

        if not title:
            raise ValueError(
                "Task title cannot be empty."
            )

        task.title = title

    if description is not None:
        task.description = (
            description.strip()
            if description
            else None
        )

    if status is not None:
        if status in ("in_progress", "completed"):
            validate_dependencies_completed(task)

        task.status = status

    if progress is not None:
        if progress < 0 or progress > 100:
            raise ValueError(
                "Progress must be between 0 and 100."
            )

        task.progress = progress

    if priority is not None:
        task.priority = priority

    if assigned_worker_id is not None:
        task.assigned_worker_id = assigned_worker_id

    if start_date is not None:
        task.start_date = start_date

    if due_date is not None:
        task.due_date = due_date

    if (
        task.start_date
        and task.due_date
        and task.due_date < task.start_date
    ):
        raise ValueError(
            "Due date cannot be before start date."
        )

    if task.status == "completed":
        if task.progress != 100:
            raise ValueError(
                "A completed task must have 100% progress."
            )

        if task.completed_at is None:
            task.completed_at = datetime.now(timezone.utc)
    else:
        task.completed_at = None

    db.session.flush()
    db.session.refresh(task)

    return task