const UAParser = require('ua-parser-js');
const { checkIP, analyzeIP } = require('./proxycheck');
const TrafficLog = require('../models/TrafficLog');

// Facebook / Meta in-app browser detection
const FB_BROWSER_PATTERNS = /FBAN|FBAV|FBIOS|FBSS|Instagram|FBOP|FBBV/i;

function parseDevice(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const os = (result.os.name || '').toLowerCase();
  const deviceType = result.device.type || 'desktop';
  const browser = result.browser.name || 'unknown';
  const isFacebookBrowser = FB_BROWSER_PATTERNS.test(userAgent);

  let detectedOS = 'unknown';
  if (os.includes('android')) detectedOS = 'android';
  else if (os.includes('ios') || os.includes('mac os') && deviceType === 'mobile') detectedOS = 'ios';
  else if (os.includes('windows')) detectedOS = 'windows';
  else if (os.includes('mac')) detectedOS = 'macos';
  else if (os.includes('linux')) detectedOS = 'linux';

  return {
    type: deviceType,
    os: detectedOS,
    browser,
    isFacebookBrowser
  };
}

function extractUTM(query) {
  return {
    source: Array.isArray(query.utm_source) ? query.utm_source[0] : (query.utm_source || null),
    medium: Array.isArray(query.utm_medium) ? query.utm_medium[0] : (query.utm_medium || null),
    campaign: Array.isArray(query.utm_campaign) ? query.utm_campaign[0] : (query.utm_campaign || null)
  };
}

function validateUTM(utm) {
  // All three UTM params must be present and non-empty strings
  if (!utm.source || !utm.medium || !utm.campaign) {
    const missing = [];
    if (!utm.source) missing.push('utm_source');
    if (!utm.medium) missing.push('utm_medium');
    if (!utm.campaign) missing.push('utm_campaign');
    return { valid: false, reason: `Missing UTM params: ${missing.join(', ')}` };
  }
  return { valid: true, reason: null };
}

async function trafficFilter(req, res, next) {
  const startTime = Date.now();

  // Get real IP (behind proxies like Cloudflare, Nginx)
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection.remoteAddress
    || req.ip;

  // Clean IPv6-mapped IPv4
  const cleanIP = ip.replace('::ffff:', '');

  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers['referer'] || '';
  const fullUrl = req.originalUrl;

  // Parse device
  const device = parseDevice(userAgent);

  // Extract UTM
  const utm = extractUTM(req.query);

  // Build log entry
  const logEntry = {
    ip: cleanIP,
    url: fullUrl,
    userAgent,
    referer,
    utm,
    proxycheck: {},
    device,
    status: 'blocked',
    blockReason: null,
    contentServed: 'dummy'
  };

  try {
    // ===== CHECK 1: UTM Params =====
    const utmCheck = validateUTM(utm);
    if (!utmCheck.valid) {
      logEntry.blockReason = utmCheck.reason;
      await saveLog(logEntry);
      req.trafficResult = { blocked: true, reason: utmCheck.reason, contentServed: 'dummy' };
      return next();
    }

    // ===== CHECK 2: Device — must be mobile (Android or iPhone) =====
    if (!['android', 'ios'].includes(device.os) || device.type === 'desktop') {
      logEntry.blockReason = `Invalid device: OS=${device.os}, type=${device.type}`;
      await saveLog(logEntry);
      req.trafficResult = { blocked: true, reason: logEntry.blockReason, contentServed: 'dummy' };
      return next();
    }

    // ===== CHECK 3: ProxyCheck.io =====
    const proxyData = await checkIP(cleanIP);
    logEntry.proxycheck = proxyData;

    const analysis = analyzeIP(proxyData);

    if (analysis.blocked) {
      logEntry.blockReason = analysis.reason;
      await saveLog(logEntry);
      req.trafficResult = { blocked: true, reason: analysis.reason, contentServed: 'dummy' };
      return next();
    }

    // ===== ALL CHECKS PASSED =====
    const contentServed = device.os === 'android' ? 'android' : 'iphone';
    logEntry.status = 'allowed';
    logEntry.contentServed = contentServed;
    logEntry.blockReason = null;

    await saveLog(logEntry);

    req.trafficResult = {
      blocked: false,
      reason: null,
      contentServed,
      device,
      proxyData
    };

    return next();

  } catch (error) {
    console.error('[TrafficFilter] Error:', error.message);
    logEntry.blockReason = `Filter error: ${error.message}`;
    await saveLog(logEntry);
    req.trafficResult = { blocked: true, reason: 'Internal error — blocked for safety', contentServed: 'dummy' };
    return next();
  }
}

async function saveLog(logEntry) {
  try {
    await TrafficLog.create(logEntry);
  } catch (err) {
    console.error('[TrafficLog] Failed to save:', err.message);
  }
}

module.exports = { trafficFilter, parseDevice, extractUTM };
