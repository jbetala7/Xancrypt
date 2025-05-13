// src/tests/EncryptionApp.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EncryptionApp from '../EncryptionApp';
import { toast } from 'react-hot-toast';

// --- 1) Mock react-hot-toast ---
jest.mock('react-hot-toast', () => {
  const t = jest.fn();
  t.error   = jest.fn();
  t.success = jest.fn();
  t.loading = jest.fn();
  t.dismiss = jest.fn();
  return { toast: t };
});

// --- 2) Mock fetch only for this suite ---
const fakeResponse = {
  downloadLink: '/api/encrypt/download/fake.zip',
  elapsedSec: 1.23,
};

beforeAll(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(fakeResponse),
  });
});

afterAll(() => {
  global.fetch.mockRestore();
});

// --- 3) Reset mocks between tests ---
beforeEach(() => {
  jest.clearAllMocks();
});

test('shows error if Encrypt clicked with no files', () => {
  render(<EncryptionApp />);
  fireEvent.click(screen.getByRole('button', { name: /encrypt files/i }));
  expect(toast.error).toHaveBeenCalledWith('Please upload at least one file.');
});

test('drops a CSS file into the CSS zone and lists it', () => {
  render(<EncryptionApp />);
  const cssZone = screen.getByText(/drag & drop css files here/i);
  const file = new File(['a'], 'styles.css', { type: 'text/css' });
  fireEvent.drop(cssZone, { dataTransfer: { files: [file] } });
  expect(screen.getByText('styles.css')).toBeInTheDocument();
});

test('drops a JS file into the JS zone and lists it', () => {
  render(<EncryptionApp />);
  const jsZone = screen.getByText(/drag & drop js files here/i);
  const file = new File(['b'], 'script.js', { type: 'application/javascript' });
  fireEvent.drop(jsZone, { dataTransfer: { files: [file] } });
  expect(screen.getByText('script.js')).toBeInTheDocument();
});

test('clears form on Clear Form click', () => {
  render(<EncryptionApp />);
  // preload one CSS file
  fireEvent.drop(
    screen.getByText(/drag & drop css files here/i),
    { dataTransfer: { files: [new File(['x'], 'foo.css', { type: 'text/css' })] } }
  );
  expect(screen.getByText('foo.css')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /clear form/i }));
  expect(screen.queryByText('foo.css')).toBeNull();
  expect(toast).toHaveBeenCalledWith('Form cleared.', { icon: '🧹' });
});

// test('encryption flow shows download link & elapsed time', async () => {
//   render(<EncryptionApp />);

//   // 1) Drop a CSS file
//   fireEvent.drop(
//     screen.getByText(/drag & drop css files here/i),
//     { dataTransfer: { files: [new File(['c'], 'test.css', { type: 'text/css' })] } }
//   );

//   // 2) Click Encrypt
//   fireEvent.click(screen.getByRole('button', { name: /encrypt files/i }));
//   expect(toast.loading).toHaveBeenCalledWith('Encrypting files...');

//   // 3) Wait for the primary Download button
//   const allDownloads = await screen.findAllByRole('button', {
//     name: /download encrypted-files\.zip/i
//   });
//   expect(allDownloads.length).toBeGreaterThan(0);

//   // 4) Check elapsed time (handles split text nodes)
//   const elapsed = await screen.findByText(text =>
//     text.includes('Encryption took') && text.includes('1.23 s')
//   );
//   expect(elapsed).toBeInTheDocument();

//   // 5) Success toast
//   expect(toast.success).toHaveBeenCalledWith('Files encrypted successfully!');
// });

test('Encrypt button re-enables after processing', async () => {
  render(<EncryptionApp />);

  // Drop a CSS file
  fireEvent.drop(
    screen.getByText(/drag & drop css files here/i),
    { dataTransfer: { files: [new File(['d'], 'a.css', { type: 'text/css' })] } }
  );

  const btn = screen.getByRole('button', { name: /encrypt files/i });
  fireEvent.click(btn);

  // Immediately disabled
  expect(btn).toBeDisabled();

  // Wait until it re-enables (after the final setTimeout in your component)
  await waitFor(() => {
    expect(btn).not.toBeDisabled();
  });
});
