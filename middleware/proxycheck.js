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
    risk: 0
  };

  try {
    const url = `https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1&asn=1&risk=1&port=1&seen=1&days=7&tag=trafficguard`;

    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    if (data.status === 'ok' && data[ip]) {
      const ipData = data[ip];

      result.type = (ipData.type || '').toLowerCase();
      result.provider = ipData.provider || ipData.isp || null;
      result.asn = ipData.asn || null;
      result.organisation = ipData.organisation || ipData.provider || null;
      result.country = ipData.country || null;
      result.city = ipData.city || null;
      result.proxy = ipData.proxy || 'no';
      result.vpn = ipData.vpn || 'no';
      result.risk = parseInt(ipData.risk) || 0;
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

  // 2. Check ASN for blocked keywords
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

  // 3. Check IP type — only allow residential and business
  const allowedTypes = ['residential', 'business', 'wireless'];
  if (!allowedTypes.includes(proxyData.type)) {
    blocked = true;
    reasons.push(`IP type "${proxyData.type}" not allowed (only residential/business)`);
  }

  // 4. High risk score
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
