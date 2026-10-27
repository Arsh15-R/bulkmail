import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Settings2, KeyRound, ExternalLink, AlertCircle } from 'lucide-react';

export const GoogleLoginButton = ({ text = 'Continue with Google', onError }) => {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempClientId, setTempClientId] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // 1. Fetch or resolve Google Client ID
  useEffect(() => {
    const resolveClientId = async () => {
      // Priority 1: Vite Environment variable
      if (import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        setClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID);
        return;
      }

      // Priority 2: Local storage custom override
      const saved = localStorage.getItem('bm_google_client_id');
      if (saved) {
        setClientId(saved);
        return;
      }

      // Priority 3: Backend configuration endpoint
      try {
        const res = await api.auth.getGoogleClientId();
        if (res.success && res.clientId) {
          setClientId(res.clientId);
        }
      } catch (err) {
        // Silent catch, fallback to manual setup if needed
      }
    };

    resolveClientId();
  }, []);

  // 2. Load Google Identity Services SDK
  useEffect(() => {
    if (window.google?.accounts) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => console.warn('Failed to load Google Identity Services SDK.');
    document.body.appendChild(script);

    return () => {
      // script persists for session
    };
  }, []);

  const triggerGoogleSignIn = (activeClientId) => {
    if (!window.google?.accounts?.oauth2) {
      if (onError) onError('Google Sign-In SDK is still initializing. Please try again in a second.');
      return;
    }

    try {
      setLoading(true);
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setLoading(false);
            if (tokenResponse.error !== 'popup_closed_by_user') {
              if (onError) onError(`Google Sign-In failed: ${tokenResponse.error_description || tokenResponse.error}`);
            }
            return;
          }

          try {
            await googleLogin({ accessToken: tokenResponse.access_token });
          } catch (err) {
            if (onError) onError(err.message || 'Google authentication failed.');
          } finally {
            setLoading(false);
          }
        }
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      setLoading(false);
      if (onError) onError(err.message || 'Failed to open Google authentication window.');
    }
  };

  const handleClick = () => {
    if (!clientId) {
      // Prompt user to configure Google Client ID
      setTempClientId('');
      setShowConfigModal(true);
      return;
    }

    triggerGoogleSignIn(clientId);
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    const cleanId = tempClientId.trim();
    if (!cleanId) return;

    localStorage.setItem('bm_google_client_id', cleanId);
    setClientId(cleanId);
    setShowConfigModal(false);
    triggerGoogleSignIn(cleanId);
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-control border border-border bg-surface-muted hover:bg-surface text-foreground font-semibold text-xs flex items-center justify-center space-x-2.5 shadow-xs transition cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-pill animate-spin" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{loading ? 'Connecting to Google...' : text}</span>
      </motion.button>

      {/* Google OAuth Configuration Modal if not set */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfigModal(false)}
              className="fixed inset-0 bg-neutral-11/60 dark:bg-black/75 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-surface rounded-panel border border-border shadow-floating max-w-md w-full p-6 space-y-4 z-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-control bg-accent-subtle text-accent flex items-center justify-center shadow-xs">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-sm">
                    Configure Google Client ID
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="p-1 rounded text-text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-text-muted">
                To sign in with your Google account, enter your Google OAuth 2.0 Client ID from the{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline font-semibold inline-flex items-center gap-0.5"
                >
                  Google Cloud Console <ExternalLink className="w-2.5 h-2.5" />
                </a>
                .
              </p>

              <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    required
                    value={tempClientId}
                    onChange={(e) => setTempClientId(e.target.value)}
                    placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-2 rounded-control border border-border bg-surface-muted text-foreground placeholder:text-text-muted text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono"
                  />
                </div>

                <div className="p-3 bg-surface-muted rounded-control border border-border-subtle text-[11px] text-text-muted space-y-1">
                  <div className="font-semibold text-foreground">Quick Setup Tip:</div>
                  <div>In your Google Cloud Console OAuth Client:</div>
                  <div>1. Set Application Type to <strong>Web Application</strong></div>
                  <div>2. Add Authorized JavaScript origins:</div>
                  <div className="font-mono text-accent select-all">https://bulkmail-gold.vercel.app</div>
                  <div className="font-mono text-accent select-all">http://localhost:5173</div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3.5 py-2 rounded-control text-xs font-semibold bg-surface-muted hover:bg-surface text-foreground border border-border transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-accent-foreground hover:opacity-95 shadow-xs transition cursor-pointer"
                  >
                    Save & Continue
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
