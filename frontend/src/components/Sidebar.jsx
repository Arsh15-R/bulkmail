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
  const navItems = [
    { id: 'compose', label: 'Compose', icon: PenSquare, isPrimary: true },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'groups', label: 'Contact Groups', icon: FolderTree },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'history', label: 'Send History', icon: Clock },
    { id: 'scheduled', label: 'Scheduled', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarContent = (
    <aside
      className={`h-full flex flex-col justify-between bg-surface border-r border-border p-3 transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Nav List */}
      <div className="space-y-1">
        {navItems.map((item) => {
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
              className={`relative w-full flex items-center rounded-control font-medium text-xs transition-colors duration-150 group outline-none ${
                isCollapsed
                  ? 'h-10 justify-center px-0'
                  : 'h-9 px-3 justify-between'
              } ${
                isActive
                  ? item.isPrimary
                    ? 'text-accent-foreground font-semibold'
                    : 'text-foreground font-semibold'
                  : item.isPrimary
                  ? 'text-accent-strong hover:text-accent-foreground hover:bg-accent-subtle/80'
                  : 'text-text-secondary hover:text-foreground hover:bg-surface-muted'
              }`}
            >
              {/* Animated gliding active background pill */}
              {isActive && (
                <motion.div
                  layoutId="active-sidebar-pill"
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 40,
                    mass: 0.8
                  }}
                  className={`absolute inset-0 rounded-control ${
                    item.isPrimary
                      ? 'bg-accent shadow-xs'
                      : 'bg-surface-muted border border-border-subtle'
                  }`}
                  style={{ zIndex: 0 }}
                />
              )}

              {/* Button content layered on top of indicator */}
              <div
                className={`relative z-10 flex items-center ${
                  isCollapsed ? 'justify-center' : 'space-x-2.5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                    isActive
                      ? item.isPrimary
                        ? 'text-accent-foreground'
                        : 'text-accent'
                      : 'group-hover:scale-105'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}
              </div>

              {!isCollapsed && item.isPrimary && (
                <span className="relative z-10 text-[10px] font-mono px-1.5 py-0.5 rounded-pill bg-accent-foreground/15 text-accent-foreground font-semibold">
                  New
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Status Card */}
      <div className="pt-3 border-t border-border-subtle">
        {isCollapsed ? (
          <div
            className="flex flex-col items-center justify-center p-2 rounded-control bg-surface-muted/60 text-text-muted hover:text-foreground cursor-default transition-colors"
            title="BulkMailer Queue Active • SQLite + Nodemailer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-panel bg-surface-muted/60 border border-border-subtle text-xs text-text-secondary space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-[11px] tracking-tight">
                BulkMailer Core
              </span>
              <span className="flex items-center space-x-1 text-[10px] text-success font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span>Active</span>
              </span>
            </div>
            <p className="text-[10px] text-text-muted leading-tight">
              Local SQLite + Gmail SMTP
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
