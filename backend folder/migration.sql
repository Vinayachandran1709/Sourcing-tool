-- =====================================================
-- MIGRATION: Add Email Settings to User Model
-- Date: 2025-01-10
-- Description: Add sender_email, email_template, and 
--              sender_email_verified to users table
--              Add user_id to email_outreach table
-- =====================================================

-- Step 1: Add email settings columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS sender_email VARCHAR,
ADD COLUMN IF NOT EXISTS email_template TEXT,
ADD COLUMN IF NOT EXISTS sender_email_verified BOOLEAN DEFAULT FALSE;

-- Step 2: Add user_id to email_outreach table
ALTER TABLE email_outreach
ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Step 3: Add foreign key constraint
ALTER TABLE email_outreach
ADD CONSTRAINT fk_email_outreach_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 4: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_outreach_user_id ON email_outreach(user_id);
CREATE INDEX IF NOT EXISTS idx_email_outreach_sent_at ON email_outreach(sent_at);

-- =====================================================
-- VERIFICATION QUERIES (Run these to verify)
-- =====================================================

-- Check if columns were added to users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('sender_email', 'email_template', 'sender_email_verified');

-- Check if user_id was added to email_outreach
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'email_outreach'
AND column_name = 'user_id';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'email_outreach';

-- =====================================================
-- ROLLBACK (If needed - DANGEROUS!)
-- =====================================================

/*
-- Uncomment to rollback (NOT RECOMMENDED in production)

DROP INDEX IF EXISTS idx_email_outreach_sent_at;
DROP INDEX IF EXISTS idx_email_outreach_user_id;

ALTER TABLE email_outreach DROP CONSTRAINT IF EXISTS fk_email_outreach_user;
ALTER TABLE email_outreach DROP COLUMN IF EXISTS user_id;

ALTER TABLE users DROP COLUMN IF EXISTS sender_email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS email_template;
ALTER TABLE users DROP COLUMN IF EXISTS sender_email;
*/