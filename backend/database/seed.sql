-- Seed patient onboarding questions matching the React frontend questionnaire
USE consentify_hub;

INSERT INTO question_master
  (question_key, section, label, field_type, placeholder, options, display_order, is_required, validation_rules)
VALUES
  ('personal.firstName', 'personal', 'First name', 'text', 'Enter your first name', NULL, 1, 1,
   JSON_OBJECT('maxLength', 60)),
  ('personal.lastName', 'personal', 'Last name', 'text', 'Enter your last name', NULL, 2, 1,
   JSON_OBJECT('maxLength', 60)),
  ('personal.dob', 'personal', 'Date of birth', 'date', NULL, NULL, 3, 1, NULL),
  ('personal.gender', 'personal', 'Gender', 'select', NULL,
   JSON_ARRAY('Male', 'Female', 'Non-binary', 'Prefer not to say'), 4, 1, NULL),
  ('personal.mobile', 'personal', 'Mobile number', 'phone', '+91', NULL, 5, 1,
   JSON_OBJECT('minLength', 7, 'maxLength', 24)),
  ('personal.email', 'personal', 'Email address', 'text', 'your.email@example.com', NULL, 6, 1,
   JSON_OBJECT('maxLength', 255)),

  ('address.line1', 'address', 'Address', 'text', 'Street address, apartment, suite, etc.', NULL, 1, 1,
   JSON_OBJECT('maxLength', 120)),
  ('address.city', 'address', 'City', 'text', 'City', NULL, 2, 1,
   JSON_OBJECT('maxLength', 60)),
  ('address.state', 'address', 'State', 'text', 'State', NULL, 3, 1,
   JSON_OBJECT('maxLength', 60)),
  ('address.country', 'address', 'Country', 'text', 'Country', NULL, 4, 1,
   JSON_OBJECT('maxLength', 60)),
  ('address.pin', 'address', 'PIN code', 'text', '6-digit PIN', NULL, 5, 1,
   JSON_OBJECT('pattern', '^[0-9]{6}$')),

  ('medical.existingConditions', 'medical', 'Existing medical conditions', 'textarea',
   'List any known conditions, or enter None', NULL, 1, 0, JSON_OBJECT('maxLength', 500)),
  ('medical.currentMedications', 'medical', 'Current medications', 'textarea',
   'List medications and dosages, or enter None', NULL, 2, 0, JSON_OBJECT('maxLength', 500)),
  ('medical.allergies', 'medical', 'Allergies', 'textarea',
   'Drug, food, or environmental allergies', NULL, 3, 0, JSON_OBJECT('maxLength', 500)),
  ('medical.previousSurgeries', 'medical', 'Previous surgeries', 'textarea',
   'List prior procedures, or enter None', NULL, 4, 0, JSON_OBJECT('maxLength', 500)),
  ('medical.emergencyContactName', 'medical', 'Emergency contact name', 'text', NULL, NULL, 5, 1,
   JSON_OBJECT('maxLength', 80)),
  ('medical.emergencyContactNumber', 'medical', 'Emergency contact number', 'phone', '+91', NULL, 6, 1,
   JSON_OBJECT('minLength', 7, 'maxLength', 24)),

  ('additional.contactMethod', 'additional', 'Preferred communication method', 'select', NULL,
   JSON_ARRAY('email', 'phone', 'sms'), 1, 1, NULL),
  ('additional.notes', 'additional', 'Additional notes', 'textarea',
   'Any other information you would like to share', NULL, 2, 0, JSON_OBJECT('maxLength', 500))
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

-- Default WellnessHub admin (password: Admin@123)
INSERT INTO admin_users (email, password_hash, full_name)
VALUES (
  'admin@wellnesshub.com',
  'wellnesshub_admin_seed:468837d7f090c2bdd6ce3c29fe4cab6e082769fe1b55866a9bcb30d9876dc693d92637b5be22d1f6b824a788267e8f7e9808e83d235a131a43126c8050df9367',
  'WellnessHub Administrator'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  is_active = 1;
