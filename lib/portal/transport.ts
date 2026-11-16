import { neonConfig } from "@neondatabase/serverless";

const localHost = /^(?:localhost|127\.0\.0\.1|\[::1\]|db\.localtest\.me)$/;
const loopbackProxy = /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?$/;

function validDatabase(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    const authority = value.match(
      /^postgres(?:ql)?:\/\/([^/\s?#]+)\/goldleaf_auth_qa$/,
    )?.[1];
    const host = authority?.slice(authority.lastIndexOf("@") + 1).replace(/:\d+$/, "");
    return (
      (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
      !!host &&
      localHost.test(host) &&
      url.pathname === "/goldleaf_auth_qa"
    );
  } catch {
    return false;
  }
}

export function localPortalTransport(
  env: Readonly<Record<string, string | undefined>>,
): { fetchEndpoint: string; wsProxy: string; requestTimeoutMs: number } | undefined {
  const proxy = env.GOLDLEAF_PORTAL_LOCAL_PROXY_URL;
  if (!proxy) return undefined;
  if (
    env.NODE_ENV !== "development" ||
    !loopbackProxy.test(proxy) ||
    !validDatabase(env.GOLDLEAF_PORTAL_DATABASE_URL) ||
    !validDatabase(env.GOLDLEAF_PORTAL_EVENT_DATABASE_URL)
  ) {
    throw new Error("Invalid local portal transport configuration");
  }
  let parsed: URL;
  try {
    parsed = new URL(proxy);
  } catch {
    throw new Error("Invalid local portal transport configuration");
  }
  // Local proxy handshakes need a bounded budget beyond the production deadline.
  return { fetchEndpoint: `${parsed.origin}/sql`, wsProxy: `${parsed.host}/v1`, requestTimeoutMs: 30_000 };
}

export function configurePortalTransport(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ReturnType<typeof localPortalTransport> {
  const config = localPortalTransport(env);
  if (config) {
    neonConfig.fetchEndpoint = (host) => {
      if (!localHost.test(host)) throw new Error("Invalid local portal database host");
      return config.fetchEndpoint;
    };
  }
  return config;
}
