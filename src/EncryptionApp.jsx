import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';

const Button = ({ children, ...props }) => (
  <button
    {...props}
    className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 ${props.className}`}
  >
    {children}
  </button>
);

export default function EncryptionApp() {
  const [cssFiles, setCssFiles] = useState([]);
  const [jsFiles, setJsFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultLink, setResultLink] = useState(null);
  const [progress, setProgress] = useState(0);
  const [archiveFormat, setArchiveFormat] = useState('zip');
  const [baseFilename, setBaseFilename] = useState('encrypted-files');
  const [fileHistory, setFileHistory] = useState([]);

  const cssInputRef = useRef(null);
  const jsInputRef = useRef(null);

  const formats = ['zip', 'tar.gz', '7z'];
  const fullFilename = `${baseFilename.trim() || 'encrypted-files'}.${archiveFormat}`;

  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileDrop = (e, type) => {
    preventDefaults(e);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
      type === 'css' ? file.name.endsWith('.css') : file.name.endsWith('.js')
    );
    if (type === 'css') setCssFiles(prev => [...prev, ...droppedFiles]);
    else if (type === 'js') setJsFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleSubmit = async () => {
    if (cssFiles.length === 0 && jsFiles.length === 0) {
      toast.error('Please upload at least one file.');
      return;
    }

    const formData = new FormData();
    cssFiles.forEach(file => formData.append('css', file));
    jsFiles.forEach(file => formData.append('js', file));
    formData.append('format', archiveFormat);

    setIsProcessing(true);
    setResultLink(null);
    setProgress(0);
    toast.loading('Encrypting files...');

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 10;
      if (p >= 95) clearInterval(interval);
      else setProgress(Math.min(95, Math.round(p)));
    }, 200);

    try {
      const response = await fetch('https://xancrypt-api.onrender.com/api/encrypt', {
        method: 'POST',
        body: formData,
      });      

      const data = await response.json();
      if (data.downloadLink) {
        const downloadURL = data.downloadLink;
        setResultLink(downloadURL);

        const timestamp = new Date().toLocaleString();
        setFileHistory(prev => [
          {
            timestamp,
            cssCount: cssFiles.length,
            jsCount: jsFiles.length,
            link: downloadURL,
            filename: fullFilename,
          },
          ...prev,
        ]);
        toast.dismiss();
        toast.success('Files encrypted successfully!');
      }

      setProgress(100);
    } catch (err) {
      toast.dismiss();
      toast.error('Encryption failed. Please try again.');
      console.error(err);
      setProgress(0);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 300);
    }
  };

  const downloadFile = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`✅ Downloaded: ${filename}`);
    } catch (err) {
      toast.error('Download failed.');
      console.error(err);
    }
  };

  const handleClear = () => {
    setCssFiles([]);
    setJsFiles([]);
    setResultLink(null);
    setProgress(0);
    setBaseFilename('encrypted-files');

    if (cssInputRef.current) cssInputRef.current.value = '';
    if (jsInputRef.current) jsInputRef.current.value = '';

    toast('Form cleared.', { icon: '🧹' });
  };

  const hasFiles = cssFiles.length > 0 || jsFiles.length > 0;

  return (
    <div className="space-y-6">
      {/* CSS Dropzone */}
      <div
        onClick={() => cssInputRef.current?.click()}
        onDrop={(e) => handleFileDrop(e, 'css')}
        onDragOver={preventDefaults}
        onDragEnter={preventDefaults}
        className="border-2 border-dashed border-blue-400 rounded-lg p-4 text-center text-sm cursor-pointer bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-gray-700 dark:text-gray-300"
      >
        Drag & drop CSS files here or click to select
        <input
          type="file"
          accept=".css"
          multiple
          ref={cssInputRef}
          onChange={(e) => setCssFiles(Array.from(e.target.files))}
          className="hidden"
        />
      </div>
      {cssFiles.length > 0 && (
        <ul className="text-xs mt-2 text-gray-500 dark:text-gray-300 list-disc list-inside">
          {cssFiles.map((f, i) => <li key={i}>{f.name}</li>)}
        </ul>
      )}

      {/* JS Dropzone */}
      <div
        onClick={() => jsInputRef.current?.click()}
        onDrop={(e) => handleFileDrop(e, 'js')}
        onDragOver={preventDefaults}
        onDragEnter={preventDefaults}
        className="border-2 border-dashed border-yellow-400 rounded-lg p-4 text-center text-sm cursor-pointer bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800 text-gray-700 dark:text-gray-300"
      >
        Drag & drop JS files here or click to select
        <input
          type="file"
          accept=".js"
          multiple
          ref={jsInputRef}
          onChange={(e) => setJsFiles(Array.from(e.target.files))}
          className="hidden"
        />
      </div>
      {jsFiles.length > 0 && (
        <ul className="text-xs mt-2 text-gray-500 dark:text-gray-300 list-disc list-inside">
          {jsFiles.map((f, i) => <li key={i}>{f.name}</li>)}
        </ul>
      )}

      {/* Format Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Archive Format</label>
        <select
          value={archiveFormat}
          onChange={(e) => setArchiveFormat(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-black dark:text-white px-3 py-2 rounded"
        >
          {formats.map((f) => (
            <option key={f} value={f}>
              .{f}
            </option>
          ))}
        </select>
      </div>

      {/* Base File Name Input */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">File name</label>
        <div className="flex">
          <input
            type="text"
            value={baseFilename}
            onChange={(e) => setBaseFilename(e.target.value)}
            placeholder="encrypted-files"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-black dark:text-white px-3 py-2 rounded-l"
          />
          <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm rounded-r border border-l-0 border-gray-300 dark:border-gray-600">
            .{archiveFormat}
          </span>
        </div>
      </div>

      {/* Encrypt Button */}
      <Button onClick={handleSubmit} disabled={isProcessing} className="w-full">
        {isProcessing ? 'Processing...' : 'Encrypt Files'}
      </Button>

      {/* Clear Form Button */}
      <Button
        onClick={handleClear}
        disabled={isProcessing || (!hasFiles && !resultLink)}
        className="w-full bg-red-600 hover:bg-red-700"
      >
        🔁 Clear Form
      </Button>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-200"
            style={{ width: `${progress}%` }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
            {progress}%
          </div>
        </div>
      )}

      {/* Download Link */}
      {resultLink && (
        <div className="text-center mt-4">
          <button
            onClick={() => downloadFile(resultLink, fullFilename)}
            className="text-blue-400 underline text-sm"
          >
            📦 Download Encrypted Files
          </button>
        </div>
      )}

      {/* File History */}
      {fileHistory.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2 text-white dark:text-white">📜 File History</h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            {fileHistory.map((entry, i) => (
              <li key={i} className="border p-3 rounded bg-gray-100 dark:bg-gray-800">
                <div><strong>Uploaded:</strong> {entry.timestamp}</div>
                <div><strong>CSS:</strong> {entry.cssCount}, <strong>JS:</strong> {entry.jsCount}</div>
                <div>
                  <a
                    href={entry.link}
                    download={entry.filename}
                    onClick={() => toast.success(`Download started: ${entry.filename}`)}
                    className="text-blue-500 underline"
                  >
                    ⬇️ Download {entry.filename}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
