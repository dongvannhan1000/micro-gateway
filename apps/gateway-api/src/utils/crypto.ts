/**
 * Web Crypto utilities for Cloudflare Workers
 */

export async function hashApiKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateApiKey(): string {
    const prefix = 'sk-gw-';
    const randomChars = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return `${prefix}${randomChars}`;
}

export async function encryptProviderKey(key: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedSecret = encoder.encode(secret.padEnd(32).slice(0, 32));

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encodedSecret,
        'AES-GCM',
        false,
        ['encrypt']
    );

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encoder.encode(key)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
}

export async function decryptProviderKey(encryptedBase64: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const combined = new Uint8Array(
        atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const encodedSecret = encoder.encode(secret.padEnd(32).slice(0, 32));

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encodedSecret,
        'AES-GCM',
        false,
        ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data
    );

    return new TextDecoder().decode(decrypted);
}
