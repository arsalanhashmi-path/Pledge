-- 1. Clear existing bad data
truncate table leaderboard_stats;

-- 2. Repopulate with Correct Logic (using FULL OUTER JOIN)
WITH given AS (
  SELECT from_user_id as user_id, count(*) as cnt 
  FROM receipts 
  WHERE status = 'ACCEPTED' 
  GROUP BY from_user_id
),
received AS (
  SELECT to_user_id as user_id, count(*) as cnt 
  FROM receipts 
  WHERE status = 'ACCEPTED' AND to_user_id IS NOT NULL 
  GROUP BY to_user_id
)
INSERT INTO leaderboard_stats (user_id, given_count, received_count)
SELECT 
  coalesce(given.user_id, received.user_id) as user_id,
  coalesce(given.cnt, 0) as given_count,
  coalesce(received.cnt, 0) as received_count
FROM given
FULL OUTER JOIN received ON given.user_id = received.user_id;

-- 3. (Optional) Force refresh of everything just in case
update leaderboard_stats set last_updated = now();
