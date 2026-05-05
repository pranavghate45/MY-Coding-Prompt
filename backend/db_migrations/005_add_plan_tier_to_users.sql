ALTER TABLE users
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free';

UPDATE users
SET plan_tier = CASE
  WHEN plan = 'paid' THEN 'pro'
  ELSE 'free'
END
WHERE plan_tier IS NULL OR plan_tier = '';