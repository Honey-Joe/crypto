import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { decodeBytes, decodeUtf8, encodeBytes, encodedLength, parseBase64, parseHex } from '../src/utils/encoding.js';
import { ValidationError } from '../src/utils/errors.js';
import { summarize, throughputBytesPerSecond } from '../src/utils/stats.js';

describe('encoding', () => {
  test('parses hex strictly, ignoring whitespace and a 0x prefix', () => {
    assert.equal(parseHex('0x00 ff\n10').toString('hex'), '00ff10');
    assert.throws(() => parseHex('abc'), ValidationError); // odd length
    assert.throws(() => parseHex('zz'), ValidationError);
    assert.throws(() => parseHex(42), ValidationError);
  });

  test('parses standard padded Base64 strictly', () => {
    assert.equal(parseBase64('AAEC').toString('hex'), '000102');
    assert.equal(parseBase64('AAE=').toString('hex'), '0001');
    for (const bad of ['AAE', 'AA=E', 'AA*=', 'AAEC=', '-_8=']) {
      assert.throws(() => parseBase64(bad), ValidationError, bad);
    }
  });

  test('round-trips through both output formats', () => {
    const bytes = Buffer.from('lightweight', 'utf8');
    for (const format of ['hex', 'base64']) {
      const encoded = encodeBytes(bytes, format);
      assert.equal(encoded.length, encodedLength(bytes.length, format));
      assert.deepEqual(decodeBytes(encoded, format), bytes);
    }
  });

  test('rejects unknown formats', () => {
    assert.throws(() => encodeBytes(Buffer.alloc(1), 'binary'), ValidationError);
    assert.throws(() => decodeBytes('00', 'base32'), ValidationError);
  });

  test('reports invalid UTF-8', () => {
    assert.deepEqual(decodeUtf8(Buffer.from('héllo', 'utf8')), { text: 'héllo', valid: true });
    assert.equal(decodeUtf8(Buffer.from([0xff, 0xfe])).valid, false);
  });
});

describe('statistics', () => {
  test('summarises samples', () => {
    const stats = summarize([4, 1, 3, 2]);
    assert.equal(stats.count, 4);
    assert.equal(stats.mean, 2.5);
    assert.equal(stats.median, 2.5);
    assert.equal(stats.min, 1);
    assert.equal(stats.max, 4);
    assert.ok(Math.abs(stats.stdDev - Math.sqrt(5 / 3)) < 1e-12);
    assert.equal(summarize([5, 1, 3]).median, 3);
    assert.equal(summarize([7]).stdDev, 0);
    assert.throws(() => summarize([]), RangeError);
  });

  test('computes throughput as bytes per second', () => {
    assert.equal(throughputBytesPerSecond(1024, 1), 1024000); // 1 KiB in 1 ms
    assert.equal(throughputBytesPerSecond(500, 250), 2000);
    assert.equal(throughputBytesPerSecond(1024, 0), null);
    assert.equal(throughputBytesPerSecond(1024, Number.NaN), null);
  });
});
