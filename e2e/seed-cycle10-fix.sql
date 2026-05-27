-- Fix nickname matching (lowercase 'e2e%') + re-apply
UPDATE users SET level=10, total_exp=4500 WHERE nickname ILIKE 'e2e%';

UPDATE terrariums SET evolution_stage='PALUDARIUM' WHERE user_id IN (
    SELECT id FROM users WHERE nickname ILIKE 'e2e%'
);

INSERT INTO activity_records (user_id, category_id, memo, recorded_date, created_at)
SELECT
    u.id,
    (1 + (gs % 4))::bigint,
    'memo day ' || gs,
    CURRENT_DATE - (gs || ' days')::interval,
    NOW() - (gs || ' days')::interval
FROM users u, generate_series(0, 29) gs
WHERE u.nickname ILIKE 'e2e%';

SELECT
    'records' AS t, count(*) FROM activity_records
UNION ALL SELECT 'lv10', count(*) FROM users WHERE level=10
UNION ALL SELECT 'paludarium', count(*) FROM terrariums WHERE evolution_stage='PALUDARIUM';
