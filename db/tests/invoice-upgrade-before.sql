\set ON_ERROR_STOP on
INSERT INTO portal.families(id, display_name) VALUES ('90000000-0000-0000-0000-000000000011', 'Existing family');
INSERT INTO portal.memberships(subject, role, family_id) VALUES ('existing-invoice-parent', 'parent', '90000000-0000-0000-0000-000000000011');
