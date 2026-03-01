const mongoose = require('mongoose');

const trafficLogSchema = new mongoose.Schema({
  // Request Info
  ip: { type: String, required: true, index: true },
  url: { type: String },
  userAgent: { type: String },
  referer: { type: String },

  // UTM Parameters
  utm: {
    source: { type: String, default: null },
    medium: { type: String, default: null },
    campaign: { type: String, default: null }
  },

  // ProxyCheck.io Results
  proxycheck: {
    type: { type: String, default: null },        // residential, business, datacenter, hosting
    provider: { type: String, default: null },     // ISP name
    asn: { type: String, default: null },          // AS number
    organisation: { type: String, default: null }, // ASN org name
    country: { type: String, default: null },
    city: { type: String, default: null },
    proxy: { type: String, default: null },        // yes/no
    vpn: { type: String, default: null },          // yes/no
    risk: { type: Number, default: 0 }
  },

  // Device Detection
  device: {
    type: { type: String, default: null },         // mobile, tablet, desktop
    os: { type: String, default: null },           // Android, iOS, Windows, etc.
    browser: { type: String, default: null },
    isFacebookBrowser: { type: Boolean, default: false }
  },

  // Filtering Result
  status: {
    type: String,
    enum: ['allowed', 'blocked'],
    required: true,
    index: true
  },
  blockReason: { type: String, default: null },
  contentServed: {
    type: String,
    enum: ['android', 'iphone', 'dummy'],
    default: 'dummy'
  },
  designVariant: {
    type: String,
    default: null
  },

  // Timestamp
  timestamp: { type: Date, default: Date.now, index: true }
});

// Indexes for dashboard queries
trafficLogSchema.index({ timestamp: -1 });
trafficLogSchema.index({ status: 1, timestamp: -1 });
trafficLogSchema.index({ 'device.os': 1 });
trafficLogSchema.index({ 'proxycheck.country': 1 });

module.exports = mongoose.model('TrafficLog', trafficLogSchema);
