-- Migration: create groups and projects tables
-- Run using: psql $DATABASE_URL -f backend/db_migrations/002_create_groups_projects.sql

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name TEXT,
  members TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT,
  target TEXT,
  site_type TEXT,
  framework TEXT,
  style_system TEXT,
  backend TEXT,
  database TEXT,
  goal TEXT,
  plan TEXT,
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
