import type { ReactNode } from "react";
import { PortalLoading } from "@/components/portal/loading/PortalLoading";

export function FamilyWorkspace({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {pending && <PortalLoading label="Opening family…" variant="list" contentOnly />}
      <div hidden={pending} inert={pending}>
        {children}
      </div>
    </>
  );
}
