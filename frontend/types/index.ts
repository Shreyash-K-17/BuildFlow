/**
 * BuildFlow TypeScript Type Definitions
 * Directly aligned with the backend Flask API schemas and models.
 */

// ============================================================
// ENUMS & COMMON TYPES
// ============================================================

export type UserRole = "admin" | "worker";

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "on_hold"
  | "blocked"
  | "completed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";

export type TransactionType =
  | "purchase"
  | "consumption"
  | "return"
  | "adjustment_in"
  | "adjustment_out";

// ============================================================
// CORE ENTITY INTERFACES
// ============================================================

export interface User {
  id: number;
  organization_id: number;
  username: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
}

export interface Worker {
  id: number;
  user_id: number;
  organization_id: number;
  name: string;
  phone: string | null;
  email: string;
  worker_type: string | null;
  daily_wage: string | null;
  joined_date?: string | null;
  is_active: boolean;
}

export interface Project {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  client_name: string | null;
  location: string | null;
  status: ProjectStatus;
  budget: string;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProjectPhase {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  phase_order: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Task {
  id: number;
  phase_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  progress: number;
  priority: TaskPriority;
  assigned_worker_id: number | null;
  start_date: string | null;
  due_date: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TaskDependency {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  created_at?: string;
}

export interface Attendance {
  id: number;
  worker_id: number;
  project_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  check_in: string | null;
  check_out: string | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Material {
  id: number;
  organization_id: number;
  name: string;
  unit: string;
  current_stock: string;
  minimum_stock: string;
  unit_cost: string | null;
  low_stock: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InventoryTransaction {
  id: number;
  material_id: number;
  project_id: number | null;
  transaction_type: TransactionType;
  quantity: string;
  unit_cost: string | null;
  notes: string | null;
  created_at?: string | null;
}

export interface Expense {
  id: number;
  organization_id: number;
  project_id: number;
  category: string;
  description: string | null;
  amount: string;
  expense_date: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AuditLog {
  id: number;
  organization_id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string | null;
}

// ============================================================
// DASHBOARD METRICS
// ============================================================

export interface LowStockMaterialSummary {
  id: number;
  name: string;
  current_stock: string;
  minimum_stock: string;
  unit: string;
}

export interface DashboardData {
  projects: {
    total: number;
    planning: number;
    active: number;
    on_hold: number;
    completed: number;
    cancelled: number;
    total_budget: string;
  };
  tasks: {
    total: number;
    not_started: number;
    in_progress: number;
    blocked: number;
    on_hold: number;
    completed: number;
    average_progress: number;
  };
  workforce: {
    active_workers: number;
    attendance: {
      present: number;
      absent: number;
      half_day: number;
      leave: number;
    };
  };
  materials: {
    total_active: number;
    low_stock_count: number;
    low_stock_materials: LowStockMaterialSummary[];
  };
  finance: {
    total_budget: string;
    total_expenses: string;
    remaining_budget: string;
    budget_utilization: number;
  };
}

// ============================================================
// API RESPONSE ENVELOPES
// ============================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorDetail {
  code: string;
  message: string | Record<string, unknown> | string[];
  details?: Record<string, unknown> | string[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================
// ROUTE DATA PAYLOADS
// ============================================================

export interface AuthResponseData {
  access_token: string;
  user: User;
}

export interface MeResponseData {
  user: User;
}

export interface WorkersResponseData {
  workers: Worker[];
}

export interface WorkerResponseData {
  worker: Worker;
}

export interface ProjectsResponseData {
  projects: Project[];
}

export interface ProjectResponseData {
  project: Project;
}

export interface PhasesResponseData {
  phases: ProjectPhase[];
}

export interface PhaseResponseData {
  phase: ProjectPhase;
}

export interface TasksResponseData {
  tasks: Task[];
}

export interface TaskResponseData {
  task: Task;
}

export interface DependenciesResponseData {
  dependencies: TaskDependency[];
}

export interface DependencyResponseData {
  dependency: TaskDependency;
}

export interface AttendanceListResponseData {
  project_id?: number;
  attendance: Attendance[];
  pagination?: PaginationMetadata;
}

export interface AttendanceResponseData {
  attendance: Attendance;
}

export interface MaterialsResponseData {
  materials: Material[];
}

export interface MaterialResponseData {
  material: Material;
}

export interface InventoryTransactionResponseData {
  transaction: InventoryTransaction;
  current_stock: string;
}

export interface InventoryTransactionsResponseData {
  transactions: InventoryTransaction[];
  pagination?: PaginationMetadata;
}

export interface ExpensesResponseData {
  project_id: number;
  total_expenses: string;
  expenses: Expense[];
  pagination?: PaginationMetadata;
}

export type ProjectExpensesResponse = ExpensesResponseData;

export interface ExpenseResponseData {
  expense: Expense;
}

export interface PaginationMetadata {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface AuditLogsResponseData {
  audit_logs: AuditLog[];
  pagination?: PaginationMetadata;
}

export type AuditLogsResponse = AuditLogsResponseData;


// ============================================================
// REQUEST PAYLOADS
// ============================================================

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  organization_name: string;
  username: string;
  email: string;
  password: string;
}

export interface CreateWorkerPayload {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  worker_type?: string | null;
  daily_wage?: string | number | null;
  joined_date?: string | null;
}

export interface UpdateWorkerPayload {
  username?: string;
  email?: string;
  full_name?: string;
  phone?: string | null;
  worker_type?: string | null;
  daily_wage?: string | number | null;
  joined_date?: string | null;
  is_active?: boolean;
}

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  client_name?: string | null;
  location?: string | null;
  status?: ProjectStatus;
  budget?: string | number;
  start_date?: string | null;
  expected_end_date?: string | null;
  actual_end_date?: string | null;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  client_name?: string | null;
  location?: string | null;
  status?: ProjectStatus;
  budget?: string | number;
  start_date?: string | null;
  expected_end_date?: string | null;
  actual_end_date?: string | null;
}

export interface CreatePhasePayload {
  name: string;
  description?: string | null;
  phase_order: number;
}

export interface UpdatePhasePayload {
  name?: string;
  description?: string | null;
  phase_order?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  progress?: number;
  priority?: TaskPriority;
  assigned_worker_id?: number | null;
  start_date?: string | null;
  due_date?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  progress?: number;
  priority?: TaskPriority;
  assigned_worker_id?: number | null;
  start_date?: string | null;
  due_date?: string | null;
}

export interface CreateDependencyPayload {
  depends_on_task_id: number;
}

export interface CreateAttendancePayload {
  worker_id: number;
  project_id: number;
  attendance_date: string;
  status?: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
}

export interface UpdateAttendancePayload {
  status?: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
}

export interface CreateMaterialPayload {
  name: string;
  unit: string;
  current_stock?: string | number;
  minimum_stock?: string | number;
  unit_cost?: string | number | null;
}

export interface UpdateMaterialPayload {
  name?: string;
  unit?: string;
  minimum_stock?: string | number;
  unit_cost?: string | number | null;
}

export interface CreateInventoryTransactionPayload {
  material_id: number;
  project_id?: number | null;
  transaction_type: TransactionType;
  quantity: string | number;
  unit_cost?: string | number | null;
  notes?: string | null;
}

export interface CreateExpensePayload {
  project_id: number;
  category: string;
  amount: string | number;
  description?: string | null;
  expense_date: string;
}

export interface UpdateExpensePayload {
  category?: string;
  amount?: string | number;
  description?: string | null;
  expense_date?: string;
}
