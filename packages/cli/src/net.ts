import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

const PROXY_ENV_VARS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"] as const;

/**
 * Node's built-in `fetch` does not read the standard `HTTP(S)_PROXY` / `NO_PROXY`
 * environment variables the way tools like `curl` do. On networks that require a
 * proxy this shows up as an opaque "fetch failed". When a proxy variable is set,
 * route fetch through it so the CLI behaves like the rest of the user's tooling.
 */
export function configureProxyFromEnv(): void {
  const hasProxy = PROXY_ENV_VARS.some((name) => Boolean(process.env[name]));
  if (!hasProxy) return;
  // EnvHttpProxyAgent reads HTTP_PROXY/HTTPS_PROXY/NO_PROXY itself.
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

// Node/undici error codes that mean "the request never completed".
const NETWORK_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

const TLS_CODES = new Set([
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

function causeCode(err: Error): string | undefined {
  const cause = err.cause as { code?: unknown } | undefined;
  return typeof cause?.code === "string" ? cause.code : undefined;
}

/**
 * Turn the unhelpful `fetch failed` (and friends) into an actionable message that
 * names the underlying cause and points at the most common fixes. Returns
 * `undefined` for anything that is not a network/transport failure.
 */
export function describeNetworkError(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;
  const code = causeCode(err);
  const isNetworkFailure = err.message === "fetch failed" || (code !== undefined && NETWORK_CODES.has(code));
  if (!isNetworkFailure && !(code !== undefined && TLS_CODES.has(code))) return undefined;

  const reason = code ? ` (${code})` : "";
  const lines = [`could not reach the API${reason}.`];

  if (code && TLS_CODES.has(code)) {
    lines.push("This is a TLS/certificate problem. If a proxy or antivirus intercepts HTTPS,");
    lines.push("point Node at its root certificate via NODE_EXTRA_CA_CERTS=/path/to/ca.pem.");
  } else {
    lines.push("Check your connection and that the API URL is correct (run `teemtape config`).");
    lines.push("Behind a proxy? Set HTTPS_PROXY (and NO_PROXY for exceptions) and retry — the CLI");
    lines.push("now honors them, but Node's fetch ignores proxy settings by default (curl does not).");
  }
  lines.push("For local testing run `npm run mock` and pass --api-url http://localhost:8787.");
  return lines.join("\n  ");
}
