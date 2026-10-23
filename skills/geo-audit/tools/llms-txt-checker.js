#!/usr/bin/env node
'use strict';

const { fetchText } = require('./shared/fetch.js');
const { joinPath, isPublicUrl } = require('./shared/url.js');

const REQUIRED_FIELDS = ['# ', '> '];
const OPTIONAL_FIELDS = ['## ', '- ['];

async function checkLlmsTxt(siteUrl) {
  if (!isPublicUrl(siteUrl)) {
    return { error: 'Non-public URL — skipping llms.txt check.' };
  }

  const results = {};

  for (const filename of ['llms.txt', 'llms-full.txt']) {
    const fileUrl = joinPath(siteUrl, `/${filename}`);
    let res;

    try {
      res = await fetchText(fileUrl);
    } catch (err) {
      results[filename] = { url: fileUrl, exists: false, error: err.message };
      continue;
    }

    if (res.status !== 200) {
      results[filename] = { url: fileUrl, exists: false, httpStatus: res.status };
      continue;
    }

    const body = res.body;
    const fields = {
      hasTitle: /^# /m.test(body),
      hasDescription: /^> /m.test(body),
      hasSections: /^## /m.test(body),
      hasLinks: /^- \[/m.test(body),
    };

    const requiredMet = fields.hasTitle && fields.hasDescription;
    const completeness = Object.values(fields).filter(Boolean).length;

    results[filename] = {
      url: fileUrl,
      exists: true,
      httpStatus: 200,
      sizeBytes: Buffer.byteLength(body, 'utf8'),
      fields,
      requiredMet,
      completeness: `${completeness}/${Object.keys(fields).length}`,
    };
  }

  return results;
}

if (require.main === module) {
  const url = process.argv[2];
  if (!url) { console.error('Usage: node llms-txt-checker.js <url>'); process.exit(1); }

  checkLlmsTxt(url).then(r => {
    if (r.error) { console.error('Error:', r.error); process.exit(1); }
    console.log('\nllms.txt check\n');
    for (const [file, info] of Object.entries(r)) {
      if (info.error) {
        console.log(`❓ /${file} — error: ${info.error}`);
        continue;
      }
      if (!info.exists) {
        console.log(`⬜ /${file} — not found (HTTP ${info.httpStatus || 'N/A'})`);
        continue;
      }
      const ok = info.requiredMet ? '✅' : '⚠️';
      console.log(`${ok} /${file} — ${info.sizeBytes}B, fields: ${info.completeness}`);
      console.log(`   title: ${info.fields.hasTitle ? '✅' : '❌'}  description: ${info.fields.hasDescription ? '✅' : '❌'}  sections: ${info.fields.hasSections ? '✅' : '—'}  links: ${info.fields.hasLinks ? '✅' : '—'}`);
    }
  }).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { checkLlmsTxt };
