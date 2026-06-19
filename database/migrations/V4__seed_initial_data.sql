-- V4: Seed Initial Data
-- Seed patient onboarding questions
INSERT INTO question_master
  (question_key, section, label, field_type, placeholder, options, display_order, is_required, validation_rules)
VALUES
  ('personal.firstName', 'personal', 'First name', 'text', 'Enter your first name', NULL, 1, 1, JSON_OBJECT('maxLength', 60)),
  ('personal.lastName', 'personal', 'Last name', 'text', 'Enter your last name', NULL, 2, 1, JSON_OBJECT('maxLength', 60)),
  ('personal.age', 'personal', 'Age', 'text', 'Enter your age', NULL, 3, 1, JSON_OBJECT('maxLength', 3, 'pattern', '^[0-9]+$')),
  ('personal.gender', 'personal', 'Gender', 'select', NULL, JSON_ARRAY('Male', 'Female', 'Non-binary', 'Prefer not to say'), 4, 1, NULL),
  ('personal.mobile', 'personal', 'Mobile number', 'phone', '+91', NULL, 5, 1, JSON_OBJECT('minLength', 7, 'maxLength', 24)),
  ('personal.companyName', 'personal', 'Company name', 'text', 'Enter company name', NULL, 6, 1, JSON_OBJECT('maxLength', 100)),
  ('personal.employeeCode', 'personal', 'Employee code', 'text', 'Enter employee code', NULL, 7, 1, JSON_OBJECT('maxLength', 50)),
  ('personal.email', 'personal', 'Email address', 'text', 'your.email@example.com', NULL, 8, 1, JSON_OBJECT('maxLength', 255))
ON DUPLICATE KEY UPDATE
  section = VALUES(section),
  label = VALUES(label),
  field_type = VALUES(field_type),
  placeholder = VALUES(placeholder),
  options = VALUES(options),
  display_order = VALUES(display_order),
  is_required = VALUES(is_required),
  validation_rules = VALUES(validation_rules),
  is_active = 1;

-- Deactivate legacy questions
UPDATE question_master
SET is_active = 0
WHERE question_key IN ('address.line2', 'additional.occupation', 'additional.income', 'additional.comments');

-- Default OHCTECH admin (password: Admin@123)
-- Hash generated using crypto.scryptSync via the project's password.js utility
INSERT INTO admin_users (email, password_hash, full_name)
VALUES (
  'admin@ohctech.com',
  '2823697d11b89c2dce01f17f9cadaffe:a6cafe1b5902f7230f74d7bf62f66c29062862f7b9159375672d5bce640f8e4cdc6bbb10f7973f6837460b045c528a5ef5d98c0e46d25fbd9f9152d1a1495511',
  'OHCTECH Administrator'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  is_active = 1;

-- Default Settings (Placeholder)
-- CREATE TABLE IF NOT EXISTS sys_settings ...
-- INSERT INTO sys_settings ...
