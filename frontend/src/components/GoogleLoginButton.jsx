import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Settings2, KeyRound, ExternalLink, AlertCircle, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';

export const GoogleLoginButton = ({ text = 'Continue with Google', onError }) => {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempClientId, setTempClientId] = useState('');
  const [validationWarning, setValidationWarning] = useState('');
  const timeoutRef = useRef(null);

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
        // Silent catch, fallback to user config
      }
    };

    resolveClientId();
  }, []);

  // 2. Load Google Identity Services SDK
  useEffect(() => {
    if (window.google?.accounts) return;

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.warn('Failed to load Google Identity Services SDK.');
    };
    document.body.appendChild(script);
  }, []);

  // Clean up any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCancelLogin = (e) => {
    if (e) e.stopPropagation();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoading(false);
  };

  const triggerGoogleSignIn = (activeClientId) => {
    if (!activeClientId) {
      setTempClientId('');
      setShowConfigModal(true);
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      if (onError) onError('Google Sign-In is initializing. Please wait a moment and click again.');
      return;
    }

    // Set safety timeout so the button is NEVER stuck
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      if (onError) {
        onError('Google Sign-In window took too long to respond. If a pop-up was blocked, please click the pop-up icon in your browser address bar to allow pop-ups for this site.');
      }
    }, 20000);

    try {
      setLoading(true);

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: activeClientId.trim(),
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          if (tokenResponse.error) {
            setLoading(false);
            if (tokenResponse.error !== 'popup_closed_by_user') {
              if (onError) {
                onError(`Google Sign-In failed (${tokenResponse.error}): ${tokenResponse.error_description || 'Consent window was closed or not completed.'}`);
              }
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
        },
        error_callback: (error) => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setLoading(false);
          console.warn('Google Identity error_callback:', error);

          if (error?.type === 'popup_failed_to_open') {
            if (onError) {
              onError('Pop-up was blocked by your browser! Please check the address bar and click "Always allow pop-ups" for this site, then try again.');
            }
          } else if (error?.type === 'popup_closed') {
            // Popup closed by user
            setLoading(false);
          } else {
            if (onError) {
              onError(error?.message || `Google connection issue: ${error?.type || 'Failed to open Google login'}. Check your Client ID configuration.`);
            }
          }
        }
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoading(false);
      if (onError) onError(err.message || 'Failed to open Google authentication window. Please check your Google Client ID.');
    }
  };

  const handleClick = () => {
    if (loading) {
      handleCancelLogin();
      return;
    }

    if (!clientId) {
      setTempClientId('');
      setValidationWarning('');
      setShowConfigModal(true);
      return;
    }

    triggerGoogleSignIn(clientId);
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    const cleanId = tempClientId.trim();
    if (!cleanId) return;

    if (!cleanId.includes('.apps.googleusercontent.com')) {
      setValidationWarning('Note: Standard Google Client IDs end with ".apps.googleusercontent.com". Make sure you did not paste a client secret or project name.');
    } else {
      setValidationWarning('');
    }

    localStorage.setItem('bm_google_client_id', cleanId);
    setClientId(cleanId);
    setShowConfigModal(false);
    triggerGoogleSignIn(cleanId);
  };

  const handleClearConfig = () => {
    localStorage.removeItem('bm_google_client_id');
    setClientId('');
    setTempClientId('');
    setValidationWarning('');
    setShowConfigModal(false);
    setLoading(false);
    if (onError) onError('Google Client ID removed. You can now enter a new one or continue with email.');
  };

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <motion.button
          whileTap={!loading ? { scale: 0.98 } : {}}
          type="button"
          onClick={handleClick}
          className={`w-full py-2.5 px-4 rounded-control border border-border bg-surface-muted hover:bg-surface text-foreground font-semibold text-xs flex items-center justify-center space-x-2.5 shadow-xs transition cursor-pointer select-none ${
            loading ? 'border-accent/40 bg-accent/5' : ''
          }`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-pill animate-spin shrink-0" />
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

          {loading && (
            <span
              onClick={handleCancelLogin}
              title="Click to cancel and reset"
              className="ml-auto text-[11px] font-normal px-2 py-0.5 rounded bg-surface hover:bg-surface-muted text-text-muted hover:text-foreground border border-border cursor-pointer transition"
            >
              Cancel
            </span>
          )}
        </motion.button>
      </div>

      {/* Auxiliary Client ID Indicator & Edit Trigger */}
      <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
        {clientId ? (
          <span className="flex items-center space-x-1.5 truncate max-w-[220px]" title={`Active Client ID: ${clientId}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Google OAuth active</span>
          </span>
        ) : (
          <span className="text-text-muted flex items-center space-x-1">
            <span>Client ID not configured</span>
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            setTempClientId(clientId);
            setValidationWarning('');
            setShowConfigModal(true);
          }}
          className="text-accent hover:underline font-medium cursor-pointer"
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
                To sign in with Google, enter your OAuth 2.0 Web Client ID from the{' '}
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
                    onChange={(e) => {
                      setTempClientId(e.target.value);
                      if (e.target.value && !e.target.value.includes('.apps.googleusercontent.com')) {
                        setValidationWarning('Tip: Google OAuth Client IDs typically end with .apps.googleusercontent.com');
                      } else {
                        setValidationWarning('');
                      }
                    }}
                    placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                    className="w-full px-3 py-2 rounded-control border border-border bg-surface-muted text-foreground placeholder:text-text-muted text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono"
                  />
                  {validationWarning && (
                    <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{validationWarning}</span>
                    </p>
                  )}
                </div>

                <div className="p-3 bg-surface-muted rounded-control border border-border-subtle text-[11px] text-text-muted space-y-1.5">
                  <div className="font-semibold text-foreground">Required Google Console Settings:</div>
                  <div>In your Google Cloud OAuth Client ID configuration:</div>
                  <div>1. Application Type: <strong>Web application</strong></div>
                  <div>2. Add to <strong>Authorized JavaScript origins</strong>:</div>
                  <div className="font-mono text-accent select-all bg-surface px-1.5 py-0.5 rounded border border-border-subtle">https://bulkmail-gold.vercel.app</div>
                  <div className="font-mono text-accent select-all bg-surface px-1.5 py-0.5 rounded border border-border-subtle">http://localhost:5173</div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {clientId ? (
                    <button
                      type="button"
                      onClick={handleClearConfig}
                      className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Saved ID</span>
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center space-x-2">
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
