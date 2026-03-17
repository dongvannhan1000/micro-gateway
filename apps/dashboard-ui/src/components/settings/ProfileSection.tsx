'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Save } from 'lucide-react';
import { SettingsSection, TextInput, Button } from './index';
import { getUserProfile, updateUserProfile, changePassword } from '@/lib/user-api';
import { createClient } from '@/utils/supabase/client';

interface ProfileData {
    displayName: string;
    email: string;
}

interface PasswordData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export function ProfileSection() {
    const [profile, setProfile] = useState<ProfileData>({
        displayName: '',
        email: ''
    });
    const [password, setPassword] = useState<PasswordData>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const supabase = createClient();

    // Fetch profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    setErrors({ form: 'Not authenticated' });
                    return;
                }

                const data = await getUserProfile(session.access_token);
                setProfile({
                    displayName: data.full_name || '',
                    email: data.email || ''
                });
            } catch (error) {
                console.error('Failed to fetch profile:', error);
                setErrors({ form: 'Failed to load profile' });
            } finally {
                setIsInitialLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleProfileSave = async () => {
        setIsLoading(true);
        setErrors({});
        setSuccessMessage('');

        // Validate
        const newErrors: Record<string, string> = {};
        if (!profile.displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsLoading(false);
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setErrors({ form: 'Not authenticated' });
                return;
            }

            await updateUserProfile(session.access_token, {
                full_name: profile.displayName
            });

            setSuccessMessage('Profile updated successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Failed to update profile:', error);
            setErrors({ form: 'Failed to update profile' });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSave = async () => {
        setIsLoading(true);
        setErrors({});
        setSuccessMessage('');

        // Validate
        const newErrors: Record<string, string> = {};
        if (!password.currentPassword) {
            newErrors.currentPassword = 'Current password is required';
        }
        if (!password.newPassword) {
            newErrors.newPassword = 'New password is required';
        } else if (password.newPassword.length < 8) {
            newErrors.newPassword = 'Password must be at least 8 characters';
        }
        if (password.newPassword !== password.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsLoading(false);
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setErrors({ form: 'Not authenticated' });
                return;
            }

            await changePassword(session.access_token, password.currentPassword, password.newPassword);

            setSuccessMessage('Password changed successfully');
            setPassword({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Failed to change password:', error);
            setErrors({ form: 'Failed to change password' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {successMessage && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-500 px-4 py-3 rounded-xl text-sm font-medium">
                    {successMessage}
                </div>
            )}

            {errors.form && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-xl text-sm font-medium">
                    {errors.form}
                </div>
            )}

            {isInitialLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-muted">Loading profile...</div>
                </div>
            ) : (
                <SettingsSection
                    title="Profile Information"
                    description="Update your personal information"
                    icon={<User className="w-5 h-5 text-accent-blue" />}
                >
                    <div className="space-y-6 max-w-md">
                        <TextInput
                            label="Display Name"
                            value={profile.displayName}
                            onChange={(value) => setProfile({ ...profile, displayName: value })}
                            placeholder="Enter your display name"
                            error={errors.displayName}
                            required
                        />

                        <TextInput
                            label="Email"
                            type="email"
                            value={profile.email}
                            onChange={() => {}}
                            disabled
                            placeholder="your.email@example.com"
                            icon={<Mail className="w-4 h-4" />}
                            helperText="Managed by Supabase authentication"
                        />

                        <div className="flex justify-end pt-4 border-t border-glass-border">
                            <Button
                                isLoading={isLoading}
                                icon={<Save className="w-4 h-4" />}
                                onClick={handleProfileSave}
                            >
                                Save Profile
                            </Button>
                        </div>
                    </div>
                </SettingsSection>
            )}

            <SettingsSection
                title="Change Password"
                description="Update your password to keep your account secure"
                icon={<User className="w-5 h-5 text-accent-violet" />}
            >
                <div className="space-y-4 max-w-md">
                    <TextInput
                        label="Current Password"
                        type="password"
                        value={password.currentPassword}
                        onChange={(value) => setPassword({ ...password, currentPassword: value })}
                        placeholder="Enter your current password"
                        error={errors.currentPassword}
                        required
                    />

                    <TextInput
                        label="New Password"
                        type="password"
                        value={password.newPassword}
                        onChange={(value) => setPassword({ ...password, newPassword: value })}
                        placeholder="Enter your new password"
                        error={errors.newPassword}
                        helperText="Must be at least 8 characters"
                        required
                    />

                    <TextInput
                        label="Confirm New Password"
                        type="password"
                        value={password.confirmPassword}
                        onChange={(value) => setPassword({ ...password, confirmPassword: value })}
                        placeholder="Confirm your new password"
                        error={errors.confirmPassword}
                        required
                    />

                    <div className="flex justify-end pt-4 border-t border-glass-border">
                        <Button
                            isLoading={isLoading}
                            icon={<Save className="w-4 h-4" />}
                            onClick={handlePasswordSave}
                        >
                            Change Password
                        </Button>
                    </div>
                </div>
            </SettingsSection>
        </div>
    );
}
