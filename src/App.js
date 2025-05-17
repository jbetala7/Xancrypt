// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import EncryptionApp   from './EncryptionApp';
import AdminDashboard  from './pages/AdminDashboard';
import UserDashboard   from './pages/UserDashboard';
import AuthPage        from './pages/AuthPage';
import logo            from './logo.png';
import { Toaster }     from 'react-hot-toast';
import api             from './api';

export default function App() {
  const [darkMode,   setDarkMode]   = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // On mount, pick up any existing JWT and then attempt silent refresh
  useEffect(() => {
    if (localStorage.getItem('token')) {
      setIsLoggedIn(true);
    }

    api.post('/auth/refresh')
      .then(({ data }) => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          setIsLoggedIn(true);
        }
      })
      .catch(() => {
        // no-op
      });
  }, []);

  const handleLogout = () => {
    api.post('/auth/logout')
      .finally(() => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        // redirect to login with a toast flag
        window.location.href = '/auth?loggedout=1';
      });
  };

  return (
    <Router>
      <div className={darkMode ? 'dark' : ''}>
        {/* ─── HEADER ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 bg-[#0f172a] text-white shadow-md border-b border-blue-800">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Xancrypt Logo" className="w-20 h-20" />
              <div>
                <h1 className="text-xl font-bold tracking-wide">Xancrypt</h1>
                <p className="text-sm text-gray-300">Website Encryption Tool</p>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded border border-gray-600"
              >
                {darkMode ? '☀ Light Mode' : '🌙 Dark Mode'}
              </button>

              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-sm rounded transition"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm rounded transition"
                >
                  Login
                </Link>
              )}

              <Link
                to="/admin"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-sm rounded transition"
              >
                Admin
              </Link>

              {isLoggedIn && (
                <Link
                  to="/dashboard"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-sm rounded transition"
                >
                  My Account
                </Link>
              )}

            </div>
          </div>
        </header>

        <Toaster
          position="bottom-center"
          toastOptions={{
            className: 'text-sm border bg-white dark:bg-gray-800 dark:text-white',
            duration: 4000,
          }}
        />

        {/* ─── ROUTES & LAYOUT ─────────────────────────────────────────────────── */}
        <main className="min-h-screen bg-[#f9fafb] dark:bg-[#1e293b] text-black dark:text-white px-4 py-10">
          <Routes>

            {/* ADMIN (full-width) */}
            <Route
              path="/admin"
              element={
                <div className="mx-auto max-w-full p-6 bg-white dark:bg-[#273549] shadow-lg">
                  <AdminDashboard />
                </div>
              }
            />

            {/* USER DASHBOARD (full-width) */}
            <Route
              path="/dashboard"
              element={
                <div className="mx-auto max-w-full p-6 bg-white dark:bg-[#273549] shadow-lg">
                  <UserDashboard />
                </div>
              }
            />

            {/* AUTH (login/signup) */}
            <Route
              path="/auth"
              element={
                <div className="mx-auto max-w-xl rounded-xl p-6 bg-white dark:bg-[#273549] shadow-lg">
                  <AuthPage setIsLoggedIn={setIsLoggedIn} />
                </div>
              }
            />

            {/* HOME / ENCRYPTION TOOL */}
            <Route
              path="/"
              element={
                <div className="mx-auto max-w-xl rounded-xl p-6 bg-white dark:bg-[#273549] shadow-lg">
                  <EncryptionApp />
                </div>
              }
            />

          </Routes>
        </main>
      </div>
    </Router>
  );
}
