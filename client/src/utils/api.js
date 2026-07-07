export const API_BASE_URL = '/api';

export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('fabric_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove Content-Type if body is FormData (browser will set it with boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('fabric_token');
    localStorage.removeItem('fabric_user');
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw {
      status: response.status,
      data,
      message: data.error || data.message || 'An error occurred',
    };
  }

  return data;
}

export async function login(name, pin) {
  const data = await fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name, pin }),
  });
  
  localStorage.setItem('fabric_token', data.token);
  localStorage.setItem('fabric_user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('fabric_token');
  localStorage.removeItem('fabric_user');
  window.dispatchEvent(new Event('auth:logout'));
}
