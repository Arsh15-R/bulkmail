import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { GoogleLoginButton } from '../components/GoogleLoginButton';
import { Mail, Lock, User, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const Signup = ({ onSwitchToLogin }) => {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const redirectErr = sessionStorage.getItem('bm_auth_error');
    if (redirectErr) {
      setError(redirectErr);
      sessionStorage.removeItem('bm_auth_error');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      await signup(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground transition-colors">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 480, damping: 36 }}
        className="max-w-md w-full bg-surface rounded-panel border border-border shadow-floating p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-control bg-accent-subtle text-accent flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs text-text-muted">
            Set up your sender profile to start dispatching personalized bulk campaigns.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-control bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign In */}
        <div className="space-y-3">
          <GoogleLoginButton
            text="Sign up with Google"
            onError={(msg) => setError(msg)}
          />

          <div className="relative flex items-center justify-center pt-1 pb-1">
            <div className="w-full border-t border-border-subtle" />
            <span className="bg-surface px-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted absolute">
              Or register with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-text-secondary mb-1">
              Full Name / Organization
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe or Acme Corp"
                className="w-full pl-9 pr-3 py-2 rounded-control border border-border bg-surface-muted text-foreground placeholder:text-text-muted text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-text-secondary mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full pl-9 pr-3 py-2 rounded-control border border-border bg-surface-muted text-foreground placeholder:text-text-muted text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-text-secondary mb-1">
              Password (Min 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-control border border-border bg-surface-muted text-foreground placeholder:text-text-muted text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-control bg-accent text-accent-foreground hover:opacity-95 font-semibold text-xs flex items-center justify-center space-x-2 shadow-resting disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-pill animate-spin" />
                <span>Creating account...</span>
              </span>
            ) : (
              <>
                <span>Create BulkMailer Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </motion.button>
        </form>

        <div className="pt-2 text-center text-xs text-text-muted border-t border-border-subtle">
          <span>Already have an account? </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-accent hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </motion.div>
    </div>
  );
};
