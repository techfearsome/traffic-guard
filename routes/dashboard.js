const express = require('express');
const router = express.Router();
const TrafficLog = require('../models/TrafficLog');

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.redirect('/dashboard/login');
}

// Login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login POST
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.DASHBOARD_PASS) {
    req.session.authenticated = true;
    return res.redirect('/dashboard');
  }
  return res.render('login', { error: 'Invalid password' });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/dashboard/login');
});

// Main dashboard
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const filter = req.query.filter || 'all'; // all, allowed, blocked

    // Build query
    let query = {};
    if (filter === 'allowed') query.status = 'allowed';
    if (filter === 'blocked') query.status = 'blocked';

    // Search
    const search = req.query.search || '';
    if (search) {
      query.$or = [
        { ip: { $regex: search, $options: 'i' } },
        { 'proxycheck.country': { $regex: search, $options: 'i' } },
        { 'proxycheck.organisation': { $regex: search, $options: 'i' } },
        { 'utm.source': { $regex: search, $options: 'i' } },
        { 'utm.campaign': { $regex: search, $options: 'i' } },
        { blockReason: { $regex: search, $options: 'i' } }
      ];
    }

    // Get logs
    const [logs, totalLogs] = await Promise.all([
      TrafficLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      TrafficLog.countDocuments(query)
    ]);

    // Stats — last 24 hours
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [stats24h, stats7d, topCountries, topASNs, deviceBreakdown] = await Promise.all([
      // 24h stats
      TrafficLog.aggregate([
        { $match: { timestamp: { $gte: last24h } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            allowed: { $sum: { $cond: [{ $eq: ['$status', 'allowed'] }, 1, 0] } },
            blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
            android: { $sum: { $cond: [{ $eq: ['$contentServed', 'android'] }, 1, 0] } },
            iphone: { $sum: { $cond: [{ $eq: ['$contentServed', 'iphone'] }, 1, 0] } }
          }
        }
      ]),

      // 7d stats
      TrafficLog.aggregate([
        { $match: { timestamp: { $gte: lastWeek } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            allowed: { $sum: { $cond: [{ $eq: ['$status', 'allowed'] }, 1, 0] } },
            blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } }
          }
        }
      ]),

      // Top countries (24h)
      TrafficLog.aggregate([
        { $match: { timestamp: { $gte: last24h }, 'proxycheck.country': { $ne: null } } },
        { $group: { _id: '$proxycheck.country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Top blocked ASNs (24h)
      TrafficLog.aggregate([
        { $match: { timestamp: { $gte: last24h }, status: 'blocked', 'proxycheck.organisation': { $ne: null } } },
        { $group: { _id: '$proxycheck.organisation', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Device breakdown (24h)
      TrafficLog.aggregate([
        { $match: { timestamp: { $gte: last24h } } },
        { $group: { _id: '$device.os', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    const s24 = stats24h[0] || { total: 0, allowed: 0, blocked: 0, android: 0, iphone: 0 };
    const s7d = stats7d[0] || { total: 0, allowed: 0, blocked: 0 };

    const totalPages = Math.ceil(totalLogs / limit);

    res.render('dashboard', {
      logs,
      stats: {
        h24: s24,
        d7: s7d,
        topCountries,
        topASNs,
        deviceBreakdown
      },
      pagination: { page, totalPages, totalLogs, filter, search }
    });

  } catch (error) {
    console.error('[Dashboard] Error:', error.message);
    res.status(500).render('error', { message: 'Dashboard error: ' + error.message });
  }
});

// API: Get live stats (for auto-refresh)
router.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = await TrafficLog.aggregate([
      { $match: { timestamp: { $gte: last24h } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          allowed: { $sum: { $cond: [{ $eq: ['$status', 'allowed'] }, 1, 0] } },
          blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } }
        }
      }
    ]);

    const recent = await TrafficLog.find().sort({ timestamp: -1 }).limit(5).lean();

    res.json({ stats: stats[0] || { total: 0, allowed: 0, blocked: 0 }, recent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
