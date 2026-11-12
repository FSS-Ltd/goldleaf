import type {
  readAdminInvoice,
  listInvoicePayments,
  listInvoicePaymentIntents,
} from "@/lib/portal/invoices";
import type { listInvoiceNotifications } from "@/lib/portal/invoice-notifications";
import { InvoiceDocument } from "./InvoiceDocument";
import { NotificationForm, PrepareNotifications } from "./InvoiceActions";
import { PaymentForm } from "./PaymentForm";
import { card, invoiceDate, pounds, subcard } from "./format";

type AdminInvoice = NonNullable<Awaited<ReturnType<typeof readAdminInvoice>>>;
type Snapshot = NonNullable<AdminInvoice["snapshot"]>;

type IssuedProps = {
  invoice: AdminInvoice;
  snapshot: Snapshot;
  familyName: string;
  notices: Awaited<ReturnType<typeof listInvoiceNotifications>>;
  payments: Awaited<ReturnType<typeof listInvoicePayments>>;
  intents: Awaited<ReturnType<typeof listInvoicePaymentIntents>>;
};
export function AdminIssuedInvoice({
  invoice,
  snapshot,
  familyName,
  notices,
  payments,
  intents,
}: IssuedProps) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <InvoiceDocument
        invoice={{
          id: invoice.id,
          snapshot: snapshot,
          paid_pence: invoice.paid_pence,
        }}
      />
      <div className="space-y-6">
        <div className={card}>
          <p className="mb-4 text-sm text-[#35594a]">
            Invoice {snapshot.number} · {familyName}
          </p>
          <PaymentForm
            invoiceId={invoice.id}
            remaining={snapshot.total_pence - invoice.paid_pence}
            pendingIntent={
              intents.find((intent) => intent.status === "pending") ?? null
            }
          />
          {payments.length > 0 && (
            <div className="mt-7 border-t border-[#e3d7c3] pt-4">
              <h3 className="!font-sans !text-sm font-semibold">
                Recorded payments
              </h3>
              <ul className="mt-2 divide-y divide-[#e3d7c3]">
                {payments.map((payment, index) => (
                  <li
                    key={index}
                    className="flex flex-wrap justify-between gap-2 py-2 text-sm"
                  >
                    <span>
                      {invoiceDate(payment.paid_on)} · {payment.reference}
                    </span>
                    <span>{pounds(payment.amount_pence)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <section className={card}>
          <h2 className="!text-xl">Parent notifications</h2>
          <p className="mt-2 text-sm text-[#35594a]">
            Send a link to the protected invoice to active parents.
          </p>
          {notices.length ? (
            <ul className="mt-4 space-y-5">
              {notices.map((notice, index) => (
                <li key={notice.id} className={subcard}>
                  <p className="mb-3 text-sm font-medium">
                    Parent {index + 1} ·{" "}
                    {notice.status === "sent"
                      ? "Accepted by email provider"
                      : notice.status === "uncertain"
                        ? "Delivery unconfirmed"
                        : notice.status === "failed"
                          ? "Not sent"
                          : notice.status === "sending"
                            ? "Sending or unconfirmed"
                            : "Pending"}
                  </p>
                  <NotificationForm
                    invoiceId={invoice.id}
                    notificationId={notice.id}
                    mayDuplicate={notice.may_duplicate}
                    status={notice.status}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="my-4 text-sm">
              No active parents are available to notify.
            </p>
          )}
          <div className="mt-4">
            <PrepareNotifications invoiceId={invoice.id} />
          </div>
        </section>
      </div>
    </div>
  );
}
