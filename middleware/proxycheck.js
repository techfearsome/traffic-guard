const axios = require('axios');

const BLOCKED_ASN_KEYWORDS = [
  'facebook', 'meta', 'google', 'llc',
  'amazon', 'microsoft', 'azure', 'cloudflare',
  'digitalocean', 'linode', 'vultr', 'ovh',
  'hetzner', 'oracle cloud', 'alibaba',
  'datacenter', 'data center', 'hosting',
  'colocation', 'server', 'bot'
];

async function checkIP(ip) {
  const apiKey = process.env.PROXYCHECK_API_KEY || process.env.PROXYCHECK_API;

  const result = {
    type: null,
    provider: null,
    asn: null,
    organisation: null,
    country: null,
    city: null,
    proxy: 'no',
    vpn: 'no',
    risk: 0,
    hosting: false,
    compromised: false,
    tor: false
  };

  try {
    // v3 API endpoint
    const url = `https://proxycheck.io/v3/${ip}?key=${apiKey}`;

    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    if (data.status === 'ok' && data[ip]) {
      const ipData = data[ip];
      const network = ipData.network || {};
      const location = ipData.location || {};
      const detections = ipData.detections || {};

      // Network info
      result.type = (network.type || '').toLowerCase();
      result.provider = network.provider || null;
      result.asn = network.asn || null;
      result.organisation = network.organisation || network.provider || null;

      // Location info
      result.country = location.country_name || null;
      result.city = location.city_name || null;

      // Detections — v3 returns booleans instead of 'yes'/'no'
      result.proxy = detections.proxy ? 'yes' : 'no';
      result.vpn = detections.vpn ? 'yes' : 'no';
      result.hosting = !!detections.hosting;
      result.compromised = !!detections.compromised;
      result.tor = !!detections.tor;
      result.risk = parseInt(detections.risk) || 0;
    }
  } catch (error) {
    console.error(`[ProxyCheck] Error checking IP ${ip}:`, error.message);
    // On API failure, block by default for safety
    result.type = 'unknown';
    result.risk = 100;
  }

  return result;
}

function analyzeIP(proxyData) {
  const reasons = [];
  let blocked = false;

  // 1. Check VPN / Proxy
  if (proxyData.proxy === 'yes' || proxyData.vpn === 'yes') {
    blocked = true;
    reasons.push(`VPN/Proxy detected (proxy: ${proxyData.proxy}, vpn: ${proxyData.vpn})`);
  }

  // 2. Check hosting / tor / compromised flags (v3 booleans)
  if (proxyData.hosting) {
    blocked = true;
    reasons.push('Hosting/Datacenter IP detected');
  }
  if (proxyData.tor) {
    blocked = true;
    reasons.push('Tor exit node detected');
  }
  if (proxyData.compromised) {
    blocked = true;
    reasons.push('Compromised IP detected');
  }

  // 3. Check ASN for blocked keywords (fallback layer)
  const asnOrg = (proxyData.organisation || '').toLowerCase();
  const asnProvider = (proxyData.provider || '').toLowerCase();
  const combinedASN = `${asnOrg} ${asnProvider}`;

  for (const keyword of BLOCKED_ASN_KEYWORDS) {
    if (combinedASN.includes(keyword)) {
      blocked = true;
      reasons.push(`Blocked ASN keyword "${keyword}" found in: ${proxyData.organisation || proxyData.provider}`);
      break;
    }
  }

  // 4. Check IP type — only allow residential and business
  const allowedTypes = ['residential', 'business', 'wireless'];
  if (proxyData.type && !allowedTypes.includes(proxyData.type)) {
    blocked = true;
    reasons.push(`IP type "${proxyData.type}" not allowed (only residential/business/wireless)`);
  }

  // 5. High risk score
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
