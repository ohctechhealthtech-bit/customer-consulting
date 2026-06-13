const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/apiResponse');

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Admin authentication required', 401);
  }

  const token = authHeader.slice(7);
  try {
    const decoded = verifyToken(token);
    if (decoded.role !== 'admin' || !decoded.adminId) {
      return error(res, 'Admin access denied', 403);
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return error(res, 'Invalid or expired admin token', 401);
  }
}

module.exports = { authenticateAdmin };
