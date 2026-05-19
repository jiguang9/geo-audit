'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

const DEFAULT_UA = 'geo-audit/1.0 (+https://github.com/weiguang8412/geo-audit)';
const DEFAULT_TIMEOUT = 10000;

function fetchText(url, options = {}, redirectCount = 0) {
  if (redirectCount > 3) return Promise.reject(new Error('Too many redirects'));

  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(url); } catch (e) { return reject(e); }

    const lib = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': options.userAgent || DEFAULT_UA,
        'Accept': 'text/html,text/plain,*/*',
      },
      timeout: options.timeout || DEFAULT_TIMEOUT,
    };

    const req = lib.request(reqOptions, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        return fetchText(next, options, redirectCount + 1).then(resolve).catch(reject);
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout fetching: ${url}`)); });
    req.end();
  });
}

module.exports = { fetchText };
