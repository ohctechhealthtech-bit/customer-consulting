-- V1: Initial Schema - Core Tables
-- company_master
CREATE TABLE IF NOT EXISTS company_master (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_company_name (company_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- customer_master
CREATE TABLE IF NOT EXISTS customer_master (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  reference_number VARCHAR(32) DEFAULT NULL,
  first_name VARCHAR(60) DEFAULT NULL,
  last_name VARCHAR(60) DEFAULT NULL,
  mobile VARCHAR(24) DEFAULT NULL,
  age INT DEFAULT NULL,
  company_id INT UNSIGNED DEFAULT NULL,
  employee_code VARCHAR(100) DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  last_password_change DATETIME DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_customer_email (email),
  UNIQUE KEY uk_customer_reference (reference_number),
  KEY idx_customer_created (created_at),
  KEY idx_customer_company (company_id),
  CONSTRAINT fk_customer_company
    FOREIGN KEY (company_id) REFERENCES company_master (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- otp_verification
CREATE TABLE IF NOT EXISTS otp_verification (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  otp_code CHAR(6) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 3,
  expires_at DATETIME NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_otp_email (email),
  KEY idx_otp_expires (expires_at),
  CONSTRAINT chk_otp_attempts CHECK (attempts <= max_attempts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- question_master
CREATE TABLE IF NOT EXISTS question_master (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_key VARCHAR(80) NOT NULL,
  section ENUM('personal', 'address', 'medical', 'additional') NOT NULL,
  label VARCHAR(255) NOT NULL,
  field_type ENUM('text', 'textarea', 'date', 'select', 'phone') NOT NULL DEFAULT 'text',
  placeholder VARCHAR(255) DEFAULT NULL,
  options JSON DEFAULT NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  validation_rules JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_question_key (question_key),
  KEY idx_question_section (section, display_order),
  KEY idx_question_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- customer_response
CREATE TABLE IF NOT EXISTS customer_response (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  response_value TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_customer_question (customer_id, question_id),
  KEY idx_response_customer (customer_id),
  KEY idx_response_question (question_id),
  CONSTRAINT fk_response_customer
    FOREIGN KEY (customer_id) REFERENCES customer_master (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_response_question
    FOREIGN KEY (question_id) REFERENCES question_master (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
