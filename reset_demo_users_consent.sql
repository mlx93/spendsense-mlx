-- Reset consent for 5 demo users
-- Run this in Supabase SQL Editor or via psql

UPDATE "User"
SET 
  consent_status = false,
  consent_date = NULL
WHERE LOWER(email) IN (
  LOWER('Kellen_Effertz45@gmail.com'),
  LOWER('Carrie87@hotmail.com'),
  LOWER('Jaiden.Heidenreich@gmail.com'),
  LOWER('Lenna_Stiedemann73@hotmail.com'),
  LOWER('Aimee_Oberbrunner@gmail.com')
);

-- Verify the update
SELECT email, consent_status, consent_date
FROM "User"
WHERE LOWER(email) IN (
  LOWER('Kellen_Effertz45@gmail.com'),
  LOWER('Carrie87@hotmail.com'),
  LOWER('Jaiden.Heidenreich@gmail.com'),
  LOWER('Lenna_Stiedemann73@hotmail.com'),
  LOWER('Aimee_Oberbrunner@gmail.com')
);

