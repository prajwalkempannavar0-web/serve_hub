const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldCheckForUpdates } = require('../electron/updater');

test('skips update checks when no feed is configured', () => {
  assert.equal(
    shouldCheckForUpdates({
      isPackaged: true,
      env: {},
    }),
    false,
  );
});

test('allows update checks only when a valid update URL is configured', () => {
  assert.equal(
    shouldCheckForUpdates({
      isPackaged: true,
      env: { SERVEHUB_UPDATE_URL: 'https://example.com/releases/latest' },
    }),
    true,
  );
});

test('disables update checks when explicitly turned off', () => {
  assert.equal(
    shouldCheckForUpdates({
      isPackaged: true,
      env: {
        SERVEHUB_DISABLE_UPDATES: '1',
        SERVEHUB_UPDATE_URL: 'https://example.com/releases/latest',
      },
    }),
    false,
  );
});
