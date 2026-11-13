INSERT INTO portal.memberships(subject,role) VALUES ('generation-admin','admin');
INSERT INTO portal.families(id,display_name) VALUES ('21000000-0000-4000-8000-000000000001','Generation family');
INSERT INTO portal.memberships(subject,role,family_id) VALUES
 ('generation-active','parent','21000000-0000-4000-8000-000000000001'),
 ('generation-revoked','parent','21000000-0000-4000-8000-000000000001');
SELECT portal.revoke_membership('generation-admin',(SELECT id FROM portal.memberships WHERE subject='generation-revoked'));
INSERT INTO portal.memberships(subject,role) VALUES ('generation-staff','staff');
