const { parseUserAgent, getClientIp } = require('../utils/userAgent');

function attachClientContext(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(userAgent);

  req.clientContext = {
    ipAddress: getClientIp(req),
    userAgent,
    browser: parsed.browser,
    operatingSystem: parsed.operatingSystem,
    deviceType: parsed.deviceType,
  };

  next();
}

module.exports = { attachClientContext };
