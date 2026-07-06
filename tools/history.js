'use strict';

/**
 * Audit history — save score snapshots and compute trends between runs.
 *
 * Snapshots live in <project>/.agents/geo-audit-history/<domain>-<date>.json.
 * Written only when the user passes --save; reading is automatic so the
 * report can show a trend section whenever history exists.
 */

const fs = require('fs');
const path = require('path');

function historyDir(baseDir) {
  return path.join(baseDir, '.agents', 'geo-audit-history');
}

function sanitizeDomain(domain) {
  return String(domain || '').replace(/[^a-z0-9.-]/gi, '-');
}

// Minimal snapshot: enough to diff, small enough to commit
function snapshotFrom(result) {
  const s = result.scoreData;
  const d = s.dimensions;
  return {
    date: new Date().toISOString().slice(0, 10),
    url: result.url,
    total: s.total,
    totalMax: s.totalMax,
    level: s.level,
    dimensions: {
      structure: { raw: d.structure.raw, max: d.structure.max },
      authority: { raw: d.authority.raw, max: d.authority.max },
      presence:  { raw: d.presence.raw,  max: d.presence.max },
      technical: { raw: d.technical.raw, max: d.technical.max },
    },
  };
}

function saveHistory(result, baseDir, domain) {
  const dir = historyDir(baseDir);
  fs.mkdirSync(dir, { recursive: true });
  const snap = snapshotFrom(result);
  const file = path.join(dir, `${sanitizeDomain(domain)}-${snap.date}.json`);
  fs.writeFileSync(file, JSON.stringify(snap, null, 2) + '\n', 'utf8');
  return file;
}

function loadLatestHistory(domain, baseDir) {
  const dir = historyDir(baseDir);
  const prefix = `${sanitizeDomain(domain)}-`;
  let files;
  try {
    files = fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.json'));
  } catch (_) {
    return null;
  }
  if (files.length === 0) return null;
  files.sort(); // date suffix sorts lexicographically
  const latest = files[files.length - 1];
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, latest), 'utf8'));
  } catch (_) {
    return null;
  }
}

// Pure diff between a previous snapshot and the current scoreData
function computeTrend(prev, scoreData) {
  if (!prev || !prev.dimensions || !scoreData) return null;
  const d = scoreData.dimensions;

  function dimDelta(key) {
    const p = prev.dimensions[key];
    const c = d[key];
    if (!p || !c) return null;
    const prevRaw = p.raw;
    const currRaw = c.raw;
    const delta = (typeof prevRaw === 'number' && typeof currRaw === 'number')
      ? currRaw - prevRaw
      : null;
    return { prev: prevRaw, curr: currRaw, max: c.max, delta };
  }

  // Total is normalised to 0-100 so runs with different totalMax
  // (75 when presence unknown, 100 when known) stay comparable.
  const prevNorm = prev.totalMax ? Math.round((prev.total / prev.totalMax) * 100) : null;
  const currNorm = scoreData.totalMax ? Math.round((scoreData.total / scoreData.totalMax) * 100) : null;

  return {
    prevDate: prev.date,
    dims: {
      technical: dimDelta('technical'),
      structure: dimDelta('structure'),
      authority: dimDelta('authority'),
      presence: dimDelta('presence'),
    },
    total: {
      prev: `${prev.total}/${prev.totalMax}`,
      curr: `${scoreData.total}/${scoreData.totalMax}`,
      prevNormalized: prevNorm,
      currNormalized: currNorm,
      deltaNormalized: (prevNorm !== null && currNorm !== null) ? currNorm - prevNorm : null,
    },
  };
}

module.exports = { saveHistory, loadLatestHistory, computeTrend, snapshotFrom };
