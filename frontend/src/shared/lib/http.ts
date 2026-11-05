interface HttpSuccess<T> {
  ok: true;
  data: T;
}

interface HttpFailure {
  ok: false;
  error: string;
}

export type HttpResult<T> = HttpSuccess<T> | HttpFailure;

export interface ProtectedApiConfig {
  baseUrl: string;
  tenantId: string;
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

function getAuthHeaders(config: ProtectedApiConfig): Record<string, string> {
  return {
    "X-Tenant-ID": config.tenantId
  };
}

function extractErrorMessage(path: string, status: number, payload: unknown): string {
  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;
    const messageFields = ["error", "message", "err2"];

    for (const field of messageFields) {
      const value = objectPayload[field];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return `Request failed (${status}) for ${path}`;
}

async function httpRequest<T>(
  method: HttpMethod,
  path: string,
  config: ProtectedApiConfig,
  body?: unknown
): Promise<HttpResult<T>> {
  if (!config.baseUrl) {
    return {
      ok: false,
      error: "API base URL is not set."
    };
  }

  if (!config.tenantId) {
    return {
      ok: false,
      error: "Missing tenant ID."
    };
  }

  const headers = getAuthHeaders(config);
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const baseUrl = config.baseUrl.replace(/\/+$/, "");

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      let errorPayload: unknown = null;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        errorPayload = await response.json();
      } else {
        errorPayload = await response.text();
      }

      return {
        ok: false,
        error: extractErrorMessage(path, response.status, errorPayload)
      };
    }

    if (response.status === 204) {
      return {
        ok: true,
        data: undefined as T
      };
    }

    const payload = (await response.json()) as T;
    return {
      ok: true,
      data: payload
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown network error"
    };
  }
}

async function httpRequestForm<T>(
  method: HttpMethod,
  path: string,
  config: ProtectedApiConfig,
  formData: FormData
): Promise<HttpResult<T>> {
  if (!config.baseUrl) {
    return {
      ok: false,
      error: "API base URL is not set."
    };
  }

  if (!config.tenantId) {
    return {
      ok: false,
      error: "Missing tenant ID."
    };
  }

  const headers = getAuthHeaders(config);
  const baseUrl = config.baseUrl.replace(/\/+$/, "");

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: formData
    });

    if (!response.ok) {
      let errorPayload: unknown = null;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        errorPayload = await response.json();
      } else {
        errorPayload = await response.text();
      }

      return {
        ok: false,
        error: extractErrorMessage(path, response.status, errorPayload)
      };
    }

    if (response.status === 204) {
      return {
        ok: true,
        data: undefined as T
      };
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const payload = (await response.json()) as T;
      return {
        ok: true,
        data: payload
      };
    }

    const payload = (await response.text()) as T;
    return {
      ok: true,
      data: payload
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown network error"
    };
  }
}

export async function httpGet<T>(path: string, config: ProtectedApiConfig): Promise<HttpResult<T>> {
  return httpRequest<T>("GET", path, config);
}

export async function httpPost<T>(
  path: string,
  config: ProtectedApiConfig,
  body: unknown
): Promise<HttpResult<T>> {
  return httpRequest<T>("POST", path, config, body);
}

export async function httpPut<T>(
  path: string,
  config: ProtectedApiConfig,
  body: unknown
): Promise<HttpResult<T>> {
  return httpRequest<T>("PUT", path, config, body);
}

export async function httpDelete<T>(path: string, config: ProtectedApiConfig): Promise<HttpResult<T>> {
  return httpRequest<T>("DELETE", path, config);
}

export async function httpPostForm<T>(
  path: string,
  config: ProtectedApiConfig,
  formData: FormData
): Promise<HttpResult<T>> {
  return httpRequestForm<T>("POST", path, config, formData);
}
