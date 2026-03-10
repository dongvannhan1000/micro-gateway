'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { fetchGateway } from '@/utils/api';

export async function createProject(formData: FormData) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    try {
        await fetchGateway('/api/projects', session.access_token, {
            method: 'POST',
            body: JSON.stringify({ name, description }),
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function createGatewayKey(projectId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const name = formData.get('name') as string;
    const limit = parseFloat(formData.get('monthly_limit_usd') as string || '0');

    try {
        const result = await fetchGateway(`/api/projects/${projectId}/gateway-keys`, session.access_token, {
            method: 'POST',
            body: JSON.stringify({ name, monthly_limit_usd: limit }),
        });
        revalidatePath(`/dashboard/projects/${projectId}`);
        return { success: true, key: result.key }; // Raw key only shown once
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function revokeGatewayKey(projectId: string, keyId: string) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    try {
        await fetchGateway(`/api/projects/${projectId}/gateway-keys/${keyId}`, session.access_token, {
            method: 'DELETE',
        });
        revalidatePath(`/dashboard/projects/${projectId}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
export async function updateProjectSettings(projectId: string, settings: any) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    try {
        await fetchGateway(`/api/projects/${projectId}`, session.access_token, {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
        revalidatePath(`/dashboard/projects/${projectId}`);
        revalidatePath(`/dashboard/projects/${projectId}/settings`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function saveProviderConfig(projectId: string, provider: string, apiKey: string) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    try {
        await fetchGateway(`/api/projects/${projectId}/provider-configs`, session.access_token, {
            method: 'POST',
            body: JSON.stringify({ provider, api_key: apiKey }),
        });
        revalidatePath(`/dashboard/projects/${projectId}/settings`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
