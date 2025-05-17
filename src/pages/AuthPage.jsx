import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

export default function AuthPage({ setIsLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      setIsLoggedIn(true);
      toast.success('Logged in!');
      navigate('/');
    }

    if (params.get('verified')) {
      toast.success('Email verified! Please log in.');
    }

    if (params.get('loggedout')) {
      toast('👋 Logged out successfully');
    }
  }, [params, navigate, setIsLoggedIn]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'signup' && password !== confirm) {
      return toast.error("Passwords don't match");
    }

    try {
      const route = mode === 'login' ? '/auth/login' : '/auth/signup';

      if (mode === 'login') {
        const { data } = await api.post(route, { email, password });
        localStorage.setItem('token', data.token);
        setIsLoggedIn(true);
        toast.success('Logged in!');
        navigate('/');
      } else {
        setLoading(true);
        await api.post(route, { email, password });
        toast.success('Verification email sent! Check your inbox.');
        setMode('login');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const redirectTo = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/${provider}`;
    console.log('Redirecting to:', `${process.env.REACT_APP_API_URL}/api/auth/${provider}`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-center">
        {mode === 'login' ? 'Login' : 'Create Account'}
      </h2>

      {loading && (
        <div className="text-center text-blue-600 dark:text-blue-300 animate-pulse">
          Creating your account and sending verification…
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-800 text-black dark:text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          required
          placeholder="Password"
          className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-800 text-black dark:text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {mode === 'signup' && (
          <input
            type="password"
            required
            placeholder="Confirm Password"
            className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-800 text-black dark:text-white"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          disabled={loading}
        >
          {mode === 'login' ? 'Login' : 'Sign Up'}
        </button>
      </form>

      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={() => redirectTo('google')}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          Continue with Google
        </button>
        <button
          onClick={() => redirectTo('github')}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded"
        >
          Continue with GitHub
        </button>
      </div>

      <p className="text-center text-sm">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button onClick={() => setMode('signup')} className="text-blue-500 underline">Sign Up</button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button onClick={() => setMode('login')} className="text-blue-500 underline">Login</button>
          </>
        )}
      </p>
    </div>
  );
}
