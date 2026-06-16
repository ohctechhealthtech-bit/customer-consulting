-- Consentify Hub Database Schema
-- Run: mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS consentify_hub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE consentify_hub;

-- ---------------------------------------------------------------------------
-- customer_master
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_master (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  reference_number VARCHAR(32) DEFAULT NULL,
  first_name VARCHAR(60) DEFAULT NULL,
  last_name VARCHAR(60) DEFAULT NULL,
  mobile VARCHAR(24) DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_customer_email (email),
  UNIQUE KEY uk_customer_reference (reference_number),
  KEY idx_customer_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- otp_verification
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- question_master
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- customer_response
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- customer_consent
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_consent (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  consent_status ENUM('allow', 'deny') NOT NULL,
  reference_number VARCHAR(32) NOT NULL,
  submitted_at DATETIME NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  browser VARCHAR(120) DEFAULT NULL,
  operating_system VARCHAR(120) DEFAULT NULL,
  device_type VARCHAR(40) DEFAULT NULL,
  audit_history JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_consent_reference (reference_number),
  KEY idx_consent_customer (customer_id),
  KEY idx_consent_status (consent_status),
  KEY idx_consent_submitted (submitted_at),
  CONSTRAINT fk_consent_customer
    FOREIGN KEY (customer_id) REFERENCES customer_master (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- login_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_history (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  browser VARCHAR(120) DEFAULT NULL,
  operating_system VARCHAR(120) DEFAULT NULL,
  device_type VARCHAR(40) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  login_time DATETIME NOT NULL,
  logout_time DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_login_email (email),
  KEY idx_login_customer (customer_id),
  KEY idx_login_time (login_time),
  KEY idx_login_device (device_type),
  CONSTRAINT fk_login_customer
    FOREIGN KEY (customer_id) REFERENCES customer_master (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- audit_logs (supports admin audit API and consent audit trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_code VARCHAR(50) NOT NULL,
  user_identifier VARCHAR(255) NOT NULL,
  customer_id INT UNSIGNED DEFAULT NULL,
  description TEXT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  browser VARCHAR(120) DEFAULT NULL,
  operating_system VARCHAR(120) DEFAULT NULL,
  device_type VARCHAR(40) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_event (event_code),
  KEY idx_audit_user (user_identifier),
  KEY idx_audit_customer (customer_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_customer
    FOREIGN KEY (customer_id) REFERENCES customer_master (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_email (email),
  KEY idx_admin_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
