import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/types";

const TOKEN_STORAGE_KEY = "buildflow_token";

/**
 * Custom Error class for typed BuildFlow API and network errors.
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown> | string[];

  constructor(
    message: string,
    code = "API_ERROR",
    status = 500,
    details?: Record<string, unknown> | string[]
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;

    // Restore prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public get isAbortError(): boolean {
    return this.code === "ABORT_ERROR";
  }

  public get isNetworkError(): boolean {
    return this.status === 0 || this.code === "NETWORK_ERROR";
  }

  public get isAuthError(): boolean {
    return this.status === 401 || this.code === "UNAUTHORIZED";
  }

  public get isForbidden(): boolean {
    return this.status === 403 || this.code === "FORBIDDEN";
  }

  public get isNotFound(): boolean {
    return this.status === 404 || this.code === "NOT_FOUND";
  }

  public get isConflict(): boolean {
    return this.status === 409 || this.code === "CONFLICT";
  }

  public get isValidationError(): boolean {
    return this.status === 400 || this.code === "VALIDATION_ERROR";
  }

  public get isServerError(): boolean {
    return this.status >= 500 || this.code === "INTERNAL_ERROR";
  }

  /**
   * Helper to check if an unknown error was caused by an aborted request.
   */
  public static isAbortError(err: unknown): boolean {
    if (err instanceof ApiError) {
      return err.isAbortError;
    }
    if (err instanceof Error && err.name === "AbortError") {
      return true;
    }
    return false;
  }

  /**
   * Helper to check if an unknown error is a network connection failure.
   */
  public static isNetworkError(err: unknown): boolean {
    if (err instanceof ApiError) {
      return err.isNetworkError;
    }
    return false;
  }

  /**
   * Convert any caught error into a safe, typed ApiError.
   */
  public static from(err: unknown, defaultMessage = "An unexpected error occurred."): ApiError {
    if (err instanceof ApiError) {
      return err;
    }
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return new ApiError("Request was cancelled", "ABORT_ERROR", 0);
      }
      return new ApiError(
        err.message || defaultMessage,
        "UNEXPECTED_ERROR",
        500
      );
    }
    return new ApiError(defaultMessage, "UNKNOWN_ERROR", 500);
  }
}

// In-memory token store for SSR / quick access
let inMemoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || inMemoryToken;
    } catch {
      return inMemoryToken;
    }
  }
  return inMemoryToken;
}

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in restricted iframe/browser environments
    }
  }
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

// 401 Unauthorized event listeners
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export function notifyUnauthorized(): void {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

const getBaseUrl = (): string => {
  const url =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

export interface RequestOptions extends Omit<RequestInit, "body"> {
  token?: string | null;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Filter and sanitize error messages to prevent leaking stack traces,
 * database internal errors, or sensitive backend info.
 */
function sanitizeErrorMessage(rawMessage: string, status: number): string {
  if (!rawMessage || typeof rawMessage !== "string") {
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status === 404) return "The requested resource was not found.";
    if (status === 409) return "A conflict occurred with an existing resource.";
    if (status >= 500) return "Something went wrong on the server. Please try again later.";
    return "Request failed.";
  }

  const lower = rawMessage.toLowerCase();
  const containsSensitiveInfo =
    lower.includes("psycopg2") ||
    lower.includes("sqlalchemy") ||
    lower.includes("traceback") ||
    lower.includes("syntax error") ||
    lower.includes("pg_") ||
    lower.includes("column ") ||
    lower.includes("relation ") ||
    lower.includes("table ") ||
    lower.includes("<html") ||
    lower.includes("<!doctype");

  if (containsSensitiveInfo) {
    if (status >= 500) {
      return "Something went wrong on the server. Please try again later.";
    }
    return "An unexpected error occurred. Please try again.";
  }

  return rawMessage;
}

/**
 * Centralized fetch handler that handles auth headers, JSON parsing,
 * request timeouts, cancellation, and standard BuildFlow success/error envelopes.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const {
    token,
    body,
    timeout = 30000,
    signal: callerSignal,
    headers: customHeaders,
    ...restOptions
  } = options;

  const activeToken = token !== undefined ? token : getAuthToken();
  const headers = new Headers(customHeaders);

  if (!headers.has("Content-Type") && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (activeToken) {
    headers.set("Authorization", `Bearer ${activeToken}`);
  }

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData) {
      requestBody = body;
    } else {
      requestBody = JSON.stringify(body);
    }
  }

  // Setup timeout and abort handling
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
  }

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
      body: requestBody,
      signal: controller.signal,
    });
  } catch (err) {
    if (callerSignal?.aborted || (err instanceof Error && err.name === "AbortError")) {
      throw new ApiError("Request was cancelled", "ABORT_ERROR", 0);
    }

    throw new ApiError(
      "Unable to connect to BuildFlow. Please check your connection and try again.",
      "NETWORK_ERROR",
      0
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  let json: unknown = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    let errorCode = "REQUEST_FAILED";
    let errorMessage = response.statusText || `HTTP ${response.status} error`;
    let errorDetails: Record<string, unknown> | string[] | undefined = undefined;

    if (json && typeof json === "object" && "error" in json) {
      const errorResp = json as ApiErrorResponse;
      const rawMessage = errorResp.error.message;
      errorCode = errorResp.error.code || errorCode;
      errorDetails = errorResp.error.details;

      if (typeof rawMessage === "string") {
        errorMessage = rawMessage;
      } else if (typeof rawMessage === "object" && rawMessage !== null) {
        errorMessage = JSON.stringify(rawMessage);
      }
    }

    // Sanitize user-facing message
    const sanitizedMessage = sanitizeErrorMessage(errorMessage, response.status);

    // Handle 401 Unauthorized token expiry
    if (response.status === 401) {
      const isAuthEndpoint =
        cleanEndpoint.startsWith("/auth/login") ||
        cleanEndpoint.startsWith("/auth/register");

      if (!isAuthEndpoint && activeToken) {
        clearAuthToken();
        notifyUnauthorized();
      }
    }

    throw new ApiError(
      sanitizedMessage,
      errorCode,
      response.status,
      errorDetails
    );
  }

  // Parse successful BuildFlow envelope
  if (json && typeof json === "object" && "success" in json) {
    const successResp = json as ApiSuccessResponse<T>;
    return successResp.data;
  }

  return json as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> =>
    apiRequest<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> =>
    apiRequest<T>(endpoint, { ...options, method: "PUT", body }),

  delete: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
