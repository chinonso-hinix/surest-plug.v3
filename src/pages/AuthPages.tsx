/**
 * Surest Plug - Authentication Pages (Login, Register & Password Reset)
 * Powered exclusively by real Firebase Authentication (Email/Password & Google Sign-In)
 */

import React, { useState, useEffect } from 'react';
import { sendFirebasePasswordReset } from '../lib/firebase';
import { store } from '../lib/store';

interface AuthPageProps {
  mode: 'login' | 'register';
  onLogin: (email: string, pass: string) => Promise<boolean | string>;
  onRegister: (name: string, email: string, pass: string, phone?: string, referralCode?: string) => Promise<boolean | string>;
  onGoogleAuth: () => void;
  onNavigate: (route: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  onLogin,
  onRegister,
  onGoogleAuth,
  onNavigate
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralFeedback, setReferralFeedback] = useState<{ valid: boolean; message: string } | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Auto-detect referral code from URL
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref') || urlParams.get('referral');
      if (refParam) {
        const cleanRef = refParam.trim().toUpperCase();
        setReferralCode(cleanRef);
      }
    } catch {
      // ignore
    }
  }, []);

  // Live validate referral code
  useEffect(() => {
    if (!referralCode.trim()) {
      setReferralFeedback(null);
      return;
    }
    const val = store.validateReferralCode(referralCode.trim());
    if (val.valid && val.referrer) {
      setReferralFeedback({
        valid: true,
        message: `Valid code from ${val.referrer.full_name} (${val.referrer.role === 'admin' ? 'Official Partner' : 'Verified Member'})`
      });
    } else {
      setReferralFeedback({
        valid: false,
        message: val.error || 'Invalid or unverified referral code'
      });
    }
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (isResetMode) {
        if (!email.trim()) {
          setError('Please enter your account email address.');
          setIsSubmitting(false);
          return;
        }
        const res = await sendFirebasePasswordReset(email.trim());
        if (res.success) {
          setSuccessMessage(res.message || 'Password reset link sent to your email.');
        } else {
          setError(res.error || 'Failed to send reset email.');
        }
        setIsSubmitting(false);
        return;
      }

      if (mode === 'login') {
        const result = await onLogin(email.trim(), password);
        if (typeof result === 'string') {
          setError(result);
        } else if (!result) {
          setError('Invalid email or password. Please verify your credentials.');
        }
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }
        const result = await onRegister(
          fullName.trim(), 
          email.trim(), 
          password, 
          phone.trim(), 
          referralCode.trim().toUpperCase() || undefined
        );
        if (typeof result === 'string') {
          setError(result);
        } else if (!result) {
          setError('Registration failed. Please check your information and try again.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img 
              src="https://www.image2url.com/r2/default/images/1787828243533-7b9f3864-3fef-41b2-84e9-a00088ba5494.jpg" 
              alt="Surest Plug" 
              className="h-16 w-16 rounded-full object-cover shadow-md ring-2 ring-blue-500/20 drop-shadow-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/sp-logo.png';
              }}
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isResetMode 
              ? 'Reset Your Password' 
              : mode === 'login' 
                ? 'Sign in to Surest Plug' 
                : 'Create your account'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {isResetMode 
              ? 'Enter your registered email to receive password recovery instructions'
              : mode === 'login' 
                ? 'Access your orders, wallet balance, and digital services' 
                : 'Join Surest Plug to purchase ready websites and growth services'}
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Success Notice */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && !isResetMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input 
                type="text" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Adebayo Ogunleye"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {mode === 'register' && !isResetMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234..."
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          )}

          {mode === 'register' && !isResetMode && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Referred By (Optional)</label>
                <span className="text-[11px] text-slate-400 font-medium">Have a code?</span>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SP-7K4M92"
                  maxLength={12}
                  className={`w-full px-4 py-2.5 text-sm font-mono uppercase bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-colors ${
                    referralFeedback 
                      ? referralFeedback.valid 
                        ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30' 
                        : 'border-amber-400 focus:ring-2 focus:ring-amber-500'
                      : 'border-slate-200 focus:ring-2 focus:ring-blue-600'
                  }`}
                />
                {referralFeedback && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {referralFeedback.valid ? (
                      <span className="text-emerald-600 font-bold text-xs">✓ Valid</span>
                    ) : (
                      <span className="text-amber-600 text-xs">⚠</span>
                    )}
                  </div>
                )}
              </div>
              {referralFeedback && (
                <p className={`mt-1 text-[11px] font-medium ${referralFeedback.valid ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {referralFeedback.message}
                </p>
              )}
            </div>
          )}

          {!isResetMode && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password *</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            {isSubmitting 
              ? 'Processing...' 
              : isResetMode 
                ? 'Send Reset Link' 
                : mode === 'login' 
                  ? 'Sign In' 
                  : 'Create Free Account'}
          </button>

          {isResetMode && (
            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setError('');
                setSuccessMessage('');
              }}
              className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          )}
        </form>

        {/* Real Firebase Google Sign-In Button */}
        {!isResetMode && (
          <div className="space-y-3">
            <div className="relative flex items-center justify-center w-full flex-nowrap my-1">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="bg-white px-3 text-[11px] text-slate-400 uppercase font-semibold whitespace-nowrap shrink-0 tracking-wider">
                Or continue with
              </span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={onGoogleAuth}
              className="w-full py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 cursor-pointer whitespace-nowrap"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="whitespace-nowrap">Continue with Google</span>
            </button>
          </div>
        )}

        {/* Footer Switch */}
        <div className="text-center pt-2">
          {mode === 'login' ? (
            <p className="text-xs text-slate-500">
              Don't have an account?{' '}
              <button 
                onClick={() => {
                  setIsResetMode(false);
                  onNavigate('register');
                }}
                className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <button 
                onClick={() => {
                  setIsResetMode(false);
                  onNavigate('login');
                }}
                className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
