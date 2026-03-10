import { Context } from 'hono';

export function openAiError(c: Context, message: string, type: string = 'invalid_request_error', code: string | null = null, status: number = 400) {
    return c.json({
        error: {
            message,
            type,
            param: null,
            code
        }
    }, status as any);
}
