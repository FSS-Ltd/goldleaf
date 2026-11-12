\set ON_ERROR_STOP on
-- 0013 allowed multiple publication operations for the same saved version.
INSERT INTO portal.memberships(subject,role) VALUES ('legacy-learning-admin','admin');
SELECT portal.create_family('legacy-learning-admin','Legacy','81000000-0000-4000-8000-000000000001');
SELECT portal.create_child('legacy-learning-admin','81000000-0000-4000-8000-000000000001','Child','82000000-0000-4000-8000-000000000001');
SELECT portal.schedule_child_session('legacy-learning-admin','82000000-0000-4000-8000-000000000001','2026-12-01 10:00+00',120,'83000000-0000-4000-8000-000000000001',NULL);
SELECT portal.save_learning_draft('legacy-learning-admin','83000000-0000-4000-8000-000000000001','Shared',NULL,NULL,NULL,ARRAY[]::text[],0);
SELECT fingerprint FROM portal.preview_learning_draft('legacy-learning-admin','83000000-0000-4000-8000-000000000001',1) \gset
SELECT portal.publish_learning_draft('legacy-learning-admin','83000000-0000-4000-8000-000000000001',1,'84000000-0000-4000-8000-000000000001',:'fingerprint');
SELECT portal.publish_learning_draft('legacy-learning-admin','83000000-0000-4000-8000-000000000001',1,'84000000-0000-4000-8000-000000000002',:'fingerprint');
