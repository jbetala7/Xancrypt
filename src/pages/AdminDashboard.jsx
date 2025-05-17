// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../api';

export default function AdminDashboard() {
  const [summary, setSummary] = useState({});
  const [currentTab, setCurrentTab] = useState('all');
  const [users, setUsers] = useState([]);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);

  // Load summary
  useEffect(() => {
    api.get('/admin/summary')
      .then(res => setSummary(res.data))
      .catch(() => toast.error('Failed to load summary'));
  }, []);

  // Load users for current tab
  useEffect(() => {
    const plan = currentTab === 'free'
      ? 'free'
      : currentTab === 'paid'
        ? 'paid'
        : undefined;

    api.get('/admin/users', { params: { plan } })
      .then(res => setUsers(res.data))
      .catch(() => toast.error('Failed to load users'));
  }, [currentTab]);

  // Load revenue data
  useEffect(() => {
    api.get('/admin/revenue/trends').then(res => setRevenueTrends(res.data));
    api.get('/admin/revenue/recent').then(res => setRecentPayments(res.data));
  }, []);

  const updateUserField = async (id, field, value) => {
    try {
      await api.patch(`/admin/users/${id}`, { [field]: value });
      setUsers(users.map(u => u._id === id ? { ...u, [field]: value } : u));
      toast.success('User updated');
    } catch {
      toast.error('Update failed');
    }
  };

  const deleteUser = async id => {
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(users.filter(u => u._id !== id));
      toast.success('User deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const resetUserUsage = async id => {
    try {
      await api.post(`/admin/users/${id}/reset-usage`);
      toast.success('Usage reset');
    } catch {
      toast.error('Reset failed');
    }
  };

  const renderUsersTable = () => (
    <table className="w-full table-auto border-collapse text-gray-900 dark:text-gray-100">
      <thead>
        <tr className="bg-gray-200 dark:bg-gray-700">
          <th className="p-2">Email</th>
          <th className="p-2">Active</th>
          <th className="p-2">Role</th>
          <th className="p-2">Files</th>
          <th className="p-2">Plan</th>
          <th className="p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map(u => (
          <tr key={u._id} className="border-t border-gray-300 dark:border-gray-600">
            <td className="p-2">{u.email}</td>
            <td className="p-2 text-center">
              <input
                type="checkbox"
                checked={u.active}
                onChange={e => updateUserField(u._id, 'active', e.target.checked)}
              />
            </td>
            <td className="p-2 text-center">
              <select
                value={u.role}
                onChange={e => updateUserField(u._id, 'role', e.target.value)}
                className="border px-1 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </td>
            <td className="p-2 text-center">{u.filesEncrypted}</td>
            <td className="p-2 text-center">{u.subscription.plan}</td>
            <td className="p-2 text-center space-x-2">
              <button
                onClick={() => {
                  if (!u._id) {
                    console.error('❌ No _id found for user:', u);
                    toast.error('Cannot delete user: ID missing');
                    return;
                  }
                  deleteUser(u._id);
                }}

                className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => resetUserUsage(u._id)}
                className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                Reset
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="p-4 space-y-6 text-gray-900 dark:text-gray-100">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {/** Card helper props: title, value */}
        {[
          ['Total Users', summary.totalUsers],
          ['Free Users', summary.freeUsers],
          ['Paid Users', summary.paidUsers],
          ['Pending Verif.', summary.pendingVerifications],
          ['Total Revenue', `$${summary.totalRevenue}`]
        ].map(([label, val], i) => (
          <div key={i} className="bg-white dark:bg-gray-800 shadow p-4 rounded">
            <p className="text-sm">{label}</p>
            <h2 className="text-xl font-bold">{val ?? '–'}</h2>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex space-x-4">
          {['all', 'free', 'paid', 'revenue'].map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`px-4 py-2 rounded ${currentTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {['all', 'free', 'paid'].includes(currentTab) && (
          users.length
            ? renderUsersTable()
            : <p className="p-4 text-center text-red-600 dark:text-red-400">No users to display</p>
        )}

        {currentTab === 'revenue' && (
          <div className="space-y-6">
            <div className="h-64 bg-white dark:bg-gray-800 shadow p-4 rounded">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrends} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-auto">
              <table className="w-full table-auto border-collapse text-gray-900 dark:text-gray-100">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="p-2">Invoice ID</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Amount</th>
                    <th className="p-2">Customer</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map(inv => (
                    <tr key={inv.id} className="border-t border-gray-300 dark:border-gray-600">
                      <td className="p-2">{inv.id}</td>
                      <td className="p-2">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="p-2">${inv.amount}</td>
                      <td className="p-2">{inv.customer_email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
