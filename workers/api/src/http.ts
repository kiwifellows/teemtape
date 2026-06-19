const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,accept,x-api-key",
};

export function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS, ...extraHeaders },
  });
}

export function error(message: string, status = 400, extraHeaders?: Record<string, string>): Response {
  return json({ error: message }, status, extraHeaders);
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** A handled, client-facing error with an HTTP status and optional extra response headers. */
export class HttpError extends Error {
  readonly status: number;
  readonly extraHeaders?: Record<string, string>;
  constructor(status: number, message: string, extraHeaders?: Record<string, string>) {
    super(message);
    this.status = status;
    this.extraHeaders = extraHeaders;
  }
}
