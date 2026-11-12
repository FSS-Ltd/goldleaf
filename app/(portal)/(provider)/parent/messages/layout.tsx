import type { ReactNode } from "react";
import { MessageDraftLayout } from "@/components/portal/messages/MessageDraftLayout";
export default function Layout({ children }: { children: ReactNode }) {
  return <MessageDraftLayout role="parent">{children}</MessageDraftLayout>;
}
