const customerModel = require('../models/customerModel');
const consentModel = require('../models/consentModel');
const loginHistoryModel = require('../models/loginHistoryModel');
const { success, error } = require('../utils/apiResponse');

async function getDashboardData(req, res) {
  try {
    const customerId = req.user.customerId;
    
    // 1. Get Profile
    const profile = await customerModel.getCustomerDetail(customerId);
    
    // 2. Get Consent History
    const consentHistory = await consentModel.getHistoryByCustomerId(customerId);
    
    // 3. Get Latest Consent
    const latestConsent = await consentModel.findByCustomerId(customerId);
    
    // 4. Get Login History (Recent 10)
    const [loginHistory] = await require('../config/database').query(
      `SELECT * FROM login_history 
       WHERE customer_id = ? 
       ORDER BY login_time DESC 
       LIMIT 10`,
      [customerId]
    );

    const dashboardData = {
      profile,
      consent: {
        current: latestConsent,
        history: consentHistory,
      },
      logins: loginHistory,
    };

    return success(res, dashboardData, 'Dashboard data retrieved successfully');
  } catch (err) {
    console.error('[Dashboard Error]', err);
    return error(res, 'Failed to retrieve dashboard data', 500);
  }
}

async function getHistory(req, res) {
  try {
    const customerId = req.user.customerId;
    const db = require('../config/database');

    // 1. Consent History
    const consentHistory = await consentModel.getHistoryByCustomerId(customerId);

    // 2. Login History
    const [loginHistory] = await db.query(
      `SELECT id, login_time, ip_address, browser, device_type, operating_system 
       FROM login_history 
       WHERE customer_id = ? 
       ORDER BY login_time DESC 
       LIMIT 50`,
      [customerId]
    );

    // 3. Profile Update History (field-level + submissions)
    const [profileUpdates] = await db.query(
      `SELECT id, updated_at as performed_at, 
              CONCAT('Field "', field_name, '" updated from "', COALESCE(old_value, '—'), '" to "', COALESCE(new_value, '—'), '"') as description,
              'PROFILE_UPDATED' as event_code
       FROM profile_update_history
       WHERE customer_id = ?
       UNION ALL
       SELECT id, created_at as performed_at, description, event_code
       FROM audit_event_logs 
       WHERE customer_id = ? AND event_code = 'QUESTIONNAIRE_SUBMITTED'
       ORDER BY performed_at DESC 
       LIMIT 50`,
      [customerId, customerId]
    );

    return success(res, {
      consent: consentHistory,
      logins: loginHistory,
      profile: profileUpdates
    }, 'History retrieved successfully');
  } catch (err) {
    console.error('[History Error]', err);
    return error(res, 'Failed to fetch history', 500);
  }
}

module.exports = { getDashboardData, getHistory };
