import { runWorker } from "../lib/portal/alerts/worker";
import { portalOrigin } from "../lib/portal/alerts/model";

const connectionString = process.env.ALERT_LOCAL_DATABASE_URL;
if (!connectionString) throw new Error("ALERT_LOCAL_DATABASE_URL is required");
const databaseUrl = new URL(connectionString);
if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(databaseUrl.hostname) || databaseUrl.search || databaseUrl.hash) throw new Error("Only a local PostgreSQL database is allowed");
const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());
void runWorker({ connectionString, from: "Goldleaf <alerts@example.test>", origin: portalOrigin("http://localhost:3000", true), signal: controller.signal,
  identity: async () => ["recipient@example.test"], submit: async () => "sent" });
