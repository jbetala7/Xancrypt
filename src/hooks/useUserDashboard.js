// src/hooks/useUserDashboard.js
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api';

export default function useUserDashboard() {
    const MAX_FILES = 5;

    const [user, setUser] = useState(null);
    const [plan, setPlan] = useState(null);
    const [remaining, setRemaining] = useState(null);
    const [nextReset, setNextReset] = useState(null);
    const [loading, setLoading] = useState(false);

    const [editing, setEditing] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: ''
    });

    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const used = remaining != null ? MAX_FILES - remaining : 0;

    useEffect(() => {
        loadEverything();
    }, []);

    const loadEverything = async () => {
        try {
            const me = await api.get('/users/me');
            const plan = await api.get('/subscription');
            const usage = await api.get('/encrypt/remaining');

            setUser(me.data);
            setPlan(plan.data);
            setRemaining(usage.data.remaining);
            setNextReset(usage.data.nextReset);
            setForm({
                firstName: me.data.firstName || '',
                lastName: me.data.lastName || '',
                email: me.data.email
            });
        } catch {
            toast.error('Failed to load dashboard data');
        }
    };

    const saveProfile = async () => {
        try {
            setLoading(true);
            const { firstName, lastName, email } = form;
            await api.patch('/users/me', { firstName, lastName });

            if (email !== user.email) {
                try {
                    await api.post('/users/me/email', { email });
                    toast.success('Verification email sent to new address');
                } catch (err) {
                    if (err.response?.status === 409) {
                        toast.error('Email already in use! Save failed!');
                    } else {
                        toast.error('Save failed');
                    }
                    return;
                }
            } else {
                toast.success('Profile updated');
            }

            setEditing(false);
            await loadEverything();
        } catch {
            toast.error('Save failed');
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async () => {
        const { oldPassword, newPassword, confirmPassword } = passwordForm;

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (newPassword === oldPassword) {
            toast.error('New password must be different from old password');
            return;
        }

        try {
            await api.patch('/users/me/password', { oldPassword, newPassword });
            toast.success('Password changed successfully');
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordForm(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Password change failed');
        }
    };


    const cancelSubscription = async () => {
        try {
            await api.post('/subscription/cancel');
            toast.success('Subscription cancelled');
            await loadEverything();
        } catch {
            toast.error('Cancel failed');
        }
    };


    return {
        user, plan, remaining, nextReset,
        loading, editing, showPasswordForm,
        form, setForm, passwordForm, setPasswordForm,
        used, setEditing, setShowPasswordForm,
        saveProfile, changePassword, cancelSubscription
    };
}
