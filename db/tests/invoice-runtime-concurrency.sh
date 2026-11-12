#!/bin/sh
set -eu
host=${1:?pass disposable host}; database=${2:?pass disposable database}; port=${PGPORT:-55439}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
wait_for() {
  attempts=0
  while ! "$@"; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 100 ]; then echo "Timed out waiting for $*" >&2; exit 1; fi
    sleep 0.1
  done
}
lock_waiting() { [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='$1' AND wait_event_type='Lock'")" = 1 ]; }
psql_test <<'SQL'
UPDATE portal.founding_slots SET family_id=NULL WHERE slot=5;
INSERT INTO portal.memberships(subject, role) VALUES ('workflow-race-admin', 'admin');
INSERT INTO portal.families(id, display_name) VALUES ('81000000-0000-0000-0000-000000000001', 'Race family');
SELECT portal.save_billing_settings('workflow-race-admin', 'Goldleaf Learning Ltd', '51 Hurst rd', false, NULL, NULL, 14, 'Bank', 'weekly', '2027-04-01');
INSERT INTO portal.invoices(id, family_id, recipient_name, recipient_address, created_by)
SELECT ('81000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid, '81000000-0000-0000-0000-000000000001', 'Parent', 'Address', m.id
FROM generate_series(2,4) i CROSS JOIN portal.memberships m WHERE m.subject='workflow-race-admin';
INSERT INTO portal.invoice_lines(invoice_id, description, quantity, unit_amount_pence, service_date, rate_tier, hourly_rate_pence, days, cadence, session_minutes, discount_percent)
SELECT id, 'Tuition', 1, 6000, '2027-01-01', 'standard', 3000, 1, 'weekly', 120, 0 FROM portal.invoices WHERE family_id='81000000-0000-0000-0000-000000000001';
CREATE TABLE public.workflow_test_context (invoice_id uuid PRIMARY KEY, context jsonb NOT NULL);
INSERT INTO public.workflow_test_context SELECT id, portal.invoice_issue_context('workflow-race-admin',id) FROM portal.invoices WHERE family_id='81000000-0000-0000-0000-000000000001';
SQL
run_race() {
  name=$1; first_sql=$2; invoice=$3
  mkfifo "$tmp/$name"
  psql_test <"$tmp/$name" >"$tmp/$name-first" 2>&1 & first=$!
  exec 3>"$tmp/$name"
  printf '%s\n' 'BEGIN;' "$first_sql" '\echo first_locked' >&3
  wait_for grep -q first_locked "$tmp/$name-first"
  PGAPPNAME="workflow-$name" psql_test -c "SELECT portal.issue_invoice_checked('workflow-race-admin','$invoice',(SELECT context FROM public.workflow_test_context WHERE invoice_id='$invoice'))" >"$tmp/$name-second" 2>&1 & second=$!
  wait_for lock_waiting "workflow-$name"
  printf '%s\n' 'COMMIT;' '\q' >&3
  exec 3>&-
  wait "$first"
  if wait "$second"; then echo "$name stale context issued" >&2; exit 1; fi
  grep -q 'invoice context changed' "$tmp/$name-second"
  [ "$(psql_test -c "SELECT count(*) FROM portal.invoices WHERE id='$invoice' AND issued_at IS NOT NULL")" = 0 ]
}
run_race settings "UPDATE portal.billing_settings SET payment_terms_days=15;" '81000000-0000-0000-0000-000000000002'
# Refresh context after the preceding race so each case isolates its own change.
psql_test -c "UPDATE public.workflow_test_context SET context=portal.invoice_issue_context('workflow-race-admin',invoice_id)" >/dev/null
run_race tag "SELECT portal.set_founding('workflow-race-admin','81000000-0000-0000-0000-000000000001',true);" '81000000-0000-0000-0000-000000000003'
psql_test -c "UPDATE public.workflow_test_context SET context=portal.invoice_issue_context('workflow-race-admin',invoice_id)" >/dev/null
run_race line "UPDATE portal.invoice_lines SET unit_amount_pence=6100 WHERE invoice_id='81000000-0000-0000-0000-000000000004';" '81000000-0000-0000-0000-000000000004'
psql_test -c "UPDATE public.workflow_test_context SET context=portal.invoice_issue_context('workflow-race-admin',invoice_id)" >/dev/null
run_race basis "UPDATE portal.invoice_lines SET quantity_basis='children' WHERE invoice_id='81000000-0000-0000-0000-000000000004';" '81000000-0000-0000-0000-000000000004'
psql_test -c 'DROP TABLE public.workflow_test_context' >/dev/null
# Duplicate draft operations serialize and return the original ID after a lost response.
psql_test <<'SQL'
CREATE TABLE public.workflow_draft_test AS
SELECT portal.invoice_draft_context('workflow-race-admin','81000000-0000-0000-0000-000000000001','["2026-01-01"]') AS context,
'{"operationId":"81000000-0000-0000-0000-000000000010","familyId":"81000000-0000-0000-0000-000000000001","recipientName":"Parent","recipientAddress":"Address","lines":[{"description":"Tuition","quantity":1,"days":1,"cadence":"weekly","serviceDate":"2026-01-01"}]}'::jsonb AS request,
'[{"description":"Tuition","quantity":1,"unit_amount_pence":6000,"service_date":"2026-01-01","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"weekly","session_minutes":120,"discount_percent":0}]'::jsonb AS lines;
SQL
mkfifo "$tmp/draft"
psql_test <"$tmp/draft" >"$tmp/draft-first" 2>&1 & first=$!
exec 3>"$tmp/draft"
printf '%s\n' 'BEGIN;' "SELECT portal.create_invoice_draft_checked('workflow-race-admin','81000000-0000-0000-0000-000000000010',request,context,lines) FROM public.workflow_draft_test;" '\echo first_locked' >&3
wait_for grep -q first_locked "$tmp/draft-first"
PGAPPNAME=workflow-draft psql_test -c "SELECT portal.create_invoice_draft_checked('workflow-race-admin','81000000-0000-0000-0000-000000000010',request,context,lines) FROM public.workflow_draft_test" >"$tmp/draft-second" 2>&1 & second=$!
wait_for lock_waiting workflow-draft
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
wait "$second"
[ "$(head -1 "$tmp/draft-first")" = "$(cat "$tmp/draft-second")" ]
[ "$(psql_test -c "SELECT count(*) FROM portal.invoice_draft_operations WHERE operation_id='81000000-0000-0000-0000-000000000010'")" = 1 ]
psql_test -c 'DROP TABLE public.workflow_draft_test' >/dev/null
