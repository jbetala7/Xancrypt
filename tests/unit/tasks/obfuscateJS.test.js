const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const obfuscateJS = require('../../../server/tasks/obfuscateJS');

describe('obfuscateJS()', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'obf-js-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('obfuscates all .js files in a folder', async () => {
    const source = 'function add(a, b) { return a + b; }';
    const filePath = path.join(tmpDir, 'foo.js');
    await fs.writeFile(filePath, source, 'utf8');
    await fs.writeFile(path.join(tmpDir, 'ignore.md'), '# hi', 'utf8');

    const results = await obfuscateJS(tmpDir);
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(1);

    const [{ name, contents }] = results;
    expect(name).toBe('foo.js');

    const obf = contents.toString('utf8');
    // 1) Should not be byte-for-byte identical
    expect(obf).not.toBe(source);

    // 2) Should contain mangled identifiers (_0x...)
    expect(obf).toMatch(/_0x[a-f0-9]+/);

    // 3) Typically longer than the original
    expect(obf.length).toBeGreaterThan(source.length);
  });
});
