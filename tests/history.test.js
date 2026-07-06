'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { saveHistory, loadLatestHistory, computeTrend, snapshotFrom } = require('../tools/history.js');

function makeResult(overrides = {}) {
  return {
    url: 'https://example.com',
    scoreData: {
      total: 48,
      totalMax: 75,
      level: 3,
      dimensions: {
        structure: { raw: 18, max: 30 },
        authority: { raw: 12, max: 25 },
        presence:  { raw: null, max: 25 },
        technical: { raw: 18, max: 20 },
      },
      ...overrides,
    },
  };
}

// ── computeTrend (pure) ──────────────────────────────────────────────────────

test('computeTrend — positive deltas when score improves', () => {
  const prev = snapshotFrom(makeResult());
  const curr = makeResult({
    total: 58,
    dimensions: {
      structure: { raw: 24, max: 30 },
      authority: { raw: 16, max: 25 },
      presence:  { raw: null, max: 25 },
      technical: { raw: 18, max: 20 },
    },
  }).scoreData;

  const trend = computeTrend(prev, curr);
  assert.equal(trend.dims.structure.delta, 6);
  assert.equal(trend.dims.authority.delta, 4);
  assert.equal(trend.dims.technical.delta, 0);
  assert.equal(trend.prevDate, prev.date);
});

test('computeTrend — presence unknown in both runs gives null delta', () => {
  const prev = snapshotFrom(makeResult());
  const curr = makeResult().scoreData;
  const trend = computeTrend(prev, curr);
  assert.equal(trend.dims.presence.delta, null);
  assert.equal(trend.dims.presence.prev, null);
});

test('computeTrend — total normalized across different totalMax (75 vs 100)', () => {
  const prev = snapshotFrom(makeResult()); // 48/75 = 64
  const curr = makeResult({
    total: 70,
    totalMax: 100, // presence became known: 70/100 = 70
    dimensions: {
      structure: { raw: 24, max: 30 },
      authority: { raw: 16, max: 25 },
      presence:  { raw: 12, max: 25 },
      technical: { raw: 18, max: 20 },
    },
  }).scoreData;

  const trend = computeTrend(prev, curr);
  assert.equal(trend.total.prevNormalized, 64);
  assert.equal(trend.total.currNormalized, 70);
  assert.equal(trend.total.deltaNormalized, 6);
});

test('computeTrend — returns null for missing previous snapshot', () => {
  assert.equal(computeTrend(null, makeResult().scoreData), null);
});

// ── saveHistory / loadLatestHistory (fs round-trip in tmp dir) ───────────────

test('saveHistory + loadLatestHistory round-trip', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-audit-test-'));
  try {
    const file = saveHistory(makeResult(), tmp, 'example.com');
    assert.ok(fs.existsSync(file), 'Snapshot file written');
    assert.ok(file.includes('.agents'), 'Written under .agents/geo-audit-history');

    const loaded = loadLatestHistory('example.com', tmp);
    assert.equal(loaded.total, 48);
    assert.equal(loaded.dimensions.structure.raw, 18);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('loadLatestHistory — returns null when no history exists', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-audit-test-'));
  try {
    assert.equal(loadLatestHistory('example.com', tmp), null);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('loadLatestHistory — picks the latest of multiple snapshots', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-audit-test-'));
  try {
    const dir = path.join(tmp, '.agents', 'geo-audit-history');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'example.com-2026-05-01.json'), JSON.stringify({ total: 30, date: '2026-05-01', dimensions: {} }));
    fs.writeFileSync(path.join(dir, 'example.com-2026-06-15.json'), JSON.stringify({ total: 55, date: '2026-06-15', dimensions: {} }));

    const loaded = loadLatestHistory('example.com', tmp);
    assert.equal(loaded.total, 55, 'Should load the newest snapshot');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('loadLatestHistory — does not cross domains', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-audit-test-'));
  try {
    const dir = path.join(tmp, '.agents', 'geo-audit-history');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'other.com-2026-06-15.json'), JSON.stringify({ total: 99, date: '2026-06-15', dimensions: {} }));
    assert.equal(loadLatestHistory('example.com', tmp), null);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
