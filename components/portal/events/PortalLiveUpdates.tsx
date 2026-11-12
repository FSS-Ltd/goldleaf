"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  cancelUnconsumedStream,
  consumePortalEvents,
} from "@/lib/portal/events-reader";
import { getBoundEventToken } from "@/lib/portal/events-session";
import { sameSession } from "@/lib/portal/session-binding";

// One instance per authenticated portal view. Refresh always rechecks server authority.
export function PortalLiveUpdates({
  role,
}: {
  role: "admin" | "parent" | "staff";
}) {
  const { isLoaded, userId, sessionId } = useAuth();
  const clerk = useClerk();
  const router = useRouter();
  const [unavailable, setUnavailable] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isLoaded || !userId || !sessionId) return;
    const expected = { userId, sessionId };
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let paused = false;
    let hardStop = false;
    const sameActor = () =>
      sameSession(expected, clerk.session?.id, clerk.user?.id) &&
      !abort.signal.aborted;
    const connect = async () => {
      if (!sameActor() || paused) return;
      try {
        if (clerk.session?.id !== expected.sessionId) return;
        const session = clerk.session;
        const token = await getBoundEventToken(
          { ...expected, signal: abort.signal },
          () => ({ sessionId: clerk.session?.id, userId: clerk.user?.id }),
          () => session.getToken(),
        );
        if (!sameActor() || clerk.session?.id !== expected.sessionId) return;
        if (!token) {
          setUnavailable(true);
          paused = true;
          hardStop = true;
          return;
        }
        const response = await fetch(`/api/portal/events?role=${role}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: abort.signal,
        });
        if (!sameActor()) {
          await cancelUnconsumedStream(response.body);
          return;
        }
        if (
          [401, 403].includes(response.status) ||
          response.headers.get("X-Portal-Events-Configuration") === "missing"
        ) {
          await cancelUnconsumedStream(response.body);
          setUnavailable(true);
          paused = true;
          hardStop = true;
          return;
        }
        if (!response.ok || !response.body) {
          await cancelUnconsumedStream(response.body);
          throw new Error("Stream unavailable");
        }
        const connectedAt = Date.now();
        await consumePortalEvents(response.body, sameActor, (type) => {
          if (type === "ready") {
            setUnavailable(false);
            router.refresh();
          } else if (type === "change" || type === "access_changed") {
            router.refresh();
          } else if (type === "unavailable") {
            setUnavailable(true);
            paused = true;
            hardStop = true;
            return false;
          }
          return true;
        });
        if (Date.now() - connectedAt >= 10_000) attempts = 0;
      } catch {
        if (!sameActor()) return;
      }
      if (!sameActor() || paused) return;
      if (++attempts > 5) {
        paused = true;
        setUnavailable(true);
        return;
      }
      timer = setTimeout(
        () => void connect(),
        Math.min(1000 * 2 ** (attempts - 1), 16000),
      );
    };
    const wake = () => {
      if (
        !paused ||
        hardStop ||
        !navigator.onLine ||
        document.visibilityState !== "visible"
      )
        return;
      paused = false;
      attempts = 0;
      void connect();
    };
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    void connect();
    return () => {
      abort.abort();
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [isLoaded, userId, sessionId, clerk, router, retry, role]);
  return unavailable ? (
    <p role="status">
      Live updates unavailable.{" "}
      <button
        type="button"
        onClick={() => setRetry((value) => value + 1)}
        className="underline"
      >
        Retry
      </button>
    </p>
  ) : null;
}
