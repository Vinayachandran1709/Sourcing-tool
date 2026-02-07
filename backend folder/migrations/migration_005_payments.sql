ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- ============================================
-- 2. Create payment_history table
-- ============================================

CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Razorpay identifiers
    razorpay_order_id VARCHAR(50) NOT NULL,
    razorpay_payment_id VARCHAR(50),
    razorpay_signature VARCHAR(255),
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    amount_inr DECIMAL(10, 2),
    
    -- Plan information
    plan_name VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'created',
    payment_method VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional metadata
    receipt VARCHAR(100),
    notes JSONB,
    error_message TEXT,
    
    -- Indexes
    CONSTRAINT unique_razorpay_order UNIQUE (razorpay_order_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_history_razorpay_payment_id ON payment_history(razorpay_payment_id);

-- ============================================
-- 3. Create subscription_events table (for audit trail)
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    old_plan VARCHAR(50),
    new_plan VARCHAR(50),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    triggered_by VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);

-- ============================================
-- 4. Update existing users to have default values
-- ============================================

UPDATE users 
SET auto_renew = TRUE, 
    currency = 'USD',
    subscription_amount = CASE 
        WHEN subscription_plan = 'starter' THEN 79.00
        ELSE 0.00
    END
WHERE auto_renew IS NULL;
