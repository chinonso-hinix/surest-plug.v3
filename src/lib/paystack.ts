/**
 * Surest Plug - Frontend Paystack Integration Service (Inline JS V2 & V1 Universal Bridge)
 * 
 * SECURITY & ARCHITECTURE:
 * - Uses Paystack Test Mode Public Key: pk_test_... (or VITE_PAYSTACK_PUBLIC_KEY)
 * - Paystack Secret Key (sk_test_... / sk_live_...) is strictly isolated on the backend.
 * - Wallet credit is only finalized after server-side verification with Paystack.
 * - Enforces idempotency to prevent duplicate crediting.
 * - NEVER crashes or blocks React rendering.
 */

// Safely access environment variable with fallback
export const PAYSTACK_PUBLIC_KEY = 
  (typeof (import.meta as any) !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY) 
    ? String((import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY)
    : 'pk_test_c6a989fa162d6563a2e53015cd6cf15570f68d8f';

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

/**
 * Dynamically load official Paystack Inline JS script
 */
export function loadPaystackV2Script(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(false);
    }

    if (window.PaystackPop) {
      return resolve(true);
    }

    const existingScript = document.querySelector('script[src="https://js.paystack.co/v2/inline.js"]') ||
                           document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    try {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v2/inline.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.warn('Failed to load Paystack Inline JS V2 from CDN, attempting V1 fallback...');
        const v1Script = document.createElement('script');
        v1Script.src = 'https://js.paystack.co/v1/inline.js';
        v1Script.async = true;
        v1Script.onload = () => resolve(true);
        v1Script.onerror = () => {
          console.warn('Failed to load Paystack Inline JS fallback from CDN');
          resolve(false);
        };
        document.head.appendChild(v1Script);
      };
      document.head.appendChild(script);
    } catch (e) {
      console.warn('Error appending script to document head:', e);
      resolve(false);
    }
  });
}

/**
 * Initialize a PaystackPop instance or helper
 */
async function createPaystackPopInstance(): Promise<any> {
  if (typeof window !== 'undefined' && window.PaystackPop) {
    try {
      if (typeof window.PaystackPop === 'function') {
        return new window.PaystackPop();
      }
      return window.PaystackPop;
    } catch (e) {
      console.warn('Could not instantiate window.PaystackPop directly:', e);
      return window.PaystackPop;
    }
  }

  const loaded = await loadPaystackV2Script();
  if (loaded && typeof window !== 'undefined' && window.PaystackPop) {
    try {
      if (typeof window.PaystackPop === 'function') {
        return new window.PaystackPop();
      }
      return window.PaystackPop;
    } catch (e) {
      console.warn('Error instantiating loaded window.PaystackPop:', e);
      return window.PaystackPop;
    }
  }

  try {
    const pkg = await import('@paystack/inline-js');
    const PaystackClass = pkg.default || pkg;
    if (typeof PaystackClass === 'function') {
      return new PaystackClass();
    }
    return PaystackClass;
  } catch (err) {
    console.error('Failed to instantiate PaystackPop from package:', err);
    return null;
  }
}

export interface PaystackPaymentOptions {
  amount: number; // in Naira
  email: string;
  fullName?: string;
  userId?: string | number;
  onInitiating?: () => void;
  onOpened?: () => void;
  onVerifying?: () => void;
  onSuccess: (result: {
    reference: string;
    amount: number;
    message: string;
  }) => void;
  onCancel?: (message?: string) => void;
  onError: (errorMessage: string) => void;
}

/**
 * Initialize and open Paystack checkout flow
 * Safely handles both InlineJS V2 and V1 formats and guarantees callback is always a function
 */
export async function openPaystackPayment(options: PaystackPaymentOptions): Promise<void> {
  const {
    amount,
    email,
    fullName,
    userId,
    onInitiating,
    onOpened,
    onVerifying,
    onSuccess,
    onCancel,
    onError
  } = options;

  // 1. Amount validation
  if (!amount || isNaN(amount) || amount <= 0) {
    return onError('Minimum funding amount is ₦1,000.');
  }

  if (amount < 1000) {
    return onError('Minimum funding amount is ₦1,000.');
  }

  if (!email || !email.includes('@')) {
    return onError('A valid user email address is required.');
  }

  if (onInitiating) {
    try {
      onInitiating();
    } catch (e) {
      console.warn('onInitiating callback warning:', e);
    }
  }

  try {
    // 2. Call backend to initialize transaction reference & parameters
    const initResponse = await fetch('/api/paystack/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        email: email.trim().toLowerCase(),
        name: fullName,
        userId
      })
    });

    if (!initResponse.ok) {
      const errText = await initResponse.text();
      let parsedErr = 'Payment initialization failed.';
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.error || parsedErr;
      } catch {}
      return onError(parsedErr);
    }

    const initData = await initResponse.json();

    if (!initData.success || !initData.data) {
      return onError(initData.error || 'Payment could not be started. Please try again.');
    }

    const { reference, amountInKobo, publicKey, accessCode } = initData.data;

    // 3. Get PaystackPop instance
    const popup = await createPaystackPopInstance();

    if (!popup) {
      return onError('Paystack payment library could not be loaded. Please check your internet connection and try again.');
    }

    let isVerifyingPayment = false;

    // Shared success handler (works for both V1 and V2)
    const handleSuccessCallback = async (transaction: any) => {
      if (isVerifyingPayment) return;
      isVerifyingPayment = true;
      
      if (onVerifying) {
        try {
          onVerifying();
        } catch (e) {
          console.warn('onVerifying callback warning:', e);
        }
      }

      try {
        const verifiedRef = (transaction && (transaction.reference || transaction.ref || transaction.trxref)) || reference;

        // 4. Backend Server Verification: Verify with Paystack API before approving wallet credit
        const verifyResponse = await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: verifiedRef,
            amount,
            userId,
            email: email.trim().toLowerCase()
          })
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.success && verifyData.verified) {
          const finalAmount = verifyData.amount || amount;
          onSuccess({
            reference: verifyData.reference || verifiedRef,
            amount: finalAmount,
            message: `Payment successful! ₦${finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been added to your wallet.`
          });
        } else {
          onError(verifyData.error || 'Payment was not successful. No money was added to your wallet.');
        }
      } catch (vErr: any) {
        console.error('Paystack verification network error:', vErr);
        onError('Payment was not successful or could not be verified. No money was added to your wallet.');
      }
    };

    // Shared close / cancel handler
    const handleCloseCallback = () => {
      if (!isVerifyingPayment) {
        if (onCancel) {
          try {
            onCancel('Payment was cancelled.');
          } catch (e) {
            console.warn('onCancel callback warning:', e);
          }
        }
      }
    };

    // Shared error handler
    const handleErrorCallback = (err: any) => {
      if (!isVerifyingPayment) {
        onError(err?.message || 'Payment encountered an error. Please try again.');
      }
    };

    // 5. Build Paystack Transaction Options
    // CRITICAL: We provide BOTH `callback` (V1 requirement) and `onSuccess` (V2 requirement),
    // and BOTH `onClose` (V1 requirement) and `onCancel` (V2 requirement) as valid functions.
    const transactionConfig: Record<string, any> = {
      key: publicKey || PAYSTACK_PUBLIC_KEY,
      email: email.trim().toLowerCase(),
      amount: amountInKobo,
      ref: reference,
      reference: reference,
      currency: 'NGN',
      metadata: {
        userId: userId || 'user',
        email: email.trim().toLowerCase(),
        fullName: fullName || '',
        purpose: 'wallet_funding',
        site: 'Surest Plug',
        custom_fields: [
          {
            display_name: 'Customer Name',
            variable_name: 'customer_name',
            value: fullName || 'Valued User'
          },
          {
            display_name: 'User ID',
            variable_name: 'user_id',
            value: String(userId || '')
          }
        ]
      },
      callback: handleSuccessCallback,
      onSuccess: handleSuccessCallback,
      onClose: handleCloseCallback,
      onCancel: handleCloseCallback,
      onError: handleErrorCallback,
      onLoad: () => {
        if (onOpened) {
          try {
            onOpened();
          } catch (e) {
            console.warn('onOpened callback warning:', e);
          }
        }
      }
    };

    if (accessCode) {
      transactionConfig.access_code = accessCode;
    }

    if (onOpened) {
      try {
        onOpened();
      } catch (e) {
        console.warn('onOpened callback warning:', e);
      }
    }

    // 6. Launch checkout using the server-initialized transaction.
    // When an accessCode is available, resume that transaction instead of
    // attempting a second client-side transaction initialization.
    if (accessCode && typeof popup.resumeTransaction === 'function') {
      popup.resumeTransaction(accessCode, transactionConfig);
    } else if (typeof popup.newTransaction === 'function') {
      popup.newTransaction(transactionConfig);
    } else if (typeof popup.checkout === 'function') {
      popup.checkout(transactionConfig);
    } else if (typeof popup.setup === 'function') {
      const handler = popup.setup(transactionConfig);
      if (handler && typeof handler.openIframe === 'function') {
        handler.openIframe();
      }
    } else if (
      typeof window !== 'undefined' &&
      window.PaystackPop &&
      typeof window.PaystackPop.setup === 'function'
    ) {
      const handler = window.PaystackPop.setup(transactionConfig);
      if (handler && typeof handler.openIframe === 'function') {
        handler.openIframe();
      }
    } else {
      onError('Unable to open Paystack payment modal. Please try again.');
    }
  } catch (err: any) {
    console.error('Paystack checkout initialization error:', err);
    onError(err.message || 'Payment could not be started. Please try again.');
  }
}

