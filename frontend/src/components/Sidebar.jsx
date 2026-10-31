import React from 'react';
import { motion } from 'motion/react';
import {
  PenSquare,
  Users,
  FolderTree,
  FileText,
  Clock,
  Calendar,
  Settings,
  ChevronRight,
  Activity,
  Sparkles
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const primaryNav = [
    { id: 'compose', label: 'Compose Campaign', icon: PenSquare, isPrimary: true, badge: 'New' },
  ];

  const audienceNav = [
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'groups', label: 'Contact Groups', icon: FolderTree },
    { id: 'templates', label: 'Templates', icon: FileText },
  ];

  const operationsNav = [
    { id: 'history', label: 'Send History', icon: Clock },
    { id: 'scheduled', label: 'Scheduled', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderNavGroup = (items, groupLabel) => (
    <div className="space-y-1">
      {!isCollapsed && groupLabel && (
        <div className="px-3 pt-3 pb-1 text-[10px] font-semibold font-mono tracking-wider text-text-muted uppercase">
          {groupLabel}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveTab(item.id);
              if (onCloseMobile) onCloseMobile();
            }}
            title={isCollapsed ? item.label : undefined}
            className={`relative w-full flex items-center rounded-xl font-medium text-xs transition-all duration-150 group outline-none cursor-pointer ${
              isCollapsed
                ? 'h-10 justify-center px-0'
                : 'h-9.5 px-3 justify-between'
            } ${
              isActive
                ? item.isPrimary
                  ? 'text-white font-semibold shadow-md shadow-indigo-500/20'
                  : 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50'
                : 'text-text-secondary hover:text-foreground hover:bg-surface-muted/80'
            }`}
          >
            {/* Animated active background for primary */}
            {isActive && item.isPrimary && (
              <motion.div
                layoutId="active-primary-pill"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 40,
                  mass: 0.8
                }}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600"
                style={{ zIndex: 0 }}
              />
            )}

            {/* Button content */}
            <div
              className={`relative z-10 flex items-center ${
                isCollapsed ? 'justify-center' : 'space-x-2.5'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                  isActive
                    ? item.isPrimary
                      ? 'text-white'
                      : 'text-indigo-600 dark:text-indigo-400'
                    : 'group-hover:scale-110 text-text-muted group-hover:text-foreground'
                }`}
              />
              {!isCollapsed && (
                <span className="truncate tracking-tight">{item.label}</span>
              )}
            </div>

            {!isCollapsed && item.badge && (
              <span className={`relative z-10 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shadow-xs ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <aside
      className={`h-full flex flex-col justify-between bg-surface/80 backdrop-blur-xl border-r border-border p-3 transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Nav List */}
      <div className="space-y-2">
        {renderNavGroup(primaryNav)}
        {renderNavGroup(audienceNav, 'Audience & Content')}
        {renderNavGroup(operationsNav, 'Operations')}
      </div>

      {/* Bottom Status Card */}
      <div className="pt-3 border-t border-border/80">
        {isCollapsed ? (
          <div
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-muted/60 text-text-muted hover:text-foreground cursor-default transition-colors shadow-xs"
            title="BulkMailer Queue Active • Supabase PostgreSQL + Gmail SMTP"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-surface-muted/60 border border-border/70 text-xs text-text-secondary space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-[11px] tracking-tight">
                BulkMailer Engine
              </span>
              <span className="flex items-center space-x-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active</span>
              </span>
            </div>
            <p className="text-[10px] text-text-muted leading-tight font-mono">
              Supabase Cloud + Gmail SMTP
            </p>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-neutral-11/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10 shadow-floating">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
