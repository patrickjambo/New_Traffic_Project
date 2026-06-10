-- Migration 011: Add hospital_admin role and district_admin/co_admin to role constraint
-- Drops the old restrictive CHECK and replaces it with all known roles

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('public', 'police', 'admin', 'district_admin', 'co_admin', 'hospital_admin'));
