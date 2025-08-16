// app/api/httpApi.ts
// Standard HTTP API client for the webapp

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
}

export async function httpApi(
  url: string,
  options: ApiRequestOptions = {}
): Promise<any> {
  const { method = "GET", headers = {}, body, params } = options;

  // Build query string for GET requests
  let fullUrl = url;
  if (params && Object.keys(params).length > 0) {
    const query = new URLSearchParams(
      params as Record<string, string>
    ).toString();
    fullUrl += (url.includes("?") ? "&" : "?") + query;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(fullUrl, fetchOptions);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  // Try to parse JSON, fallback to text
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  } else {
    return response.text();
  }
}

// Example usage:
// const data = await httpApi("/api/user", { method: "GET" });
// const created = await httpApi("/api/item", { method: "POST", body: { name: "foo" } });
