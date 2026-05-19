'use strict';

const { URL } = require('url');

function normalizeUrl(raw) {
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  return new URL(raw).toString();
}

function getOrigin(raw) {
  const u = new URL(normalizeUrl(raw));
  return `${u.protocol}//${u.host}`;
}

function getHostname(raw) {
  return new URL(normalizeUrl(raw)).hostname;
}

function joinPath(base, path) {
  const u = new URL(normalizeUrl(base));
  return `${u.protocol}//${u.host}${path}`;
}

function isPublicUrl(raw) {
  try {
    const host = new URL(normalizeUrl(raw)).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host.endsWith('.local') || host.endsWith('.internal')) return false;
    return true;
  } catch {
    return false;
  }
}

module.exports = { normalizeUrl, getOrigin, getHostname, joinPath, isPublicUrl };
