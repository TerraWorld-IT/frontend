-- TerraWorld cycle 10 e2e seed SQL
-- 실행:
--   docker exec -i tw-dev-postgres psql -U terraworld -d terraworld < frontend/e2e/seed-cycle10.sql
-- 또는:
--   docker exec tw-dev-postgres psql -U terraworld -d terraworld -f /tmp/seed-cycle10.sql
--   (먼저 docker cp frontend/e2e/seed-cycle10.sql tw-dev-postgres:/tmp/)

-- 1) Shop items 카탈로그 (12개: 식물 4 + 피규어 4 + 배경 2 + 카테고리 2)
INSERT INTO items (name, description, category_id, price_type, price_amount, rarity, asset_url, width, height, layout, is_animated) VALUES
('새싹', '아주 작은 새싹', 1, 'BASIC_COIN', 50, 'COMMON', '/items/sprout.png', 200, 200, 'FOREGROUND', false),
('파란 꽃', '시원한 파란 꽃', 1, 'BASIC_COIN', 100, 'COMMON', '/items/blue-flower.png', 220, 220, 'FOREGROUND', false),
('잔디', '평범한 잔디', 1, 'BASIC_COIN', 20, 'COMMON', '/items/grass.png', 180, 80, 'FOREGROUND', false),
('해바라기', '여름 해바라기', 1, 'BASIC_COIN', 80, 'COMMON', '/items/sunflower.png', 220, 320, 'FOREGROUND', false),
('큰 나무', '거대한 떡갈나무', 2, 'CATEGORY_TOKEN', 30, 'RARE', '/items/big-tree.png', 360, 480, 'FOREGROUND', false),
('보름달', '신비한 달', 3, 'SPECIAL_COIN', 5, 'EPIC', '/items/full-moon.png', 240, 240, 'BACKGROUND', true),
('밤하늘 배경', '별빛이 가득한 밤하늘', NULL, 'SPECIAL_COIN', 8, 'EPIC', '/items/night-sky.png', 1080, 1920, 'BACKGROUND', false),
('숲 배경', '깊은 숲', NULL, 'BASIC_COIN', 150, 'RARE', '/items/forest.png', 1080, 1920, 'BACKGROUND', false),
('고양이 피규어', '귀여운 고양이', NULL, 'CATEGORY_TOKEN', 20, 'RARE', '/items/cat-figure.png', 280, 280, 'FIGURE', true),
('강아지 피규어', '활발한 강아지', NULL, 'CATEGORY_TOKEN', 20, 'RARE', '/items/dog-figure.png', 280, 280, 'FIGURE', true),
('토끼 피규어', '하얀 토끼', NULL, 'SPECIAL_COIN', 3, 'EPIC', '/items/rabbit-figure.png', 240, 280, 'FIGURE', true),
('병아리 피규어', '노란 병아리', NULL, 'BASIC_COIN', 200, 'COMMON', '/items/chick-figure.png', 200, 200, 'FIGURE', false);

-- 2) 가장 최근 가입 user 1명을 ADMIN 으로 격상 (e2e seed 용)
UPDATE users SET role='ADMIN' WHERE id IN (
    SELECT id FROM users ORDER BY created_at DESC LIMIT 1
);

-- 3) 모든 test user 의 level 을 10 으로 + total_exp 4500 (V2 seed 2차 곡선 만렙 수준 — 진화 unlock)
UPDATE users SET level=10, total_exp=4500 WHERE nickname LIKE 'E2E%';

-- 4) Terrarium evolution_stage = PALUDARIUM (진화 2단계 → 5단계 모달의 unlock 표시)
UPDATE terrariums SET evolution_stage='PALUDARIUM' WHERE user_id IN (
    SELECT id FROM users WHERE nickname LIKE 'E2E%'
);

-- 5) activity_records 30 day INSERT (모든 E2E user 에 대해 — 캘린더 + 랭킹 데이터)
INSERT INTO activity_records (user_id, category_id, memo, recorded_date, created_at)
SELECT
    u.id,
    (1 + (gs % 4))::bigint AS category_id,
    '오늘 활동 ' || gs || '일차',
    CURRENT_DATE - (gs || ' days')::interval,
    NOW() - (gs || ' days')::interval
FROM users u, generate_series(0, 29) gs
WHERE u.nickname LIKE 'E2E%';

-- 6) user_items — 첫 admin user 에게 식물 + 피규어 4종 보유
INSERT INTO user_items (user_id, item_id, quantity, acquired_at)
SELECT
    u.id,
    i.id,
    1,
    NOW()
FROM users u
CROSS JOIN items i
WHERE u.role = 'ADMIN' AND i.id <= 8
LIMIT 32;

-- 결과
SELECT 'items' AS table_name, count(*) FROM items
UNION ALL SELECT 'records', count(*) FROM activity_records
UNION ALL SELECT 'admins', count(*) FROM users WHERE role='ADMIN'
UNION ALL SELECT 'user_items', count(*) FROM user_items;
