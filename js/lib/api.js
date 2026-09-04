export class ApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetchJSON(url, headers = {}, options = {}) {
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(`HTTP ${response.status}: ${text}`, response.status);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('json')) {
    throw new ApiError('Expected JSON but received a sign-in page or another response.', response.status);
  }

  return response.json();
}
