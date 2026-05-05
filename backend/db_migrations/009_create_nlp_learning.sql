-- Migration: Create NLP learning table for embedding-based response caching
-- Run using: psql $DATABASE_URL -f backend/db_migrations/009_create_nlp_learning.sql

CREATE TABLE IF NOT EXISTS nlp_learning (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  embedding JSONB NOT NULL,
  source TEXT NOT NULL,
  similarity_score FLOAT,
  matched_record_id INTEGER,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_nlp_learning_user_id ON nlp_learning(user_id);
CREATE INDEX IF NOT EXISTS idx_nlp_learning_user_id_created_at ON nlp_learning(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nlp_learning_user_id_input_text ON nlp_learning(user_id, input_text);
