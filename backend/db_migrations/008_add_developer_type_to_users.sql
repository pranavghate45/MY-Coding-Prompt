ALTER TABLE users
ADD COLUMN IF NOT EXISTS developer_type VARCHAR(32) DEFAULT 'full_stack';

UPDATE users
SET developer_type = 'full_stack'
WHERE developer_type IS NULL OR TRIM(developer_type) = '';
