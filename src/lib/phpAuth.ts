import { User } from '../types';

type AuthResult = {
  success: boolean;
  user?: User;
  error?: string;
};

async function request(path: string, options: RequestInit = {}): Promise<AuthResult> {
  try {
    const response = await fetch(path, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Authentication request failed. Please try again.'
      };
    }

    return data;
  } catch {
    return {
      success: false,
      error: 'Unable to connect to Surest Plug. Please try again.'
    };
  }
}

export function loginWithPHP(email: string, password: string) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export function registerWithPHP(
  fullName: string,
  email: string,
  password: string,
  phone?: string,
  referralCode?: string
) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: fullName,
      email,
      password,
      confirm_password: password,
      phone: phone || '',
      referral_code: referralCode || ''
    })
  });
}

export function getPHPCurrentUser() {
  return request('/api/auth/me', {
    method: 'GET'
  });
}

export function logoutPHP() {
  return request('/api/auth/logout', {
    method: 'POST'
  });
}
