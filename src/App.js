import React, { useState } from 'react';
import EncryptionApp from './EncryptionApp';
import logo from './logo.png';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className={darkMode ? 'dark' : ''}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#0f172a] text-white shadow-md border-b border-blue-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Xancrypt Logo" className="w-20 h-20" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">Xancrypt</h1>
              <p className="text-sm text-gray-300">Website Encryption Tool</p>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="mt-3 sm:mt-0 bg-gray-800 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded border border-gray-600"
          >
            {darkMode ? '☀ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </header>

      <Toaster
        position="bottom-center"
        toastOptions={{
          className: 'text-sm border bg-white dark:bg-gray-800 dark:text-white',
          duration: 4000,
        }}
      />


      {/* Main App Body */}
      <main className="min-h-screen bg-[#f9fafb] dark:bg-[#1e293b] text-black dark:text-white px-4 py-10">
        <div className="max-w-xl mx-auto rounded-xl p-6 bg-white dark:bg-[#273549] shadow-lg">
          <EncryptionApp />
        </div>
      </main>
    </div>
  );
}
