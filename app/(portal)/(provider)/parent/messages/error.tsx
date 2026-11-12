"use client";
import { MessageError } from "@/components/portal/messages/MessageError";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <MessageError reset={reset} />;
}
