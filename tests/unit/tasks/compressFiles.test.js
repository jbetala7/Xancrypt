/**
 * @jest-environment node
 */
jest.setTimeout(15000);

// Polyfill in case Node globals are missing (e.g. some CI setups)
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const compressFiles = require('../../../server/tasks/compressFiles');

describe('compressFiles()', () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zip-test-'));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates a ZIP containing exactly the provided files', async () => {
    const files = [
      { name: 'a.txt', contents: Buffer.from('Hello A') },
      { name: 'b.txt', contents: Buffer.from('Hello B') }
    ];

    const zipPath = path.join(tmpDir, 'out.zip');
    await compressFiles(files, zipPath);

    // Load and inspect
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries().map(e => e.entryName).sort();
    expect(entries).toEqual(['a.txt', 'b.txt']);

    // Verify contents
    expect(zip.readFile('a.txt').toString()).toBe('Hello A');
    expect(zip.readFile('b.txt').toString()).toBe('Hello B');
  });
});
