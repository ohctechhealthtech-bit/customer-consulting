const { parseUserAgent, getClientIp } = require('../utils/userAgent');

function attachClientContext(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';
  // sec-ch-ua is sent by Chromium-based browsers and lets us distinguish
  // Brave (which includes "Brave" as a brand) from plain Chrome.
  const secChUa = req.headers['sec-ch-ua'] || '';
  const parsed = parseUserAgent(userAgent, secChUa);

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
