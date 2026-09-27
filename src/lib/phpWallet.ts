type ApproveDepositResult = {
  success: boolean;
  message?: string;
  error?: string;
  deposit?: unknown;
  user?: unknown;
  transaction?: unknown;
};

async function request(path: string, options: RequestInit = {}) {
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
        error: data.error || 'Wallet operation failed. Please try again.'
      } satisfies ApproveDepositResult;
    }

    return data as ApproveDepositResult;
  } catch {
    return {
      success: false,
      error: 'Unable to connect to Surest Plug. Please try again.'
    } satisfies ApproveDepositResult;
  }
}

export function approveDepositOnServer(depositId: number, note?: string) {
  return request('/api/admin-wallet.php', {
    method: 'POST',
    body: JSON.stringify({
      action: 'approve_deposit',
      deposit_id: depositId,
      note: note || ''
    })
  });
}

export function adjustUserBalanceOnServer(
  userId: number,
  amount: number,
  type: 'credit' | 'debit',
  reason: string
) {
  return request('/api/admin-balance.php', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      amount,
      type,
      reason
    })
  });
}
