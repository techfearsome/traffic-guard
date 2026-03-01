# 🛡️ Traffic Guard

Advanced IP-based traffic filtering application with ProxyCheck.io integration, device-specific content delivery, and real-time monitoring dashboard.

Built with **Node.js**, **Express**, **EJS**, and **MongoDB**.

---

## 🔍 What It Does

Traffic Guard sits between your Facebook/Meta ads and your landing pages. It inspects every incoming request and decides whether to show **real content** or **dummy content** based on:

- ✅ IP reputation (residential/business only)
- ✅ VPN/Proxy detection
- ✅ ASN blacklisting (Facebook, Meta, Google crawlers)
- ✅ UTM parameter validation
- ✅ Device detection (Android vs iPhone)

```
Facebook Ad Click → Traffic Guard (/endpoint) → Real or Dummy content
```

---

## 🧠 How It Works

```
Request hits /endpoint?utm_source=X&utm_medium=Y&utm_campaign=Z
    │
    ├── ❌ Missing UTM params? → Dummy content
    ├── ❌ Not mobile device? → Dummy content
    ├── ❌ VPN or Proxy detected? → Dummy content
    ├── ❌ ASN contains Facebook/Meta/Google? → Dummy content
    ├── ❌ IP not residential or business? → Dummy content
    │
    ├── ✅ Android + all checks passed → Random Android design
    └── ✅ iPhone + all checks passed → Random iPhone design
```

---

## 📱 Design Variants

Each device gets one of two designs randomly selected per request:

| # | Device | Design | Style |
|---|--------|--------|-------|
| 1 | Android | Android Secure | Dark neon green theme |
| 2 | Android | Android Guard | Material Design light theme |
| 3 | iPhone | iPhone Firewall | Dark neon blue theme |
| 4 | iPhone | iOS Firewall | Glassmorphism dark theme |
| 5 | Bots | Dummy | Generic login page |

When the user clicks **Yes** or **No**, a fullscreen support modal appears with a **Call Now** button that dials the number configured in `.env`.

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd traffic-guard
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
MONGODB_URI=mongodb://localhost:27017/traffic-guard
PROXYCHECK_API_KEY=your-api-key-here
DASHBOARD_PASS=your-secure-password
SESSION_SECRET=any-random-string-here
SUPPORT_NUMBER=+18005551234
PORT=3000
```

### 3. Get ProxyCheck.io API Key

1. Go to [https://proxycheck.io](https://proxycheck.io)
2. Sign up (free tier = 1,000 queries/day)
3. Copy your API key into `.env`

### 4. Run

**Development mode** (with `/demo` preview pages):
```bash
npm run dev
```

**Production / Live mode** (demo pages disabled):
```bash
npm start
```

---

## 🌐 URLs

| URL | Purpose | Available In |
|-----|---------|--------------|
| `/endpoint?utm_source=X&utm_medium=Y&utm_campaign=Z` | Main filtered endpoint | Both modes |
| `/dashboard` | Traffic monitoring dashboard | Both modes |
| `/dashboard/login` | Dashboard login | Both modes |
| `/demo` | Demo index — links to all designs | Dev mode only |
| `/demo/1` | Android Secure preview | Dev mode only |
| `/demo/2` | Android Guard preview | Dev mode only |
| `/demo/3` | iPhone Firewall preview | Dev mode only |
| `/demo/4` | iOS Firewall preview | Dev mode only |
| `/demo/5` | Dummy page preview | Dev mode only |

---

## 📊 Dashboard Features

- **Real-time stats** — Total, allowed, blocked counts (24h & 7d)
- **Device breakdown** — Android vs iPhone vs other
- **Top countries** — Where traffic originates
- **Top blocked ASNs** — Which organizations are getting blocked
- **Traffic log table** — Every request with IP, ASN, device, status, UTM, block reason
- **Search** — Filter by IP, country, ASN, UTM params
- **Status filter** — View all / allowed / blocked
- **Pagination** — Handles large traffic volumes
- **Auto-refresh** — Updates every 30 seconds

---

## 🔗 Facebook Ads URL Format

Use this as your destination URL in Facebook Ads Manager:

```
https://your-domain.com/endpoint?utm_source={{adset.name}}&utm_medium={{ad.name}}&utm_campaign={{campaign.name}}
```

Facebook automatically replaces the `{{ }}` placeholders with actual campaign values.

---

## 🚫 What Gets Blocked

| Check | ✅ Allowed | ❌ Blocked |
|-------|-----------|-----------|
| **UTM Params** | All 3 present | Any missing |
| **IP Type** | Residential, Business, Wireless | Datacenter, Hosting, Unknown |
| **ASN** | Normal ISPs (AT&T, Jio, Airtel, etc.) | Facebook, Meta, Google, AWS, Azure, datacenters |
| **VPN/Proxy** | Not detected | Detected |
| **Device** | Android, iPhone/iPad | Desktop, bots, unknown |
| **Risk Score** | Below 66 | Above 66 |

### Blocked ASN Keywords

Any ASN organization name containing these keywords will be blocked:

`facebook` · `meta` · `google` · `amazon` · `microsoft` · `azure` · `cloudflare` · `digitalocean` · `linode` · `vultr` · `ovh` · `hetzner` · `oracle cloud` · `alibaba` · `datacenter` · `data center` · `hosting` · `colocation` · `server` · `bot`

---

## 📁 Project Structure

```
traffic-guard/
├── server.js                       # Entry point
├── package.json                    # Dependencies & scripts
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore rules
├── README.md                       # This file
│
├── middleware/
│   ├── proxycheck.js               # ProxyCheck.io API + ASN analysis
│   └── trafficFilter.js            # 5-layer traffic filtering logic
│
├── models/
│   └── TrafficLog.js               # MongoDB schema for request logs
│
├── routes/
│   ├── endpoint.js                 # /endpoint — main filtered route
│   ├── dashboard.js                # /dashboard — admin panel + auth
│   └── demo.js                     # /demo — design previews (dev only)
│
└── views/
    ├── android-secure.ejs          # Design 1: Android neon green
    ├── android-material.ejs        # Design 2: Android Material Design
    ├── iphone-firewall.ejs         # Design 3: iPhone neon blue
    ├── iphone-glass.ejs            # Design 4: iOS glassmorphism
    ├── dummy.ejs                   # Fake login page (bots see this)
    ├── dashboard.ejs               # Admin monitoring dashboard
    ├── demo-index.ejs              # Demo page index (dev only)
    ├── login.ejs                   # Dashboard login page
    ├── error.ejs                   # Error page
    └── partials/
        └── support-modal.ejs       # Fullscreen call support modal
```

---

## 🖥️ Production Deployment

### Using PM2 (Recommended)

```bash
npm install -g pm2
pm2 start server.js --name traffic-guard --env production
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **Important**: The `X-Real-IP` and `X-Forwarded-For` headers are critical — Traffic Guard uses them to detect the visitor's real IP behind the proxy.

### SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `PROXYCHECK_API_KEY` | ✅ | API key from proxycheck.io |
| `DASHBOARD_PASS` | ✅ | Password to access `/dashboard` |
| `SESSION_SECRET` | ✅ | Random string for session encryption |
| `SUPPORT_NUMBER` | ✅ | Phone number for support modal (e.g. `+18005551234`) |
| `PORT` | ❌ | Server port (default: `3000`) |

---

## 🔒 Security Notes

- Dashboard is password-protected via session auth
- All traffic is logged to MongoDB for audit trails
- ProxyCheck.io API failures default to **blocking** (fail-safe)
- `/demo` routes are **completely disabled** in production mode (404)
- Support phone number is injected server-side (not visible in page source until rendered)

---

## 📜 License

Private — All rights reserved. Deploy It

