require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Trust proxy (for Cloudflare, Nginx, etc.)
app.set('trust proxy', true);

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'traffic-guard-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ===== Routes =====
const endpointRoutes = require('./routes/endpoint');
const dashboardRoutes = require('./routes/dashboard');

app.use('/', endpointRoutes);
app.use('/dashboard', dashboardRoutes);

// Demo routes — only available in dev mode (npm run dev)
if (process.env.NODE_ENV === 'development') {
  const demoRoutes = require('./routes/demo');
  app.use('/demo', demoRoutes);
  console.log('🎨 Demo mode enabled: /demo');
}

// Home
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// 404
app.use((req, res) => {
  res.status(404).render('dummy', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).render('error', { message: 'Internal Server Error' });
});

// ===== MongoDB + Start =====
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🛡️  Traffic Guard running on port ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`🎯 Endpoint:  http://localhost:${PORT}/endpoint`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎨 Demo:      http://localhost:${PORT}/demo`);
      }
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
