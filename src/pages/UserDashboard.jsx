// src/pages/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api   from '../api';

export default function UserDashboard() {
  const MAX_FILES = 5;

  // fetched data
  const [user, setUser]           = useState(null);
  const [plan, setPlan]           = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [nextReset, setNextReset] = useState(null);

  // UI/edit state
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({
    firstName: '',
    lastName:  '',
    email:     ''
  });

  // derived
  const used = remaining != null ? MAX_FILES - remaining : 0;

  useEffect(() => {
    // load profile
    api.get('/users/me')
      .then(res => {
        setUser(res.data);
        setForm({
          firstName: res.data.firstName || '',
          lastName:  res.data.lastName  || '',
          email:     res.data.email
        });
      })
      .catch(() => toast.error('Failed loading profile'));

    // load subscription
    api.get('/subscription')
      .then(res => setPlan(res.data))
      .catch(() => toast.error('Failed loading subscription'));

    // load usage
    api.get('/encrypt/remaining')
      .then(res => {
        setRemaining(res.data.remaining);
        setNextReset(res.data.nextReset);
      })
      .catch(() => toast.error('Failed loading usage'));
  }, []);

  const saveProfile = async () => {
    try {
      await api.patch('/users/me', form);
      toast.success('Profile saved — verify email if you changed it');
      setEditing(false);
      // reload to get updated `active` flag if email changed
      const me = await api.get('/users/me');
      setUser(me.data);
    } catch {
      toast.error('Save failed');
    }
  };

  if (!user || !plan || remaining == null) {
    return <div>Loading…</div>;
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100 p-6">
      {/* Profile */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Your Profile</h2>
        {editing ? (
          <>
            <label className="block mb-2">
              First Name<br/>
              <input
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className="dark:bg-gray-800 w-full border px-2 py-1 rounded"
              />
            </label>
            <label className="block mb-2">
              Last Name<br/>
              <input
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className="dark:bg-gray-800 w-full border px-2 py-1 rounded"
              />
            </label>
            <label className="block mb-4">
              Email<br/>
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
                // reset form to last-saved
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
            <button
              onClick={() => setEditing(true)}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded"
            >
              Edit Profile
            </button>
          </>
        )}
      </section>

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
            onClick={() => {
              api.post('/subscription/cancel')
                .then(() => toast.success('Subscription cancelled'))
                .catch(() => toast.error('Cancel failed'));
            }}
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
