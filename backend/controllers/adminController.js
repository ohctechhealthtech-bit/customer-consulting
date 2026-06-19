const adminService = require('../services/adminService');
const { success, error } = require('../utils/apiResponse');

async function getDashboard(req, res) {
  try {
    const data = await adminService.getDashboard();
    return success(res, data);
  } catch (err) {
    return error(res, err.message || 'Failed to load dashboard', err.statusCode || 500);
  }
}

async function getCustomers(req, res) {
  try {
    const data = await adminService.getCustomers(req.query);
    return success(res, data);
  } catch (err) {
    return error(res, err.message || 'Failed to load customers', err.statusCode || 500);
  }
}

async function getConsents(req, res) {
  try {
    const data = await adminService.getConsents(req.query);
    return success(res, data);
  } catch (err) {
    return error(res, err.message || 'Failed to load consents', err.statusCode || 500);
  }
}

async function getLoginHistory(req, res) {
  try {
    const data = await adminService.getLoginHistory(req.query);
    return success(res, data);
  } catch (err) {
    return error(res, err.message || 'Failed to load login history', err.statusCode || 500);
  }
}

async function getAuditLogs(req, res) {
  try {
    const data = await adminService.getAuditLogs(req.query);
    return success(res, data);
  } catch (err) {
    return error(res, err.message || 'Failed to load audit logs', err.statusCode || 500);
  }
}

async function getCustomerDetail(req, res) {
  try {
    const data = await adminService.getCustomerDetail(req.params.id);
    return success(res, data);
  } catch (err) {
    return error(res, err.message || 'Failed to load customer', err.statusCode || 500);
  }
}

async function getCustomersWithResponses(req, res) {
  try {
    const data = await adminService.getCustomersWithResponses(req.query);
    return success(res, data);
  } catch (err) {
    return error(res, err.message || 'Failed to load responses', err.statusCode || 500);
  }
}

async function exportResponsesCsv(req, res) {
  try {
    const csvString = await adminService.exportCustomersWithResponsesCsv(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=responses_export.csv');
    return res.status(200).send(csvString);
  } catch (err) {
    return error(res, err.message || 'Failed to export CSV', err.statusCode || 500);
  }
}

module.exports = {
  getDashboard,
  getCustomers,
  getConsents,
  getLoginHistory,
  getAuditLogs,
  getCustomersWithResponses,
  getCustomerDetail,
  exportResponsesCsv,
};
