/**
 * HTTPBaseReturnType
 *
 * The base return type for all HTTP requests made by _request.
 * Provides detailed information about the HTTP response, including status, headers, body, and metadata.
 *
 * @template T - The type of the parsed response body (usually JSON or string).
 */
export interface HTTPBaseReturnType<T = unknown> {
  /**
   * The HTTP status code returned by the server (e.g., 200, 404, 500).
   */
  status: number;

  /**
   * The HTTP status text returned by the server (e.g., "OK", "Not Found").
   */
  statusText: string;

  /**
   * The parsed response body. If the response is JSON, this will be the parsed object; otherwise, a string.
   */
  data: T;

  /**
   * The raw response body as a string (useful for debugging or non-JSON responses).
   */
  rawBody: string;

  /**
   * The response headers as a plain object (header names are lowercased).
   */
  headers: Record<string, string>;

  /**
   * The final URL after any redirects.
   */
  url: string;

  /**
   * True if the response was successful (status in the range 200-299).
   */
  ok: boolean;
}
// app/api/httpApi.ts
// Standard HTTP API client for the webapp

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
}


