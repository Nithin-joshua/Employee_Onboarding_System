export async function getApiToken(session) {
  return session?.accessToken || null;
}

export async function request(path, options = {}, session = null) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API call failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
}
