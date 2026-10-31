import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, ExternalLink, X, Trash2, ArrowRight } from 'lucide-react';

const DEFAULT_CLIENT_ID = '782542098396-f8ruvo4rb6mbia4416vdeb0316p8onga.apps.googleusercontent.com';

export const GoogleLoginButton = ({ text = 'Continue with Google', onError }) => {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempClientId, setTempClientId] = useState('');
  const [validationWarning, setValidationWarning] = useState('');

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
          return;
        }
      } catch (err) {
        // Fallback to default
      }

      // Priority 4: Default production Client ID
      setClientId(DEFAULT_CLIENT_ID);
    };

    resolveClientId();
  }, []);

  // 2. Google One Tap prompt (100% immune to pop-up blockers, requires only JS origin)
  useEffect(() => {
    const activeId = clientId || DEFAULT_CLIENT_ID;
    if (!activeId) return;

    const initOneTap = () => {
      if (!window.google?.accounts?.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: activeId.trim(),
          callback: async (response) => {
            if (response?.credential) {
              setLoading(true);
              try {
                await googleLogin({ credential: response.credential });
              } catch (err) {
                if (onError) onError(err.message || 'Google authentication failed.');
              } finally {
                setLoading(false);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.prompt();
      } catch (err) {
        // Silent fallback to standard direct redirect
      }
    };

    if (window.google?.accounts?.id) {
      initOneTap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initOneTap;
      document.body.appendChild(script);
    }
  }, [clientId]);

  // Direct top-level navigation: 100% immune to browser pop-up blockers
  const handleDirectLogin = () => {
    const activeId = clientId || DEFAULT_CLIENT_ID;
    if (!activeId) {
      setTempClientId('');
      setShowConfigModal(true);
      return;
    }

    setLoading(true);
    const currentOrigin = window.location.origin;
    const redirectUri = encodeURIComponent(currentOrigin);
    const scope = encodeURIComponent('email profile openid');
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(activeId.trim())}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&prompt=select_account`;

    // Direct browser navigation in current tab
    window.location.href = googleAuthUrl;
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    const cleanId = tempClientId.trim();
    if (!cleanId) return;

    if (!cleanId.includes('.apps.googleusercontent.com')) {
      setValidationWarning('Note: Standard Google Client IDs end with ".apps.googleusercontent.com".');
    } else {
      setValidationWarning('');
    }

    localStorage.setItem('bm_google_client_id', cleanId);
    setClientId(cleanId);
    setShowConfigModal(false);
    handleDirectLogin();
  };

  const handleClearConfig = () => {
    localStorage.removeItem('bm_google_client_id');
    setClientId(DEFAULT_CLIENT_ID);
    setTempClientId('');
    setValidationWarning('');
    setShowConfigModal(false);
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      {/* Primary Google Sign-In Button (Direct 1-Click Redirect) */}
      <motion.button
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.99 }}
        type="button"
        disabled={loading}
        onClick={handleDirectLogin}
        className={`w-full py-2.5 px-4 rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground font-semibold text-xs flex items-center justify-center space-x-2.5 shadow-sm hover:shadow hover:border-indigo-500/40 transition-all cursor-pointer select-none ${
          loading ? 'opacity-80' : ''
        }`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
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

      {/* Auxiliary Client ID Indicator & Controls */}
      <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
        <span className="flex items-center space-x-1.5 truncate max-w-[220px]" title={`Client ID active`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">Google OAuth active</span>
        </span>

        <button
          type="button"
          onClick={() => {
            setTempClientId(clientId);
            setValidationWarning('');
            setShowConfigModal(true);
          }}
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
        >
          {clientId ? 'Edit Client ID' : 'Configure'}
        </button>
      </div>

      {/* Google OAuth Configuration Modal */}
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
              className="relative bg-surface rounded-2xl border border-border shadow-2xl max-w-md w-full p-6 space-y-4 z-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
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
                OAuth 2.0 Web Client ID from the{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 underline font-semibold inline-flex items-center gap-0.5"
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
                    onChange={(e) => {
                      setTempClientId(e.target.value);
                      if (e.target.value && !e.target.value.includes('.apps.googleusercontent.com')) {
                        setValidationWarning('Tip: Google OAuth Client IDs typically end with .apps.googleusercontent.com');
                      } else {
                        setValidationWarning('');
                      }
                    }}
                    placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-foreground placeholder:text-text-muted text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-mono"
                  />
                  {validationWarning && (
                    <p className="text-[11px] text-amber-500 mt-1">
                      {validationWarning}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-surface-muted rounded-xl border border-border-subtle text-[11px] text-text-muted space-y-2">
                  <div className="font-semibold text-foreground">Google Cloud Console Settings:</div>
                  
                  <div>
                    <div className="font-semibold text-text-secondary mb-1">1. Authorized JavaScript origins:</div>
                    <div className="space-y-1 font-mono text-indigo-600 dark:text-indigo-400 text-[10px]">
                      <div className="select-all bg-surface px-2 py-1 rounded border border-border-subtle">
                        https://bulkmail-gold.vercel.app
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-text-secondary mb-1">2. Authorized redirect URIs:</div>
                    <div className="space-y-1 font-mono text-indigo-600 dark:text-indigo-400 text-[10px]">
                      <div className="select-all bg-surface px-2 py-1 rounded border border-border-subtle">
                        https://bulkmail-gold.vercel.app
                      </div>
                      <div className="select-all bg-surface px-2 py-1 rounded border border-border-subtle">
                        https://bulkmail-gold.vercel.app/
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {clientId && clientId !== DEFAULT_CLIENT_ID ? (
                    <button
                      type="button"
                      onClick={handleClearConfig}
                      className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset to Default</span>
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-muted hover:bg-surface text-foreground border border-border transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer"
                    >
                      Save & Connect
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
