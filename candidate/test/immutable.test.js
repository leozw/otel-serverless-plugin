'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const baseline = require('../legacy-baseline.json');
test('all pre-existing public paths remain byte-identical; candidate is not a drop-in patch', () => {
  const repo = path.resolve(__dirname, '../..');
  for (const item of baseline.files) {
    const bytes = fs.readFileSync(path.join(repo, item.path));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256, item.path);
  }
});
