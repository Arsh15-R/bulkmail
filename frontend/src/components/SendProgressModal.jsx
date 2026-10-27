import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { API_BASE } from '../services/api';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Check,
  ExternalLink,
  X,
  Zap,
  Activity,
  Send,
  ShieldCheck,
  Mail
} from 'lucide-react';

export const SendProgressModal = ({
  isOpen,
  campaignId,
  totalRecipients,
  isDryRun = false,
  onComplete,
  onViewHistory
}) => {
  const [progressEvents, setProgressEvents] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !campaignId) return;

    setProgressEvents([]);
    setIsCompleted(false);
    setSentCount(0);
    setFailedCount(0);
    setSkippedCount(0);

    const token = localStorage.getItem('bm_token');
    const eventSource = new EventSource(`${API_BASE}/send/progress/${campaignId}?token=${token}`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgressEvents(prev => [data, ...prev]);

        if (data.status === 'sent') {
          setSentCount(c => c + 1);
          window.dispatchEvent(new Event('bm_quota_updated'));
        } else if (data.status === 'failed' || data.status === 'bounced') {
          setFailedCount(c => c + 1);
        } else if (data.status === 'skipped') {
          setSkippedCount(c => c + 1);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.addEventListener('completed', () => {
      setIsCompleted(true);
      eventSource.close();
      window.dispatchEvent(new Event('bm_quota_updated'));
      if (onComplete) onComplete();
    });

    eventSource.onerror = () => {
      eventSource.close();
      window.dispatchEvent(new Event('bm_quota_updated'));
    };

    return () => {
      eventSource.close();
      window.dispatchEvent(new Event('bm_quota_updated'));
    };
  }, [isOpen, campaignId]);

  if (!isOpen) return null;

  const processedCount = sentCount + failedCount + skippedCount;
  const progressPercent = totalRecipients > 0 ? Math.min(100, Math.round((processedCount / totalRecipients) * 100)) : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
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
              <div className={`w-9 h-9 rounded-control flex items-center justify-center shadow-xs ${
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-accent-subtle text-accent'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Activity className="w-4 h-4 animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
                    {isCompleted
                      ? (isDryRun ? 'Simulation Complete' : 'Campaign Dispatch Complete')
                      : (isDryRun ? 'Simulation In Progress...' : 'Dispatching Campaign...')}
                  </h3>
                  {!isCompleted && (
                    <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  Campaign #{campaignId} • Queued one-by-one with sender reputation protection
                </p>
              </div>
            </div>

            {isCompleted && (
              <button
                type="button"
                onClick={onComplete}
                aria-label="Close dialog"
                className="p-1.5 rounded-control text-text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Bar & Telemetry Metrics */}
          <div className="p-6 space-y-5">
            {/* Linear-style Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-text-secondary">
                  {isCompleted
                    ? 'All dispatches finished'
                    : `Processed ${processedCount} of ${totalRecipients}`}
                </span>
                <span className="font-mono text-accent font-semibold">{progressPercent}%</span>
              </div>

              <div className="w-full h-2.5 bg-surface-muted rounded-pill overflow-hidden p-0.5 border border-border-subtle">
                <motion.div
                  className={`h-full rounded-pill transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : 'bg-accent'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Telemetry Metric Cards */}
            <div className="grid grid-cols-4 gap-2.5 text-center">
              {/* Total */}
              <div className="p-3 bg-surface-raised rounded-control border border-border shadow-xs">
                <div className="text-[10px] uppercase font-mono tracking-wider text-text-muted">Total</div>
                <div className="text-base font-bold text-foreground font-mono mt-0.5">
                  {totalRecipients}
                </div>
              </div>

              {/* Sent */}
              <div className="p-3 bg-emerald-500/10 rounded-control border border-emerald-500/20 shadow-xs">
                <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-500 font-semibold">Sent</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  {sentCount}
                </div>
              </div>

              {/* Failed */}
              <div className="p-3 bg-rose-500/10 rounded-control border border-rose-500/20 shadow-xs">
                <div className="text-[10px] uppercase font-mono tracking-wider text-rose-500 font-semibold">Failed</div>
                <div className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                  {failedCount}
                </div>
              </div>

              {/* Skipped */}
              <div className="p-3 bg-purple-500/10 rounded-control border border-purple-500/20 shadow-xs">
                <div className="text-[10px] uppercase font-mono tracking-wider text-purple-400 font-semibold">Skipped</div>
                <div className="text-base font-bold text-purple-500 dark:text-purple-300 font-mono mt-0.5">
                  {skippedCount}
                </div>
              </div>
            </div>

            {/* Live Progress Event Stream */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider font-mono">
                  Live Dispatch Feed
                </h5>
                <span className="text-[10px] text-text-muted font-mono">
                  {progressEvents.length} events
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 border border-border rounded-control p-2.5 bg-surface-muted font-mono text-xs">
                {progressEvents.length === 0 ? (
                  <div className="text-center text-text-muted py-8 text-xs italic">
                    Queue initializing and verifying parameters...
                  </div>
                ) : (
                  progressEvents.map((ev, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between py-1 px-2.5 rounded-control bg-surface border border-border-subtle shadow-xs"
                    >
                      <div className="flex items-center space-x-2 truncate mr-2">
                        <Mail className="w-3 h-3 text-text-muted shrink-0" />
                        <span className="truncate text-foreground text-[11px]">
                          {ev.email}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-pill text-[10px] font-semibold uppercase shrink-0 font-mono ${
                          ev.status === 'sent'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : ev.status === 'failed' || ev.status === 'bounced'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                        title={ev.error || ev.reason || ''}
                      >
                        {ev.status}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-subtle bg-surface-raised flex items-center justify-between shrink-0">
            {isCompleted ? (
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={onViewHistory}
                  className="text-xs font-semibold text-accent hover:opacity-80 flex items-center space-x-1 transition cursor-pointer"
                >
                  <span>View Campaign History</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onComplete}
                  className="px-4 py-2 text-xs font-semibold rounded-control bg-accent text-accent-foreground hover:opacity-95 shadow-resting transition cursor-pointer"
                >
                  Done
                </motion.button>
              </div>
            ) : (
              <div className="text-xs text-text-muted italic flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span>Delivery stream in progress. Safe to keep this open...</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
