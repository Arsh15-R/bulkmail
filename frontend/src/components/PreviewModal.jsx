import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Paperclip,
  Send,
  X,
  User,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';

export const PreviewModal = ({
  isOpen,
  onClose,
  summary,
  previews = [],
  onConfirmSend,
  isDryRun = false,
  isSending = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, previews.length]);

  if (!isOpen || previews.length === 0) return null;

  const current = previews[currentIndex] || previews[0];

  const handleNext = () => {
    setCurrentIndex(prev => (prev < previews.length - 1 ? prev + 1 : prev));
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  };

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

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ type: "spring", stiffness: 480, damping: 36 }}
          className="relative bg-surface rounded-panel border border-border shadow-floating max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-control bg-accent-subtle text-accent flex items-center justify-center shadow-xs">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
                    Rendered Email Preview
                  </h3>
                  {isDryRun && (
                    <span className="px-2 py-0.5 rounded-pill text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Simulation Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  Inspect final rendered placeholders and formatting before starting delivery.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-control text-text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Navigation & Quality Strip */}
          <div className="px-6 py-2.5 bg-surface-muted border-b border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            {/* Delivery Health Stats */}
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-foreground font-mono text-[11px]">
                {summary?.total || previews.length} {previews.length === 1 ? 'recipient' : 'recipients'}
              </span>
              <span className="inline-flex items-center text-emerald-500 font-medium text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-pill border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {summary?.validCount || previews.length} ready
              </span>
              {summary?.warningCount > 0 && (
                <span className="inline-flex items-center text-amber-500 font-medium text-[11px] bg-amber-500/10 px-2 py-0.5 rounded-pill border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {summary.warningCount} with warnings
                </span>
              )}
            </div>

            {/* Stepper Pill */}
            <div className="flex items-center space-x-2 bg-surface px-2 py-1 rounded-pill border border-border shadow-xs">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Previous recipient"
                className="p-1 rounded-pill text-text-muted hover:text-foreground disabled:opacity-30 disabled:hover:text-text-muted transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-mono text-text-secondary px-1 select-none">
                <span className="font-bold text-foreground">{currentIndex + 1}</span> of {previews.length}
              </span>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === previews.length - 1}
                aria-label="Next recipient"
                className="p-1 rounded-pill text-text-muted hover:text-foreground disabled:opacity-30 disabled:hover:text-text-muted transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Email Preview Card Body */}
          <div className="p-6 overflow-y-auto space-y-4">
            {/* Warning Callout */}
            {current.hasWarnings && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-control text-xs text-amber-500 space-y-1.5">
                <div className="font-semibold flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                  <span>Quality Warnings for this recipient:</span>
                </div>
                <div className="space-y-1 pl-5 text-[11px] text-amber-600 dark:text-amber-400">
                  {!current.isValidEmail && (
                    <div className="flex items-center text-rose-500">
                      • Invalid email format: <span className="font-mono ml-1">{current.email}</span>
                    </div>
                  )}
                  {current.isUnsubscribed && (
                    <div className="text-purple-400">
                      • Recipient previously unsubscribed (will be automatically skipped)
                    </div>
                  )}
                  {current.isBounced && (
                    <div className="text-amber-500">
                      • Recipient previously bounced (will be automatically skipped)
                    </div>
                  )}
                  {current.missingPlaceholders?.length > 0 && (
                    <div>
                      • Unresolved template placeholders: {current.missingPlaceholders.map(m => `{{${m}}}`).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email Headers Meta Block */}
            <div className="border border-border rounded-control p-4 bg-surface-raised space-y-2 text-xs">
              <div className="flex items-center">
                <span className="w-20 text-text-muted font-mono uppercase text-[10px] tracking-wider shrink-0">
                  To:
                </span>
                <span className="font-mono font-medium text-foreground truncate">
                  {current.name ? `${current.name} <${current.email}>` : current.email}
                </span>
              </div>

              {current.cc && (
                <div className="flex items-center">
                  <span className="w-20 text-text-muted font-mono uppercase text-[10px] tracking-wider shrink-0">
                    CC:
                  </span>
                  <span className="text-text-secondary font-mono text-[11px] truncate">{current.cc}</span>
                </div>
              )}

              {current.bcc && (
                <div className="flex items-center">
                  <span className="w-20 text-text-muted font-mono uppercase text-[10px] tracking-wider shrink-0">
                    BCC:
                  </span>
                  <span className="text-text-secondary font-mono text-[11px] truncate">{current.bcc}</span>
                </div>
              )}

              {current.replyTo && (
                <div className="flex items-center">
                  <span className="w-20 text-text-muted font-mono uppercase text-[10px] tracking-wider shrink-0">
                    Reply-To:
                  </span>
                  <span className="text-text-secondary font-mono text-[11px] truncate">{current.replyTo}</span>
                </div>
              )}

              <div className="flex items-center pt-2.5 border-t border-border-subtle">
                <span className="w-20 text-text-muted font-mono uppercase text-[10px] tracking-wider shrink-0">
                  Subject:
                </span>
                <span className="font-semibold text-foreground text-sm truncate">
                  {current.subject || '<No Subject>'}
                </span>
              </div>

              {current.attachments?.length > 0 && (
                <div className="flex items-center pt-2 border-t border-border-subtle">
                  <span className="w-20 text-text-muted font-mono uppercase text-[10px] tracking-wider flex items-center shrink-0">
                    <Paperclip className="w-3 h-3 mr-1" /> Files:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {current.attachments.map((att, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-pill bg-surface border border-border text-text-secondary text-[10px] font-mono"
                      >
                        {att.filename || att.originalName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Email Rendered Canvas Chrome */}
            <div className="border border-border rounded-control overflow-hidden bg-surface shadow-xs">
              <div className="px-3.5 py-1.5 bg-surface-muted border-b border-border-subtle flex items-center justify-between text-[11px] text-text-muted font-mono">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-text-muted">HTML Render Sandbox</span>
                </div>
                <span className="text-[10px] text-text-muted">Safe Isolation</span>
              </div>

              <div className="bg-white min-h-[260px]">
                <iframe
                  title="Rendered Email Preview"
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; padding: 24px; margin: 0; } img { max-width: 100%; height: auto; } a { color: #6366f1; text-decoration: underline; } table { border-collapse: collapse; } hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }</style></head><body>${current.html || '<p style="color: #94a3b8; font-style: italic;">Empty email body</p>'}</body></html>`}
                  sandbox=""
                  className="w-full h-80 border-0 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="px-6 py-4 border-t border-border-subtle bg-surface-raised flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-text-muted flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              {isDryRun ? (
                <span className="text-amber-500 font-medium">
                  Dry-Run Mode active: emails will simulate delivery without hitting the inbox.
                </span>
              ) : (
                <span>Rate-limiting protection enabled: 500ms delay between dispatches.</span>
              )}
            </div>

            <div className="flex items-center space-x-2.5 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-foreground rounded-control border border-border bg-surface hover:bg-surface-muted transition cursor-pointer"
              >
                Back to Edit
              </button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                disabled={isSending || previews.length === 0}
                onClick={onConfirmSend}
                className={`px-5 py-2 text-xs font-semibold rounded-control text-white shadow-resting flex items-center space-x-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDryRun
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-accent hover:opacity-95 text-accent-foreground'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isDryRun
                    ? `Simulate Delivery (${previews.length})`
                    : `Send Campaign (${previews.length} Emails)`}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
