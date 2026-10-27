import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  ShieldCheck,
  Key,
  Server,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Mail,
  User,
  Activity,
  Sparkles
} from 'lucide-react';

export const Settings = () => {
  const { user, updateUserSettings, refreshUser } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [dailyLimit, setDailyLimit] = useState(user?.daily_send_limit || 500);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // SMTP test state
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updateUserSettings({
        name: name.trim(),
        daily_send_limit: parseInt(dailyLimit, 10),
        dark_mode: isDarkMode ? 1 : 0
      });
      showToast('Profile and dispatch preferences saved.');
      refreshUser();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    try {
      const res = await api.auth.changePassword(currentPassword, newPassword);
      if (res.success) {
        showToast('Password successfully changed.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpStatus(null);
    try {
      const res = await api.send.verifySmtp();
      setSmtpStatus(res);
      if (res.success) {
        showToast('Gmail SMTP Connection Verified Successfully!');
      } else {
        showToast(res.message || 'SMTP Connection Check Notice', 'error');
      }
    } catch (err) {
      setSmtpStatus({ success: false, message: err.message });
      showToast(err.message, 'error');
    } finally {
      setTestingSmtp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-control text-xs font-semibold shadow-floating border flex items-center space-x-2 ${
              toast.type === 'error'
                ? 'bg-rose-500 text-white border-rose-600'
                : 'bg-surface-raised text-foreground border-border'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-surface p-5 rounded-panel border border-border shadow-resting">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-control bg-accent-subtle text-accent flex items-center justify-center shadow-xs">
            <SettingsIcon className="w-4 h-4" />
          </div>
          <h2 className="text-base font-display font-bold text-foreground tracking-tight">
            Account & System Preferences
          </h2>
        </div>
        <p className="text-xs text-text-muted mt-1">
          Manage sending caps, interface appearance, account security, and SMTP credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Profile & Quota Settings Card */}
        <div className="bg-surface p-6 rounded-panel border border-border shadow-resting space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-border-subtle">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
              Profile & Sending Safeguards
            </h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {/* Google Linked Status */}
            {(user?.auth_provider === 'google' || user?.auth_provider === 'google_linked') && (
              <div className="p-3 rounded-control bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-xs shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                      <span>Google Account</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                        {user?.auth_provider === 'google' ? 'Google SSO' : 'Google Linked'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      {user?.auth_provider === 'google'
                        ? 'Authenticated via Google Single Sign-On'
                        : 'Google OAuth linked to this account'}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connected
                </span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Account Email
              </label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full rounded-control border border-border bg-surface-muted p-2 font-mono text-text-muted text-xs cursor-not-allowed select-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Full Name / Sender Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Daily Send Quota (Safety Cap)
              </label>
              <input
                type="number"
                min={1}
                max={50000}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <p className="text-[11px] text-text-muted mt-1 font-mono">
                Delivered today: {user?.sent_today || 0} / {dailyLimit} emails.
              </p>
            </div>

            {/* Appearance Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <div>
                <div className="font-semibold text-foreground text-xs">Theme Mode</div>
                <div className="text-[11px] text-text-muted">
                  {isDarkMode ? 'Dark Theme active' : 'Light Theme active'}
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-3 py-1.5 rounded-control border border-border bg-surface-muted hover:bg-surface text-foreground font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-text-muted" />}
                <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-2 rounded-control bg-accent text-accent-foreground hover:opacity-95 font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-resting transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </motion.button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-surface p-6 rounded-panel border border-border shadow-resting space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-border-subtle">
            <Key className="w-4 h-4 text-accent" />
            <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
              Change Password
            </h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Current Password {user?.auth_provider === 'google' && <span className="font-normal text-text-muted">(leave blank if first time setting password)</span>}
              </label>
              <input
                type="password"
                required={user?.auth_provider !== 'google'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                New Password (Min 6 characters)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-2 rounded-control bg-surface-muted hover:bg-surface border border-border text-foreground font-semibold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              <span>Update Password</span>
            </motion.button>
          </form>

          <div className="pt-3 border-t border-border-subtle text-[11px] text-text-muted space-y-1">
            <div className="font-semibold text-foreground flex items-center space-x-1">
              <Server className="w-3 h-3 text-accent" />
              <span>Security Architecture</span>
            </div>
            <p className="leading-relaxed">
              Passwords are salted and hashed using bcrypt (10 rounds). Credentials and SMTP tokens are never exposed to the client bundle.
            </p>
          </div>
        </div>
      </div>

      {/* Gmail & SMTP Connection Diagnostic Card */}
      <div className="bg-surface p-6 rounded-panel border border-border shadow-resting space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-emerald-500" />
              <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
                Google Gmail / SMTP Diagnostic
              </h3>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Verify real-time authentication handshake with the configured SMTP mail server.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleTestSmtp}
            disabled={testingSmtp}
            className="px-4 py-2 rounded-control text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-resting flex items-center space-x-1.5 disabled:opacity-50 transition cursor-pointer self-start sm:self-auto"
          >
            {testingSmtp ? (
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-pill animate-spin" />
                <span>Verifying Handshake...</span>
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Test SMTP Connection</span>
              </>
            )}
          </motion.button>
        </div>

        {smtpStatus && (
          <div
            className={`p-3.5 rounded-control border text-xs space-y-1 ${
              smtpStatus.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <div className="font-semibold flex items-center space-x-1.5">
              {smtpStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{smtpStatus.success ? 'SMTP Connected & Verified!' : 'SMTP Connection Diagnostic Notice'}</span>
            </div>
            <p>{smtpStatus.message}</p>
            {smtpStatus.configuredUser && (
              <div className="font-mono text-[11px] opacity-80 pt-0.5">
                User: {smtpStatus.configuredUser} | Host: {smtpStatus.host}
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-surface-muted rounded-control border border-border-subtle text-xs space-y-2.5">
          <div className="font-semibold text-foreground flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Google Gmail SMTP Setup Guide:</span>
          </div>
          <ol className="list-decimal pl-5 space-y-1.5 text-text-secondary leading-relaxed">
            <li>
              <strong>2-Step Verification:</strong> Ensure 2-Step Verification is enabled in{' '}
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline font-medium"
              >
                Google Security Settings
              </a>.
            </li>
            <li>
              <strong>Generate App Password:</strong> Visit{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline font-medium"
              >
                Google App Passwords
              </a>
              , select "Mail", name it <code>BulkMailer</code>, and copy the 16-character code.
            </li>
            <li>
              <strong>Set in Environment Variables:</strong> Set <code>SMTP_PASS=your_16_character_code</code> and <code>SMTP_USER=your_email@gmail.com</code> in your cloud host dashboard.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
