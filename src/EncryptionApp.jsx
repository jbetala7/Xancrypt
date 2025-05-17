// src/EncryptionApp.jsx

import React, { useState, useRef, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import api from './api' // Axios instance, baseURL points to BACKEND_URL + '/api'

const Button = ({ children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 ${props.className}`}
  >
    {children}
  </button>
)

export default function EncryptionApp() {
  const [cssFiles, setCssFiles] = useState([])
  const [jsFiles, setJsFiles] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultLink, setResultLink] = useState(null)
  const [elapsedSec, setElapsedSec] = useState(null)
  const [progress, setProgress] = useState(0)
  const [archiveFormat, setArchiveFormat] = useState('zip')
  const [baseFilename, setBaseFilename] = useState('encrypted-files')
  const [fileHistory, setFileHistory] = useState([])

  const cssInputRef = useRef(null)
  const jsInputRef  = useRef(null)

  const formats      = ['zip', 'tar.gz', '7z']
  const fullFilename = `${(baseFilename || 'encrypted-files').trim()}.${archiveFormat}`

  // determine login state
  const token      = localStorage.getItem('token')
  const isLoggedIn = Boolean(token)

  // load history once on mount
  useEffect(() => {
    if (isLoggedIn) {
      api.get('/history')
        .then(res => {
          // Map backend 'time' to frontend 'timestamp'
          const mapped = res.data.map(entry => ({
            ...entry,
            timestamp: entry.time || entry.timestamp // fallback for localStorage
          }))
          setFileHistory(mapped)
        })
        .catch(() => toast.error('Could not load history from server'))
    } else {
      const saved = localStorage.getItem('xancrypt_history')
      if (saved) setFileHistory(JSON.parse(saved))
    }
  }, [isLoggedIn])

  const preventDefaults = e => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleFileDrop = (e, type) => {
    preventDefaults(e)
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      type === 'css' ? f.name.endsWith('.css') : f.name.endsWith('.js')
    )
    if (type === 'css') setCssFiles(prev => [...prev, ...dropped])
    else               setJsFiles(prev => [...prev, ...dropped])
  }

  const handleSubmit = async () => {
    if (!cssFiles.length && !jsFiles.length) {
      toast.error('Please upload at least one file.')
      return
    }

    const formData = new FormData()
    cssFiles.forEach(f => formData.append('css', f))
    jsFiles.forEach(f => formData.append('js', f))
    formData.append('format', archiveFormat)
    formData.append('name', baseFilename)

    // deviceId for rate limit
    let deviceId = localStorage.getItem('deviceId')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('deviceId', deviceId)
    }
    formData.append('deviceId', deviceId)

    const headers = { 'x-test-ip': '192.168.88.101' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    setIsProcessing(true)
    setResultLink(null)
    setElapsedSec(null)
    setProgress(0)
    toast.loading('Encrypting files...')

    const interval = setInterval(() => {
      setProgress(p => {
        const next = p + Math.random() * 10
        if (next >= 95) {
          clearInterval(interval)
          return 95
        }
        return Math.round(next)
      })
    }, 200)

    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/encrypt`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (resp.status === 429) {
        const { nextAllowed } = await resp.json()
        toast.error(`Free limit reached. Try again at ${new Date(nextAllowed).toLocaleTimeString()}`)
        return
      }

      const data = await resp.json()
      if (data.downloadLink) {
        const downloadURL = `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}${data.downloadLink}`;
        setResultLink(downloadURL);
        setElapsedSec(data.elapsedSec);

        // use the server-returned archiveName
        const serverFilename = data.archiveName || downloadURL.split('/').pop();

        const newEntry = {
          timestamp:  new Date().toISOString(),
          cssCount:   cssFiles.length,
          jsCount:    jsFiles.length,
          elapsedSec: Number(data.elapsedSec),
          link:       downloadURL,
          filename:   serverFilename,
        };

        if (isLoggedIn) {
          // push to server and local state
          api.post('/history', newEntry).catch(() => {})
          setFileHistory(prev => [
            { ...newEntry, timestamp: newEntry.timestamp }, // always use timestamp
            ...prev.map(entry => ({
              ...entry,
              timestamp: entry.timestamp || entry.time // normalize old entries
            }))
          ])
        } else {
          // localStorage fallback
          const updated = [
            { ...newEntry, timestamp: newEntry.timestamp },
            ...fileHistory.map(entry => ({
              ...entry,
              timestamp: entry.timestamp || entry.time
            }))
          ]
          localStorage.setItem('xancrypt_history', JSON.stringify(updated))
          setFileHistory(updated)
        }

        toast.dismiss()
        toast.success('Files encrypted successfully!')
      }
    } catch (err) {
      console.error(err)
      toast.dismiss()
      toast.error('Encryption failed. Please try again.')
    } finally {
      clearInterval(interval)
      setTimeout(() => setIsProcessing(false), 300)
    }
  }

  const downloadFile = async (url, filename) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)
      toast.success(`✅ Downloaded: ${filename}`)
    } catch {
      toast.error('Download failed.')
    }
  }

  const handleClear = () => {
    setCssFiles([])
    setJsFiles([])
    setResultLink(null)
    setElapsedSec(null)
    setProgress(0)
    setBaseFilename('encrypted-files')
    if (cssInputRef.current) cssInputRef.current.value = ''
    if (jsInputRef.current)  jsInputRef.current.value = ''
    toast('Form cleared.', { icon: '🧹' })
  }

  const handleClearHistory = () => {
    if (isLoggedIn) {
      api.delete('/history').catch(() => toast.error('Failed to clear server history'))
    }
    localStorage.removeItem('xancrypt_history')
    setFileHistory([])
    toast('History cleared 🧹')
  }

  // Helper to normalize history entries
  const normalizedHistory = fileHistory.map(entry => ({
    ...entry,
    timestamp: entry.timestamp || entry.time
  }));

  const hasFiles = cssFiles.length || jsFiles.length

  return (
    <div className="space-y-6">
      {/* CSS Dropzone */}
      <div
        onClick={() => cssInputRef.current?.click()}
        onDrop={e => handleFileDrop(e, 'css')}
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
          onChange={e => setCssFiles(Array.from(e.target.files))}
          className="hidden"
        />
      </div>
      {cssFiles.length > 0 && (
        <ul className="text-xs mt-2 text-gray-500 dark:text-gray-300 list-disc list-inside">
          {cssFiles.map((f,i) => <li key={i}>{f.name}</li>)}
        </ul>
      )}

      {/* JS Dropzone */}
      <div
        onClick={() => jsInputRef.current?.click()}
        onDrop={e => handleFileDrop(e, 'js')}
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
          onChange={e => setJsFiles(Array.from(e.target.files))}
          className="hidden"
        />
      </div>
      {jsFiles.length > 0 && (
        <ul className="text-xs mt-2 text-gray-500 dark:text-gray-300 list-disc list-inside">
          {jsFiles.map((f,i) => <li key={i}>{f.name}</li>)}
        </ul>
      )}

      {/* Archive format selector */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Archive Format
        </label>
        <select
          value={archiveFormat}
          onChange={e => setArchiveFormat(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-black dark:text-white px-3 py-2 rounded"
        >
          {formats.map(f => <option key={f} value={f}>.{f}</option>)}
        </select>
      </div>

      {/* Base filename input */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          File Name
        </label>
        <div className="flex">
          <input
            type="text"
            value={baseFilename}
            onChange={e => setBaseFilename(e.target.value)}
            placeholder="encrypted-files"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-black dark:text-white px-3 py-2 rounded-l"
          />
          <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm rounded-r border border-l-0 border-gray-300 dark:border-gray-600">
            .{archiveFormat}
          </span>
        </div>
      </div>

      {/* Encrypt / Clear */}
      <Button onClick={handleSubmit} disabled={isProcessing} className="w-full">
        {isProcessing ? 'Processing...' : 'Encrypt Files'}
      </Button>
      <Button
        onClick={handleClear}
        disabled={isProcessing || (!hasFiles && !resultLink)}
        className="w-full bg-red-600 hover:bg-red-700"
      >
        🔁 Clear Form
      </Button>

      {/* Progress bar */}
      {isProcessing && (
        <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
            {progress}%
          </div>
        </div>
      )}

      {/* Elapsed time */}
      {elapsedSec !== null && (
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          ⏱️ Encryption took <strong>{elapsedSec.toFixed(2)} s</strong>
        </p>
      )}

      {/* Download link */}
      {resultLink && (
        <div className="text-center mt-4">
          <button
            onClick={() => downloadFile(resultLink, fullFilename)}
            className="text-blue-400 underline text-sm"
          >
            📦 Download {fullFilename}
          </button>
        </div>
      )}

      {/* File History */}
      {normalizedHistory.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2 text-white dark:text-white">📜 File History</h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            {normalizedHistory.map((entry, i) => (
              <li key={i} className="border p-3 rounded bg-gray-100 dark:bg-gray-800">
                <div><strong>Uploaded:</strong> {new Date(entry.timestamp).toLocaleString()}</div>
                <div><strong>CSS:</strong> {entry.cssCount}, <strong>JS:</strong> {entry.jsCount}</div>
                <div><strong>Time:</strong> {(entry.elapsedSec||0).toFixed(2)} s</div>
                <div>
                  <button
                    type="button"
                    onClick={() => downloadFile(entry.link, entry.filename)}
                    className="text-blue-500 underline text-sm"
                  >
                    ⬇️ Download {entry.filename}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Button
            onClick={handleClearHistory}
            className="mt-4 bg-red-500 hover:bg-red-600 w-full"
          >
            Clear File History
          </Button>
        </div>
      )}
    </div>
  )
}