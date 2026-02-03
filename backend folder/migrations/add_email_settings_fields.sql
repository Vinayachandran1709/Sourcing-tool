-- Add new email settings columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_subject VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reply_method VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reply_link VARCHAR(500);

-- Update existing users with defaults
UPDATE users 
SET sender_name = name,
    email_subject = 'Exciting opportunity at ' || company,
    reply_method = 'email'
WHERE sender_name IS NULL;