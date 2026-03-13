/**
 * Fetch utility for API calls to Gateway
 */

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || '';

export async function fetchGateway(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${GATEWAY_URL}${path}`;

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Join waitlist for managed version
 */
export async function joinWaitlist(data: {
  name: string;
  email: string;
  useCase?: string;
}): Promise<{ success: boolean; message: string; alreadyOnList?: boolean }> {
  try {
    const response = await fetchGateway('/api/waitlist', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to join waitlist:', error);
    throw new Error('Failed to join waitlist. Please try again.');
  }
}
