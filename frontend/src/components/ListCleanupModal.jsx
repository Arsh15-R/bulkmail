import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserX,
  X,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';

export const ListCleanupModal = ({
  isOpen,
  onClose,
  cleanupStats,
  cleanupDetails,
  onApplyCleanList
}) => {
  if (!isOpen || !cleanupStats) return null;

  const totalIssues =
    (cleanupStats.duplicatesCount || 0) +
    (cleanupStats.invalidCount || 0) +
    (cleanupStats.unsubscribedCount || 0) +
    (cleanupStats.bouncedCount || 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-11/60 dark:bg-black/75 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ type: "spring", stiffness: 480, damping: 36 }}
          className="relative bg-surface rounded-panel border border-border shadow-floating max-w-xl w-full flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-control bg-warning/10 text-warning flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
                  List Health & Deliverability Audit
                </h3>
                <p className="text-xs text-text-muted">
                  Automated scan for duplicates, syntax errors, and suppressed contacts.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-control text-text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {totalIssues === 0 ? (
              <div className="p-8 text-center space-y-3 bg-surface-muted rounded-control border border-border-subtle">
                <div className="w-12 h-12 rounded-pill bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-foreground text-sm">
                    Recipient list is pristine!
                  </h4>
                  <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                    All {cleanupStats.originalTotal} addresses passed syntax and reputation checks. Zero duplicates, bounces, or unsubscriptions found.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 4 Health Breakdown Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Duplicates */}
                  <div className="p-3 rounded-control bg-surface-raised border border-border shadow-xs">
                    <div className="text-[10px] text-text-muted uppercase font-mono tracking-wider flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span>Duplicates</span>
                    </div>
                    <div className="text-lg font-bold text-foreground font-mono mt-1">
                      {cleanupStats.duplicatesCount}
                    </div>
                  </div>

                  {/* Invalid */}
                  <div className="p-3 rounded-control bg-rose-500/10 border border-rose-500/20 shadow-xs">
                    <div className="text-[10px] text-rose-500 uppercase font-mono tracking-wider flex items-center space-x-1">
                      <XCircle className="w-3 h-3 text-rose-500" />
                      <span>Syntax</span>
                    </div>
                    <div className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">
                      {cleanupStats.invalidCount}
                    </div>
                  </div>

                  {/* Unsubscribed */}
                  <div className="p-3 rounded-control bg-purple-500/10 border border-purple-500/20 shadow-xs">
                    <div className="text-[10px] text-purple-400 uppercase font-mono tracking-wider flex items-center space-x-1">
                      <UserX className="w-3 h-3 text-purple-400" />
                      <span>Opted-Out</span>
                    </div>
                    <div className="text-lg font-bold text-purple-500 dark:text-purple-300 font-mono mt-1">
                      {cleanupStats.unsubscribedCount}
                    </div>
                  </div>

                  {/* Bounced */}
                  <div className="p-3 rounded-control bg-amber-500/10 border border-amber-500/20 shadow-xs">
                    <div className="text-[10px] text-amber-500 uppercase font-mono tracking-wider flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span>Bounces</span>
                    </div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
                      {cleanupStats.bouncedCount}
                    </div>
                  </div>
                </div>

                {/* Explanation Banner */}
                <div className="p-3.5 bg-warning/10 border border-warning/20 rounded-control text-xs text-warning flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Deliverability Optimization: </span>
                    <span>
                      Pruning these {totalIssues} flagged addresses will protect your Gmail / SMTP sender reputation, eliminate bounce penalties, and maximize primary inbox placement.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-subtle bg-surface-raised flex items-center justify-between shrink-0">
            <div className="text-xs text-text-muted">
              Resulting list: <span className="font-bold text-foreground font-mono">{cleanupStats.cleanTotal}</span> clean addresses
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-foreground rounded-control border border-border bg-surface hover:bg-surface-muted transition cursor-pointer"
              >
                Keep As Is
              </button>

              {totalIssues > 0 && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    onApplyCleanList();
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-control bg-emerald-600 hover:bg-emerald-700 text-white shadow-resting flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove {totalIssues} Bad Addresses</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
