const UAParser = require('ua-parser-js');

function parseUserAgent(userAgentString) {
  const parser = new UAParser(userAgentString || '');
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const browserName = [browser.name, browser.version?.split('.')[0]]
    .filter(Boolean)
    .join(' ');

  const osName = [os.name, os.version].filter(Boolean).join(' ');

  let deviceType = device.type || 'desktop';
  if (deviceType === 'mobile') deviceType = 'Mobile';
  else if (deviceType === 'tablet') deviceType = 'Tablet';
  else deviceType = 'Desktop';

  return {
    browser: browserName || 'Unknown',
    operatingSystem: osName || 'Unknown',
    deviceType,
    userAgent: userAgentString || '',
  };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

module.exports = { parseUserAgent, getClientIp };
