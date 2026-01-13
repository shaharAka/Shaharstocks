-- Script to promote user to admin and super admin
-- Run this via Cloud SQL or GCP Console

-- Update user to admin, super admin, verified, and active subscription
UPDATE users 
SET 
  is_admin = true,
  is_super_admin = true,
  email_verified = true,
  subscription_status = 'active',
  subscription_start_date = NOW()
WHERE email = 'shaharro@gmail.com';

-- Verify the update
SELECT id, email, name, is_admin, is_super_admin, email_verified, subscription_status
FROM users 
WHERE email = 'shaharro@gmail.com';

