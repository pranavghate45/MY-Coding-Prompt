CREATE TABLE IF NOT EXISTS onboarding_profiles (
  id SERIAL PRIMARY KEY,
  user_email TEXT UNIQUE NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'pro',
  assistant_type TEXT NOT NULL DEFAULT 'coding',
  answers_json TEXT,
  generated_plan TEXT,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_user_email
ON onboarding_profiles(user_email);