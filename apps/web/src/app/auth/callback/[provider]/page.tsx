'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function OAuthCallbackPage({ params }: { params: { provider: string } }) {
  const router = useRouter();
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const provider = params.provider; // 'google', 'apple', 'facebook'

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);
    
    // Immediately clear the hash from the browser URL to prevent token leakage
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Google/Apple typically use id_token, Facebook uses access_token
    const token = hashParams.get('id_token') || hashParams.get('access_token') || hashParams.get('token');
    const state = hashParams.get('state') || searchParams.get('state');
    
    // Check for query string errors (e.g. user cancelled)
    const queryError = searchParams.get('error') || hashParams.get('error');

    if (queryError) {
      setError(`Authentication failed: ${queryError}`);
      return;
    }

    if (!token) {
      setError('No authentication token received from the provider.');
      return;
    }

    if (!['google', 'apple', 'facebook'].includes(provider)) {
      setError('Unknown authentication provider.');
      return;
    }

    // Validate state
    const storedState = window.sessionStorage.getItem('oauth_state');
    window.sessionStorage.removeItem('oauth_state'); // consume it
    if (!state || !storedState || state !== storedState) {
      setError('Security validation failed: Invalid or missing state parameter.');
      return;
    }

    // Validate nonce for Google/Apple
    if (provider === 'google' || provider === 'apple') {
      const storedNonce = window.sessionStorage.getItem('oauth_nonce');
      window.sessionStorage.removeItem('oauth_nonce'); // consume it
      try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) throw new Error('Invalid token format');
        
        // Base64Url decode logic
        const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        if (!storedNonce || payload.nonce !== storedNonce) {
          setError('Security validation failed: Invalid or missing nonce.');
          return;
        }
      } catch (err) {
        setError('Security validation failed: Malformed token.');
        return;
      }
    }

    // Verify token with backend
    register({ provider, token })
      .then((user) => {
        // Success: Redirect to onboarding or home
        if (user.onboardingStep !== 'COMPLETE') {
          router.push('/app/onboarding');
        } else {
          router.push('/app/home');
        }
      })
      .catch((err) => {
        console.error('OAuth backend verification failed:', err);
        setError(err.message || 'Failed to authenticate with the server. Please try again.');
      });

  }, [provider, register, router]);

  return (
    <main className="min-h-screen bg-[#0a0a0c] flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background gradients matching auth pages */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#FF2D8F] opacity-10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#855CF6] opacity-10 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-md bg-[#121216] border border-white/5 rounded-[24px] p-8 shadow-2xl flex flex-col items-center">
        {/* VUZKI Logo SVG */}
        <div className="mb-8 flex justify-center">
          <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 85C50 85 20 60 20 35C20 20 32 10 45 10C51 10 56 12.5 60 17C64 12.5 69 10 75 10C88 10 100 20 100 35C100 60 70 85 70 85" fill="url(#paint0_linear)"/>
            <path d="M50 85C50 85 80 60 80 35C80 20 68 10 55 10C49 10 44 12.5 40 17C36 12.5 31 10 25 10C12 10 0 20 0 35C0 60 30 85 30 85" fill="url(#paint1_linear)"/>
            <defs>
              <linearGradient id="paint0_linear" x1="20" y1="10" x2="100" y2="85" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF2D8F"/>
                <stop offset="1" stopColor="#855CF6"/>
              </linearGradient>
              <linearGradient id="paint1_linear" x1="80" y1="10" x2="0" y2="85" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF006E"/>
                <stop offset="1" stopColor="#6C3BFF"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {error ? (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white font-sans mb-2 text-center">Authentication Failed</h2>
            <p className="text-gray-400 text-center mb-8 font-sans text-sm">{error}</p>
            <button 
              onClick={() => router.push('/auth/login')}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-sans font-semibold py-3.5 px-6 rounded-full transition-colors"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-16 h-16 mb-6">
              <svg className="animate-spin text-[#FF2D8F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white font-sans mb-2">Authenticating...</h2>
            <p className="text-gray-400 font-sans text-sm">Please wait while we verify your account securely.</p>
          </div>
        )}
      </div>
    </main>
  );
}
