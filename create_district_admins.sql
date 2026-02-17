-- Create District Admin Accounts
-- Password: District123

INSERT INTO users (email, password_hash, full_name, role, district_id, is_active)
VALUES ('gasabo.admin@rnp.gov.rw', '$2a$10$YSqS4FZqXdPI.Qjk.oBOA.NOTfMOE2GxEoR0QOBmcIXisv3XMvA/6', 'Gasabo District Admin', 'district_admin', 2, true)
ON CONFLICT (email) DO UPDATE SET role = 'district_admin', district_id = 2, full_name = 'Gasabo District Admin';

INSERT INTO users (email, password_hash, full_name, role, district_id, is_active)
VALUES ('kicukiro.admin@rnp.gov.rw', '$2a$10$YSqS4FZqXdPI.Qjk.oBOA.NOTfMOE2GxEoR0QOBmcIXisv3XMvA/6', 'Kicukiro District Admin', 'district_admin', 3, true)
ON CONFLICT (email) DO UPDATE SET role = 'district_admin', district_id = 3, full_name = 'Kicukiro District Admin';

INSERT INTO users (email, password_hash, full_name, role, district_id, is_active)
VALUES ('nyarugenge.admin@rnp.gov.rw', '$2a$10$YSqS4FZqXdPI.Qjk.oBOA.NOTfMOE2GxEoR0QOBmcIXisv3XMvA/6', 'Nyarugenge District Admin', 'district_admin', 1, true)
ON CONFLICT (email) DO UPDATE SET role = 'district_admin', district_id = 1, full_name = 'Nyarugenge District Admin';

-- Verify
SELECT id, email, full_name, role, district_id FROM users WHERE role = 'district_admin';
