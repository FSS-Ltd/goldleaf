#!/bin/sh
set -eu
host=${1:?pass the disposable host}; database=${2:?pass the disposable database}; port=${PGPORT:-55439}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
wait_for() {
  attempts=0
  while ! "$@"; do
    attempts=$((attempts + 1)); if [ "$attempts" -ge 100 ]; then echo "Timed out waiting for $*" >&2; exit 1; fi
    sleep 0.1
  done
}
waiting() { [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='$1' AND wait_event_type='Lock'")" = 1 ]; }
psql_test <<'SQL'
INSERT INTO portal.invoices(id,family_id,recipient_name,recipient_address,created_by)
SELECT '85000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','Parent','Address',id FROM portal.memberships WHERE subject='ui-invoice-admin';
INSERT INTO portal.invoice_lines(invoice_id,description,quantity,unit_amount_pence,service_date,rate_tier,hourly_rate_pence,days,cadence,session_minutes,discount_percent)
VALUES ('85000000-0000-4000-8000-000000000001','Tuition',1,6000,'2020-01-01','standard',3000,1,'weekly',120,0);
SELECT portal.issue_invoice_checked('ui-invoice-admin','85000000-0000-4000-8000-000000000001',portal.invoice_issue_context('ui-invoice-admin','85000000-0000-4000-8000-000000000001'));
SQL
# Concurrent reservations with one operation converge to a single durable intent.
mkfifo "$tmp/reserve"
psql_test <"$tmp/reserve" >"$tmp/reserve-first" 2>&1 & first=$!
exec 3>"$tmp/reserve"
printf '%s\n' 'BEGIN;' "SELECT portal.prepare_invoice_payment('ui-invoice-admin','85000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000004',2500,'2027-01-02','partial');" '\echo reserve_locked' >&3
wait_for grep -q reserve_locked "$tmp/reserve-first"
PGAPPNAME=invoice-reserve-race psql_test -c "SELECT portal.prepare_invoice_payment('ui-invoice-admin','85000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000004',2500,'2027-01-02','partial')" >"$tmp/reserve-second" 2>&1 & second=$!
PGAPPNAME=invoice-other-reserve psql_test -c "SELECT portal.prepare_invoice_payment('ui-invoice-admin','85000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000005',2500,'2027-01-02','other')" >"$tmp/reserve-other" 2>&1 & third=$!
wait_for waiting invoice-reserve-race
wait_for waiting invoice-other-reserve
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
wait "$second"
if wait "$third"; then echo 'Concurrent different payment intent succeeded' >&2; exit 1; fi
grep -q 'one_pending_payment_per_invoice' "$tmp/reserve-other"
grep -qx pending "$tmp/reserve-second"
# A new backend can recover the intent after the reserving client disappears.
[ "$(psql_test -c "SELECT count(*) FROM portal.list_invoice_payment_intents('ui-invoice-admin','85000000-0000-4000-8000-000000000001') WHERE status='pending'")" = 1 ]
mkfifo "$tmp/payment"
psql_test <"$tmp/payment" >"$tmp/payment-first" 2>&1 & first=$!
exec 3>"$tmp/payment"
printf '%s\n' 'BEGIN;' "SELECT portal.complete_invoice_payment('ui-invoice-admin','85000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000004');" '\echo payment_locked' >&3
wait_for grep -q payment_locked "$tmp/payment-first"
PGAPPNAME=invoice-complete-race psql_test -c "SELECT portal.complete_invoice_payment('ui-invoice-admin','85000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000004')" >"$tmp/payment-second" 2>&1 & second=$!
PGAPPNAME=invoice-payment-check psql_test -F '|' -c "SELECT * FROM portal.read_invoice_payment_operation('ui-invoice-admin','85000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000004')" >"$tmp/payment-check" 2>&1 & third=$!
wait_for waiting invoice-complete-race
wait_for waiting invoice-payment-check
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
wait "$second"
wait "$third"
grep -qx recorded "$tmp/payment-second"
grep -qx '2500|2027-01-02|partial' "$tmp/payment-check"
[ "$(psql_test -c "SELECT count(*) FROM portal.invoice_payments WHERE operation_id='85000000-0000-4000-8000-000000000004'")" = 1 ]
notice=$(psql_test -c "SELECT id FROM portal.invoice_notifications WHERE invoice_id='85000000-0000-4000-8000-000000000001'")
mkfifo "$tmp/input"
psql_test <"$tmp/input" >"$tmp/first" 2>&1 & first=$!
exec 3>"$tmp/input"
printf '%s\n' 'BEGIN;' "SELECT * FROM portal.claim_invoice_notification('ui-invoice-admin','$notice','85000000-0000-4000-8000-000000000002','parent@example.com','Goldleaf <billing@example.com>','https://goldleaf.example',false);" '\echo claimed' >&3
wait_for grep -q claimed "$tmp/first"
PGAPPNAME=invoice-notification-race psql_test -c "SELECT * FROM portal.claim_invoice_notification('ui-invoice-admin','$notice','85000000-0000-4000-8000-000000000003','parent@example.com','Goldleaf <billing@example.com>','https://goldleaf.example',false)" >"$tmp/second" 2>&1 & second=$!
wait_for waiting invoice-notification-race
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
if wait "$second"; then echo 'Concurrent notification claim succeeded' >&2; exit 1; fi
grep -q 'notification in progress' "$tmp/second"
psql_test <<SQL
SELECT portal.finish_invoice_notification('ui-invoice-admin','$notice',(SELECT claim_id FROM portal.invoice_notifications WHERE id='$notice'),'uncertain');
UPDATE portal.memberships SET revoked_at=clock_timestamp() WHERE subject='ui-invoice-parent';
DO \$\$ BEGIN
 BEGIN PERFORM portal.claim_invoice_notification('ui-invoice-admin','$notice',gen_random_uuid(),'parent@example.com','Goldleaf <billing@example.com>','https://goldleaf.example',false); RAISE EXCEPTION 'revoked parent claimed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END \$\$;
SQL
