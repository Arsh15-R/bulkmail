import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Sun,
  Moon,
  LogOut,
  Sparkles,
  Menu,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  User,
  ShieldCheck,
  Zap,
  RotateCcw,
  Settings as SettingsIcon
} from 'lucide-react';

export const Navbar = ({
  isSidebarCollapsed,
  onToggleSidebar,
  onToggleMobileNav,
  onNavigate
}) => {
  const { user, logout, refreshUser } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRefreshingQuota, setIsRefreshingQuota] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar_url]);

  const handleRefreshQuota = async (e) => {
    if (e) e.stopPropagation();
    setIsRefreshingQuota(true);
    try {
      if (refreshUser) await refreshUser();
    } finally {
      setTimeout(() => setIsRefreshingQuota(false), 500);
    }
  };

  const sentToday = user?.sent_today || 0;
  const dailyLimit = user?.daily_send_limit || 500;
  const remainingToday = Math.max(0, dailyLimit - sentToday);
  const percentUsed = Math.min(100, Math.round((sentToday / dailyLimit) * 100));

  // Initials for user avatar
  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-40 h-14 bg-surface/85 backdrop-blur-xl border-b border-border shadow-xs px-4 sm:px-6 flex items-center justify-between transition-all">
      {/* Left: Hamburger & Brand */}
      <div className="flex items-center space-x-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="md:hidden p-1.5 rounded-xl text-text-secondary hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex p-1.5 rounded-xl text-text-secondary hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-4 h-4 text-text-muted hover:text-foreground transition-colors" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-text-muted hover:text-foreground transition-colors" />
          )}
        </button>

        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 ring-1 ring-white/25">
            <Mail className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-display font-bold text-sm tracking-tight text-foreground">
              BulkMailer
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider shadow-xs">
              <Zap className="w-2.5 h-2.5 fill-current" />
              <span>Pro Dispatcher</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right: Quota, Theme Toggle & User Menu */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Daily Quota Meter */}
        <div
          onClick={handleRefreshQuota}
          className="hidden sm:flex items-center space-x-3 bg-surface-muted/70 hover:bg-surface px-3 py-1.5 rounded-xl border border-border hover:border-indigo-500/30 hover:shadow-xs transition-all cursor-pointer group"
          title={`${remainingToday} emails remaining today. Click to refresh live quota. Resets at midnight UTC.`}
        >
          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-text-muted flex items-center justify-end space-x-1">
              <span>Daily Quota</span>
              <RotateCcw
                className={`w-2.5 h-2.5 text-text-muted group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform duration-500 ${
                  isRefreshingQuota ? 'animate-spin text-indigo-600' : ''
                }`}
              />
            </div>
            <div className="text-xs font-semibold text-foreground">
              <span className="text-foreground font-bold">{sentToday}</span>{' '}
              <span className="text-text-muted font-normal text-[11px]">/ {dailyLimit} sent</span>
            </div>
          </div>
          <div className="w-16 h-1.5 bg-neutral-4 dark:bg-neutral-9 rounded-pill overflow-hidden">
            <div
              className={`h-full rounded-pill transition-all duration-300 ${
                percentUsed > 90
                  ? 'bg-danger'
                  : percentUsed > 70
                  ? 'bg-warning'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light theme' : 'Switch to Dark theme'}
          className="p-2 rounded-xl text-text-secondary hover:text-foreground hover:bg-surface-muted transition-colors border border-border/40 hover:border-border cursor-pointer shadow-xs"
          aria-label="Toggle theme"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400 stroke-[2]" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 stroke-[2]" />
          )}
        </button>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            className="flex items-center space-x-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-surface-muted transition-colors border border-border/40 hover:border-border text-left cursor-pointer shadow-xs"
          >
            <div className="relative shrink-0">
              {user?.avatar_url && !avatarError ? (
                <img
                  src={user.avatar_url}
                  alt={user.name || 'User'}
                  className="w-7 h-7 rounded-full border border-border object-cover shadow-xs ring-1 ring-indigo-500/20"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-display font-semibold text-xs flex items-center justify-center border border-indigo-500/20 shadow-xs ring-1 ring-indigo-500/10">
                  {initials}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-surface" />
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
                {user?.name || 'Sender'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted transition-transform group-hover:translate-y-0.5" />
          </button>

          {/* User Popover Menu */}
          <AnimatePresence>
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 mt-1.5 w-60 z-50 bg-surface rounded-panel border border-border shadow-raised p-1.5 text-xs text-foreground focus:outline-none"
                >
                  <div className="px-3 py-2.5 border-b border-border-subtle flex items-center space-x-2.5">
                    {user?.avatar_url && !avatarError ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name || 'User'}
                        className="w-8 h-8 rounded-pill border border-border object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-pill bg-accent/15 text-accent-strong font-display font-semibold text-xs flex items-center justify-center border border-accent/25 shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-foreground leading-tight">
                        {user?.name || 'Sender'}
                      </p>
                      <p className="text-[11px] text-text-muted truncate mt-0.5 font-mono">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="py-1">
                    <div className="px-3 py-1.5 text-[11px] text-text-muted flex items-center justify-between">
                      <span>Daily Limit</span>
                      <span className="font-semibold text-foreground">{dailyLimit} emails</span>
                    </div>
                    <div className="px-3 py-1.5 text-[11px] text-text-muted flex items-center justify-between">
                      <span>Sent Today</span>
                      <span className="font-semibold text-foreground">{sentToday}</span>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-1 mt-1 space-y-0.5">
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('settings');
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-control hover:bg-surface-muted transition-colors text-left font-medium text-text-secondary hover:text-foreground cursor-pointer"
                      >
                        <SettingsIcon className="w-3.5 h-3.5 text-accent" />
                        <span>Profile Photo & Settings</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-control text-danger hover:bg-danger/10 transition-colors text-left font-medium cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
