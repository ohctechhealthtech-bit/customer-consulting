-- V2: Patient Portal - Consent, History and Audit Logs
-- customer_consent
CREATE TABLE IF NOT EXISTS customer_consent (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  consent_status ENUM('allow', 'deny', 'withdrawn') NOT NULL,
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

-- consent_history
CREATE TABLE IF NOT EXISTS consent_history (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  action ENUM('ACCEPT', 'REJECT', 'WITHDRAW') NOT NULL,
  performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  performed_by VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_consent_history_customer (customer_id),
  KEY idx_consent_history_action (action),
  CONSTRAINT fk_consent_history_customer
    FOREIGN KEY (customer_id) REFERENCES customer_master (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- login_history
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

-- audit_logs
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

-- profile_update_history
CREATE TABLE IF NOT EXISTS profile_update_history (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  field_name VARCHAR(80) NOT NULL,
  old_value TEXT DEFAULT NULL,
  new_value TEXT DEFAULT NULL,
  updated_by VARCHAR(255) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_puh_customer (customer_id),
  KEY idx_puh_updated_at (updated_at),
  CONSTRAINT fk_puh_customer
    FOREIGN KEY (customer_id) REFERENCES customer_master (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
