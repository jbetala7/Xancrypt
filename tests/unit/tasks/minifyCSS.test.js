const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const minifyCSS = require('../../../server/tasks/minifyCSS');

describe('minifyCSS()', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minify-css-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('minifies all .css files in a folder', async () => {
    const original = 'body {   margin:0;   padding:0; }';
    await fs.writeFile(path.join(tmpDir, 'foo.css'), original, 'utf8');
    // also write a non-CSS file to verify it is ignored
    await fs.writeFile(path.join(tmpDir, 'ignore.txt'), 'hello', 'utf8');

    const results = await minifyCSS(tmpDir);
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(1);

    const [{ name, contents }] = results;
    expect(name).toBe('foo.css');
    const minified = contents.toString('utf8');
    expect(minified).toBe('body{margin:0;padding:0}');
  });
});
