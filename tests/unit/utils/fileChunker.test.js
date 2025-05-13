// tests/unit/utils/fileChunker.test.js
const { calculateChunkCount, shouldStream } = require('../../../server/utils/fileChunker');

describe('calculateChunkCount()', () => {
  it('returns 1 when totalSize <= chunkSize', () => {
    expect(calculateChunkCount(5_000, 10_000)).toBe(1);
  });

  it('rounds up when totalSize is not a multiple', () => {
    // 25 MB file, 10 MB chunks → 3 chunks
    expect(calculateChunkCount(25 * 1024 * 1024, 10 * 1024 * 1024)).toBe(3);
  });

  it('throws when chunkSize is zero or negative', () => {
    expect(() => calculateChunkCount(1000, 0)).toThrow('chunkSize must be > 0');
    expect(() => calculateChunkCount(1000, -5)).toThrow();
  });
});

describe('shouldStream()', () => {
  it('returns false when fileSize equals threshold', () => {
    expect(shouldStream(10_000, 10_000)).toBe(false);
  });

  it('returns true when fileSize exceeds threshold', () => {
    expect(shouldStream(15_000, 10_000)).toBe(true);
  });

  it('returns false for very small files', () => {
    expect(shouldStream(1024, 2048)).toBe(false);
  });
});
