-- Migration: add `approved` boolean column to users table
-- Run this against your database. Example (Postgres):
-- psql $DATABASE_URL -f backend/db_migrations/001_add_approved.sql

ALTER TABLE users
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;
