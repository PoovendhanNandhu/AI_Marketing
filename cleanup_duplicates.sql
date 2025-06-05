-- Script to identify and clean up duplicate user subscriptions

-- First, identify users with multiple subscriptions
WITH users_with_multiple_subs AS (
  SELECT user_id, COUNT(*) as subscription_count
  FROM user_subscriptions
  GROUP BY user_id
  HAVING COUNT(*) > 1
)

-- Select all duplicate subscriptions (keeping only the newest one for each user)
, duplicate_subs AS (
  SELECT us.id
  FROM user_subscriptions us
  JOIN users_with_multiple_subs m ON us.user_id = m.user_id
  WHERE us.id NOT IN (
    -- This subquery selects the most recent subscription for each user
    SELECT DISTINCT ON (user_id) id
    FROM user_subscriptions
    WHERE user_id IN (SELECT user_id FROM users_with_multiple_subs)
    ORDER BY user_id, created_at DESC
  )
)

-- Uncomment to delete duplicates
-- DELETE FROM user_subscriptions
-- WHERE id IN (SELECT id FROM duplicate_subs);

-- View the duplicates to be cleaned up
SELECT us.*
FROM user_subscriptions us
JOIN duplicate_subs d ON us.id = d.id
ORDER BY us.user_id, us.created_at DESC; 