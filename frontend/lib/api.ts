import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/types";

const TOKEN_STORAGE_KEY = "buildflow_token";

/**
 * Custom Error class for typed BuildFlow API errors.
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

const getBaseUrl = (): string => {
  const url =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

export interface RequestOptions extends Omit<RequestInit, "body"> {
  token?: string | null;
  body?: unknown;
}

/**
 * Centralized fetch handler that handles auth headers, JSON parsing,
 * and standard BuildFlow success/error envelopes.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const { token, body, headers: customHeaders, ...restOptions } = options;

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

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
      body: requestBody,
    });
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Network connection error";
    throw new ApiError(errorMsg, "NETWORK_ERROR", 0);
  }

  let json: unknown;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    if (json && typeof json === "object" && "error" in json) {
      const errorResp = json as ApiErrorResponse;
      const rawMessage = errorResp.error.message;
      const message =
        typeof rawMessage === "string"
          ? rawMessage
          : typeof rawMessage === "object" && rawMessage !== null
          ? JSON.stringify(rawMessage)
          : response.statusText || "Request failed";

      throw new ApiError(
        message,
        errorResp.error.code || "REQUEST_FAILED",
        response.status,
        errorResp.error.details
      );
    }

    throw new ApiError(
      response.statusText || `HTTP ${response.status} error`,
      "HTTP_ERROR",
      response.status
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
