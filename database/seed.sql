-- Seed patient onboarding questions matching the React frontend questionnaire
USE consentify_hub;

INSERT INTO question_master
  (question_key, section, label, field_type, placeholder, options, display_order, is_required, validation_rules)
VALUES
  ('personal.firstName', 'personal', 'First name', 'text', 'Enter your first name', NULL, 1, 1,
   JSON_OBJECT('maxLength', 60)),
  ('personal.lastName', 'personal', 'Last name', 'text', 'Enter your last name', NULL, 2, 1,
   JSON_OBJECT('maxLength', 60)),
  ('personal.age', 'personal', 'Age', 'text', 'Enter your age', NULL, 3, 1,
   JSON_OBJECT('maxLength', 3, 'pattern', '^[0-9]+$')),
  ('personal.gender', 'personal', 'Gender', 'select', NULL,
   JSON_ARRAY('Male', 'Female', 'Non-binary', 'Prefer not to say'), 4, 1, NULL),
  ('personal.mobile', 'personal', 'Mobile number', 'phone', '+91', NULL, 5, 1,
   JSON_OBJECT('minLength', 7, 'maxLength', 24)),
  ('personal.companyName', 'personal', 'Company name', 'text', 'Enter company name', NULL, 6, 1,
   JSON_OBJECT('maxLength', 100)),
  ('personal.employeeCode', 'personal', 'Employee code', 'text', 'Enter employee code', NULL, 7, 1,
   JSON_OBJECT('maxLength', 50)),
  ('personal.email', 'personal', 'Email address', 'text', 'your.email@example.com', NULL, 8, 1,
   JSON_OBJECT('maxLength', 255))
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

UPDATE question_master
SET is_active = 0
WHERE question_key IN (
  'address.line2',
  'additional.occupation',
  'additional.income',
  'additional.comments'
);

-- Default OHCTECH admin (password: Admin@123)
INSERT INTO admin_users (email, password_hash, full_name)
VALUES (
  'admin@ohctech.com',
  'ohctech_admin_seed:468837d7f090c2bdd6ce3c29fe4cab6e082769fe1b55866a9bcb30d9876dc693d92637b5be22d1f6b824a788267e8f7e9808e83d235a131a43126c8050df9367',
  'OHCTECH Administrator'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  is_active = 1;
