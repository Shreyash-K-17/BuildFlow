from .auth import auth_bp
from .health import health_bp
from .workers import workers_bp
from .projects import projects_bp
from .phases import phases_bp
from .tasks import tasks_bp
from .task_dependencies import task_dependencies_bp
from .attendance import attendance_bp
from .inventory import inventory_bp
from .expenses import expenses_bp
from .dashboard import dashboard_bp

__all__ = [
    "auth_bp",
    "health_bp",
    "workers_bp",
    "projects_bp",
    "phases_bp",
    "tasks_bp",
    "task_dependencies_bp",
    "attendance_bp",
    "inventory_bp",
    "expenses_bp",
    "dashboard_bp",
]