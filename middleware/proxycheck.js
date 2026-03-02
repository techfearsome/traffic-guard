const axios = require('axios');

const BLOCKED_ASN_KEYWORDS = [
  'facebook', 'meta', 'google', 'llc',
  'amazon', 'microsoft', 'azure', 'cloudflare',
  'digitalocean', 'linode', 'vultr', 'ovh',
  'hetzner', 'oracle cloud', 'alibaba',
  'datacenter', 'data center', 'hosting',
  'colocation', 'server', 'bot'
];

/**
 * Check IP using ProxyCheck.io v3 API
 * @param {string} ip - IP address to check
 * @returns {Promise<Object>} IP analysis result
 */
async function checkIP(ip) {
  const apiKey = process.env.PROXYCHECK_API_KEY;

  const result = {
    type: null,
    provider: null,
    asn: null,
    organisation: null,
    country: null,
    city: null,
    proxy: 'no',
    vpn: 'no',
    hosting: 'no',
    tor: 'no',
    risk: 0,
    confidence: 0
  };

  try {
    // ProxyCheck.io v3 API endpoint
    const url = `https://proxycheck.io/v3/${ip}?key=${apiKey}`;

    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    if (data.status === 'ok' && data[ip]) {
      const ipData = data[ip];

      // Extract network information
      if (ipData.network) {
        result.type = (ipData.network.type || '').toLowerCase();
        result.provider = ipData.network.provider || null;
        result.asn = ipData.network.asn || null;
        result.organisation = ipData.network.organisation || null;
      }

      // Extract location information
      if (ipData.location) {
        result.country = ipData.location.country_code || null;
        result.city = ipData.location.city_name || null;
      }

      // Extract detection information (v3 structure)
      if (ipData.detections) {
        result.proxy = ipData.detections.proxy ? 'yes' : 'no';
        result.vpn = ipData.detections.vpn ? 'yes' : 'no';
        result.hosting = ipData.detections.hosting ? 'yes' : 'no';
        result.tor = ipData.detections.tor ? 'yes' : 'no';
        result.risk = parseInt(ipData.detections.risk) || 0;
        result.confidence = parseInt(ipData.detections.confidence) || 0;
      }

      console.log(`[ProxyCheck] IP ${ip}: type=${result.type}, risk=${result.risk}, vpn=${result.vpn}, proxy=${result.proxy}, hosting=${result.hosting}`);
    } else {
      console.warn(`[ProxyCheck] Unexpected response for IP ${ip}:`, data);
      // Default to blocking on unexpected response
      result.type = 'unknown';
      result.risk = 100;
    }
  } catch (error) {
    console.error(`[ProxyCheck] Error checking IP ${ip}:`, error.message);
    if (error.response) {
      console.error(`[ProxyCheck] Response status: ${error.response.status}`);
      console.error(`[ProxyCheck] Response data:`, error.response.data);
    }
    // On API failure, block by default for safety
    result.type = 'unknown';
    result.risk = 100;
  }

  return result;
}

/**
 * Analyze IP data and determine if it should be blocked
 * @param {Object} proxyData - Result from checkIP()
 * @returns {Object} Analysis result with blocked flag and reason
 */
function analyzeIP(proxyData) {
  const reasons = [];
  let blocked = false;

  // 1. Check VPN / Proxy / TOR
  if (proxyData.proxy === 'yes') {
    blocked = true;
    reasons.push('Proxy detected');
  }

  if (proxyData.vpn === 'yes') {
    blocked = true;
    reasons.push('VPN detected');
  }

  if (proxyData.tor === 'yes') {
    blocked = true;
    reasons.push('TOR exit node detected');
  }

  // 2. Check hosting (v3 provides this directly)
  if (proxyData.hosting === 'yes') {
    blocked = true;
    reasons.push('Hosting/datacenter IP detected');
  }

  // 3. Check ASN for blocked keywords
  const asnOrg = (proxyData.organisation || '').toLowerCase();
  const asnProvider = (proxyData.provider || '').toLowerCase();
  const combinedASN = `${asnOrg} ${asnProvider}`;

  for (const keyword of BLOCKED_ASN_KEYWORDS) {
    if (combinedASN.includes(keyword)) {
      blocked = true;
      reasons.push(`Blocked ASN keyword "${keyword}" found in: ${proxyData.organisation || proxyData.provider}`);
      break; // Only report first match
    }
  }

  // 4. Check IP type — only allow residential, business, and wireless
  const allowedTypes = ['residential', 'business', 'wireless'];
  if (proxyData.type && !allowedTypes.includes(proxyData.type)) {
    blocked = true;
    reasons.push(`IP type "${proxyData.type}" not allowed (only residential/business/wireless)`);
  }

  // 5. High risk score (threshold: 66)
  if (proxyData.risk > 66) {
    blocked = true;
    reasons.push(`High risk score: ${proxyData.risk}`);
  }

  return {
    blocked,
    reason: reasons.length > 0 ? reasons.join(' | ') : null
  };
}

module.exports = { checkIP, analyzeIP, BLOCKED_ASN_KEYWORDS };