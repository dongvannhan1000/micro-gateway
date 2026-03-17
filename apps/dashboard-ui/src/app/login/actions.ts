'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function login(formData: FormData) {
    const supabase = await createClient();

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/', 'layout');
    redirect('/dashboard');
}

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    const { data: authData, error } = await supabase.auth.signUp(data);

    if (error) {
        return { error: error.message };
    }

    // Auto-create user profile in gateway database
    if (authData.user && authData.session) {
        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';
            const response = await fetch(`${gatewayUrl}/api/user/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.session.access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            // This will auto-create the profile if it doesn't exist
            if (!response.ok) {
                console.error('Failed to create user profile:', await response.text());
            } else {
                console.log('User profile created successfully');
            }
        } catch (err) {
            console.error('Error creating user profile:', err);
            // Don't fail signup if profile creation fails
        }
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    redirect('/login');
}
