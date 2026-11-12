\set ON_ERROR_STOP on
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.published_learning_updates WHERE session_id='83000000-0000-4000-8000-000000000001' AND draft_version=1)<>2 THEN RAISE EXCEPTION 'legacy publications changed'; END IF;
END $$;
SELECT fingerprint FROM portal.preview_learning_draft('legacy-learning-admin','83000000-0000-4000-8000-000000000001',1) \gset
SELECT portal.publish_learning_draft('legacy-learning-admin','83000000-0000-4000-8000-000000000001',1,'84000000-0000-4000-8000-000000000003',:'fingerprint') AS retry \gset
SELECT id = :'retry'::uuid AS matches FROM portal.published_learning_updates WHERE session_id='83000000-0000-4000-8000-000000000001' ORDER BY published_at,id LIMIT 1 \gset
\if :matches
\else
\quit 1
\endif
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.published_learning_updates WHERE session_id='83000000-0000-4000-8000-000000000001' AND draft_version=1)<>2 THEN RAISE EXCEPTION 'legacy retry inserted a publication'; END IF;
END $$;
