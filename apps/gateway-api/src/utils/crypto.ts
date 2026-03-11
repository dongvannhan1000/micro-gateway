/**
 * Web Crypto utilities for Cloudflare Workers
 */

export async function hashGatewayKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateGatewayKey(): string {
    const prefix = 'sk-gw-';
    const randomChars = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return `${prefix}${randomChars}`;
}

const HKDF_SALT = new TextEncoder().encode('ms-gateway-key-derivation-v1');

async function deriveKey(secret: string, purpose: 'encrypt' | 'decrypt'): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        'HKDF',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: HKDF_SALT,
            info: encoder.encode('provider-key-encryption'),
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        [purpose]
    );
}

export async function encryptProviderKey(key: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await deriveKey(secret, 'encrypt');

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encoder.encode(key)
    );

    // New format: [LEGACY_MARKER(1)][IV(12)][CIPHERTEXT]
    // Legacy marker '1' for HKDF, if missing then it's old padding format
    const combined = new Uint8Array(1 + iv.length + encrypted.byteLength);
    combined[0] = 0x01; // Version 1 (HKDF)
    combined.set(iv, 1);
    combined.set(new Uint8Array(encrypted), 1 + iv.length);

    return btoa(String.fromCharCode(...combined));
}

export async function decryptProviderKey(encryptedBase64: string, secret: string): Promise<string> {
    const combined = new Uint8Array(
        atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
    );

    // Version check
    if (combined[0] === 0x01) {
        // New HKDF format
        const iv = combined.slice(1, 13);
        const data = combined.slice(13);
        const cryptoKey = await deriveKey(secret, 'decrypt');

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            data
        );
        return new TextDecoder().decode(decrypted);
    } else {
        // Legacy padding format fallback
        const encoder = new TextEncoder();
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
}
