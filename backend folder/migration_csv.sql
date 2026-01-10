-- Add CSV export tracking to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS usage_csv_exports INTEGER DEFAULT 0;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'usage_csv_exports';