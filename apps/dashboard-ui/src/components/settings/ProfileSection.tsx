'use client';

import React, { useState } from 'react';
import { User, Camera, Mail, Building, MapPin, Save } from 'lucide-react';
import { SettingsSection, TextInput, TextArea, Select, Button } from './index';

interface ProfileData {
    displayName: string;
    email: string;
    company: string;
    location: string;
    bio: string;
    timezone: string;
    language: string;
}

interface PasswordData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export function ProfileSection() {
    const [profile, setProfile] = useState<ProfileData>({
        displayName: '',
        email: '',
        company: '',
        location: '',
        bio: '',
        timezone: 'UTC',
        language: 'en'
    });

    const [password, setPassword] = useState<PasswordData>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const timezones = [
        { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
        { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
        { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
        { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
        { value: 'Europe/London', label: 'London (GMT)' },
        { value: 'Europe/Paris', label: 'Central European Time' },
        { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
        { value: 'Asia/Shanghai', label: 'China Standard Time' },
        { value: 'Australia/Sydney', label: 'Australian Eastern Time' }
    ];

    const languages = [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'zh', label: 'Chinese' },
        { value: 'ja', label: 'Japanese' }
    ];

    const handleProfileSave = async () => {
        setIsLoading(true);
        setErrors({});
        setSuccessMessage('');

        // Validate
        const newErrors: Record<string, string> = {};
        if (!profile.displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        }
        if (!profile.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
            newErrors.email = 'Invalid email format';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsLoading(false);
            return;
        }

        try {
            // API call to save profile
            // await fetch('/api/management/user/profile', {
            //     method: 'PUT',
            //     body: JSON.stringify(profile)
            // });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setSuccessMessage('Profile updated successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
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
            // API call to change password
            // await fetch('/api/management/user/password', {
            //     method: 'PUT',
            //     body: JSON.stringify({
            //         currentPassword: password.currentPassword,
            //         newPassword: password.newPassword
            //     })
            // });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setSuccessMessage('Password changed successfully');
            setPassword({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
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

            <SettingsSection
                title="Profile Information"
                description="Update your personal information and preferences"
                icon={<User className="w-5 h-5 text-accent-blue" />}
            >
                <div className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center text-2xl font-bold">
                                {profile.displayName.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <button className="absolute -bottom-1 -right-1 p-2 bg-accent-blue rounded-full hover:bg-accent-blue/80 transition-colors">
                                <Camera className="w-3 h-3 text-white" />
                            </button>
                        </div>
                        <div>
                            <h4 className="font-bold">Profile Photo</h4>
                            <p className="text-sm text-muted">JPG, PNG or GIF. Max size 2MB</p>
                        </div>
                    </div>

                    {/* Profile Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            onChange={(value) => setProfile({ ...profile, email: value })}
                            placeholder="your.email@example.com"
                            error={errors.email}
                            icon={<Mail className="w-4 h-4" />}
                            required
                        />

                        <TextInput
                            label="Company"
                            value={profile.company}
                            onChange={(value) => setProfile({ ...profile, company: value })}
                            placeholder="Your company name"
                            icon={<Building className="w-4 h-4" />}
                        />

                        <TextInput
                            label="Location"
                            value={profile.location}
                            onChange={(value) => setProfile({ ...profile, location: value })}
                            placeholder="City, Country"
                            icon={<MapPin className="w-4 h-4" />}
                        />

                        <Select
                            label="Timezone"
                            value={profile.timezone}
                            onChange={(value) => setProfile({ ...profile, timezone: value })}
                            options={timezones}
                        />

                        <Select
                            label="Language"
                            value={profile.language}
                            onChange={(value) => setProfile({ ...profile, language: value })}
                            options={languages}
                        />
                    </div>

                    <TextArea
                        label="Bio"
                        value={profile.bio}
                        onChange={(value) => setProfile({ ...profile, bio: value })}
                        placeholder="Tell us a little about yourself"
                        maxLength={500}
                        rows={3}
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
