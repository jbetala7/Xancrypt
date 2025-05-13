// src/setupTests.js

// 1) Import DOM matchers (jest-dom)
import '@testing-library/jest-dom';

// 2) Polyfill fetch only when running React tests
//    (Any server-side/unit test in tests/unit/... won’t load this file)
const fakeResponse = {
  downloadLink: '/api/encrypt/download/fake.zip',
  elapsedSec: 1.23,
};

beforeAll(() => {
  // Only mock if fetch exists
  if (typeof global.fetch === 'function') {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeResponse),
    });
  }
});

afterAll(() => {
  if (global.fetch && global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
});
