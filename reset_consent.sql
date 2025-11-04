-- SQL script to reset consent_status to false for all users in Supabase
-- Run this in your Supabase SQL editor or via psql

-- Reset consent for all regular users (not operators)
UPDATE "User"
SET 
  consent_status = false,
  consent_date = NULL
WHERE role = 'user';

-- Verify the update
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE consent_status = true) as consented_users,
  COUNT(*) FILTER (WHERE consent_status = false) as non_consented_users
FROM "User"
WHERE role = 'user';

