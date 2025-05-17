// src/pages/UserDashboard.jsx
import React, { useState } from 'react';
import useUserDashboard from '../hooks/useUserDashboard';

export default function UserDashboard() {
  const {
    MAX_FILES,
    user,
    plan,
    remaining,
    nextReset,
    used,
    form,
    editing,
    loading,
    passwordForm,
    showPasswordForm,
    setForm,
    setEditing,
    setPasswordForm,
    setShowPasswordForm,
    saveProfile,
    changePassword,
    cancelSubscription
  } = useUserDashboard();

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!user || !plan || remaining == null) return <div>Loading…</div>;

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100 p-6">
      {loading && (
        <div className="text-center text-blue-600 dark:text-blue-300 animate-pulse">
          Saving your profile and verifying...
        </div>
      )}

      {!user.active && (
        <div className="bg-yellow-100 border-l-4 border-yellow-600 text-yellow-800 dark:text-black-200 p-4 rounded">
          Please verify your email to unlock full access. Check your inbox!
        </div>
      )}

      {/* Profile */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Your Profile</h2>
        {editing ? (
          <>
            <label className="block mb-2">
              First Name<br />
              <input
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className="dark:bg-gray-800 w-full border px-2 py-1 rounded"
              />
            </label>
            <label className="block mb-2">
              Last Name<br />
              <input
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className="dark:bg-gray-800 w-full border px-2 py-1 rounded"
              />
            </label>
            <label className="block mb-4">
              Email<br />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="dark:bg-gray-800 w-full border px-2 py-1 rounded"
              />
            </label>
            <button
              onClick={saveProfile}
              className="bg-green-600 text-white px-4 py-2 rounded mr-2"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setForm({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email });
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <p><strong>First Name:</strong> {user.firstName || '—'}</p>
            <p><strong>Last Name:</strong>  {user.lastName  || '—'}</p>
            <p><strong>Email:</strong>      {user.email}</p>
            <div className="mt-3 space-x-2">
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setShowPasswordForm(prev => !prev)}
                className="bg-indigo-600 text-white px-4 py-2 rounded"
              >
                Change Password
              </button>
            </div>
          </>
        )}
      </section>

      {/* Password */}
      {showPasswordForm && (
        <section className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Change Password</h2>

          {/* Old Password */}
          <label className="block mb-2">
            Old Password
            <div className="flex items-center">
              <input
                type={showOld ? 'text' : 'password'}
                value={passwordForm.oldPassword}
                onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                className="dark:bg-gray-800 w-full border px-2 py-1 rounded"
              />
              <button
                type="button"
                className="ml-2 text-sm text-gray-500"
                onClick={() => setShowOld(!showOld)}
              >
                {showOld ? '🙈' : '👁'}
              </button>
            </div>
          </label>

          {/* New Password */}
          <label className="block mb-2">
            New Password
            <div className="flex items-center">
              <input
                type={showNew ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="dark:bg-gray-800 w-full border px-2 py-1 rounded"
              />
              <button
                type="button"
                className="ml-2 text-sm text-gray-500"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? '🙈' : '👁'}
              </button>
            </div>
          </label>

          {/* Confirm Password */}
          <label className="block mb-4">
            Confirm New Password
            <div className="flex items-center">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="dark:bg-gray-800 w-full border px-2 py-1 rounded"
              />
              <button
                type="button"
                className="ml-2 text-sm text-gray-500"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? '🙈' : '👁'}
              </button>
            </div>
          </label>

          <button
            onClick={changePassword}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Change Password
          </button>
        </section>
      )}

      {/* Subscription */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-2">Your Plan</h2>
        <p><strong>Plan:</strong> {plan.plan}</p>
        {plan.plan === 'free' ? (
          <button
            onClick={() => window.location.href = '/dashboard?upgrade=1'}
            className="mt-3 bg-purple-600 text-white px-4 py-2 rounded"
          >
            Upgrade to Paid
          </button>
        ) : (
          <button
            onClick={cancelSubscription}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded"
          >
            Cancel Subscription
          </button>
        )}
      </section>

      {/* Usage */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-2">Encryption Usage</h2>
        <p>You have encrypted <strong>{used}</strong> files so far.</p>
        {plan.plan === 'free' && used >= MAX_FILES && (
          <p className="mt-2 text-red-600">
            You’ve reached your free limit. You can encrypt again after {new Date(nextReset).toLocaleString()} or upgrade above.
          </p>
        )}
      </section>
    </div>
  );
}
