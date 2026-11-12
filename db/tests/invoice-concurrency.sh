#!/bin/sh
set -eu
host=$1
database=$2
port=${PGPORT:-55439}
psql_cmd="psql -X -q -v ON_ERROR_STOP=1 -h $host -p $port -d $database"
$psql_cmd <<'SQL'
INSERT INTO portal.memberships(subject, role) VALUES ('race-invoice-admin', 'admin');
INSERT INTO portal.families(id, display_name) VALUES ('90000000-0000-0000-0000-000000000001', 'Race family');
SELECT portal.save_billing_settings('race-invoice-admin', 'Goldleaf Learning Ltd', '51 Hurst rd', false, NULL, NULL, 14, 'Bank', 'weekly', NULL);
INSERT INTO portal.invoices(id, family_id, recipient_name, recipient_address, created_by)
SELECT '90000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', 'Parent', 'Address', id FROM portal.memberships WHERE subject='race-invoice-admin';
INSERT INTO portal.invoice_lines(invoice_id, description, quantity, unit_amount_pence, service_date, rate_tier, hourly_rate_pence, days, cadence, session_minutes, discount_percent)
VALUES ('90000000-0000-0000-0000-000000000002', 'Tuition', 1, 6000, '2027-01-01', 'standard', 3000, 1, 'weekly', 120, 0);
SQL
$psql_cmd -c "SELECT portal.issue_invoice('race-invoice-admin', '90000000-0000-0000-0000-000000000002')" >/dev/null &
pid1=$!
$psql_cmd -c "SELECT portal.issue_invoice('race-invoice-admin', '90000000-0000-0000-0000-000000000002')" >/dev/null &
pid2=$!
wait "$pid1"
wait "$pid2"
$psql_cmd -c "SELECT portal.record_invoice_payment('race-invoice-admin', '90000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003', 6000, '2027-01-02', 'ref')" >/dev/null &
pid1=$!
$psql_cmd -c "SELECT portal.record_invoice_payment('race-invoice-admin', '90000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003', 6000, '2027-01-02', 'ref')" >/dev/null &
pid2=$!
wait "$pid1"
wait "$pid2"
$psql_cmd <<'SQL'
DO $$ BEGIN
 IF (SELECT last_number FROM portal.invoice_number_counter) <> 1 OR (SELECT count(*) FROM portal.invoice_payments) <> 1 THEN RAISE EXCEPTION 'concurrent replay duplicated'; END IF;
END $$;
SQL
$psql_cmd <<'SQL'
INSERT INTO portal.invoices(id, family_id, recipient_name, recipient_address, created_by)
SELECT '90000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001', 'Parent', 'Address', id FROM portal.memberships WHERE subject='race-invoice-admin';
INSERT INTO portal.invoice_lines(invoice_id, description, quantity, unit_amount_pence, service_date, rate_tier, hourly_rate_pence, days, cadence, session_minutes, discount_percent)
VALUES ('90000000-0000-0000-0000-000000000004', 'Tuition', 1, 6000, '2027-01-01', 'standard', 3000, 1, 'weekly', 120, 0);
SELECT portal.issue_invoice('race-invoice-admin', '90000000-0000-0000-0000-000000000004');
SQL
$psql_cmd -c "SELECT portal.record_invoice_payment('race-invoice-admin', '90000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000005', 6000, '2027-01-02', 'ref')" >/dev/null 2>&1 &
pid1=$!
$psql_cmd -c "SELECT portal.record_invoice_payment('race-invoice-admin', '90000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000006', 6000, '2027-01-02', 'ref')" >/dev/null 2>&1 &
pid2=$!
status1=0
status2=0
wait "$pid1" || status1=$?
wait "$pid2" || status2=$?
if [ "$status1" -eq "$status2" ]; then
  echo 'Expected one competing payment to succeed and one to fail' >&2
  exit 1
fi
$psql_cmd <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.invoice_payments WHERE invoice_id='90000000-0000-0000-0000-000000000004') <> 1 THEN RAISE EXCEPTION 'concurrent payments overpaid'; END IF;
END $$;
SQL
