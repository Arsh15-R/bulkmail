import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import {
  Calendar,
  Clock,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  X,
  Play,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const Scheduled = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit RunAt Modal
  const [editingJob, setEditingJob] = useState(null);
  const [newRunAt, setNewRunAt] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.schedule.list();
      if (res.success) {
        setSchedules(res.schedules || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleOpenEdit = (job) => {
    setEditingJob(job);
    setNewRunAt(new Date(job.run_at).toISOString().slice(0, 16));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!newRunAt) return;

    try {
      const res = await api.schedule.update(editingJob.id, newRunAt);
      if (res.success) {
        showToast('Scheduled execution time updated.');
        setEditingJob(null);
        loadSchedules();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCancelJob = async (id) => {
    if (!confirm('Are you sure you want to cancel this scheduled email dispatch?')) return;

    try {
      const res = await api.schedule.cancel(id);
      if (res.success) {
        showToast('Scheduled job cancelled.');
        loadSchedules();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-5">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-panel border border-border shadow-resting">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-control bg-accent-subtle text-accent flex items-center justify-center shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-base font-display font-bold text-foreground tracking-tight">
              Scheduled Dispatches
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Automated email queues managed by the persistent background scheduler.
          </p>
        </div>

        <button
          onClick={loadSchedules}
          className="px-3.5 py-2 rounded-control text-xs font-semibold bg-surface-muted hover:bg-surface text-foreground border border-border flex items-center space-x-1.5 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Schedules Table */}
      <div className="bg-surface rounded-panel border border-border overflow-hidden shadow-resting">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted border-b border-border text-text-muted font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Job ID & Campaign</th>
                <th className="p-3.5">Recipients</th>
                <th className="p-3.5">Scheduled Launch Time</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-text-muted italic">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-pill animate-spin" />
                      <span className="text-xs">Loading scheduled jobs...</span>
                    </div>
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-text-muted space-y-3">
                    <div className="w-12 h-12 rounded-pill bg-surface-muted border border-border flex items-center justify-center mx-auto text-text-muted">
                      <Calendar className="w-6 h-6 opacity-40" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">No Pending Scheduled Dispatches</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        To schedule a campaign, toggle "Schedule for Later" on the Compose page.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                schedules.map((job) => {
                  const runDate = new Date(job.run_at);
                  const isPast = runDate < new Date();
                  return (
                    <tr key={job.id} className="transition-colors hover:bg-surface-muted/50">
                      {/* Job ID & Subject */}
                      <td className="p-3.5">
                        <div className="font-mono font-semibold text-foreground text-xs">
                          Job #{job.id} • {job.campaign_title || 'Untitled Campaign'}
                        </div>
                        <div className="text-[11px] text-text-muted truncate max-w-[240px] mt-0.5">
                          {job.subject || '<No Subject>'}
                        </div>
                      </td>

                      {/* Recipients Count */}
                      <td className="p-3.5 font-mono text-text-secondary">
                        <span className="font-bold text-foreground">{job.total_recipients || 1}</span> recipients
                      </td>

                      {/* Scheduled Time */}
                      <td className="p-3.5 font-mono text-[11px]">
                        <div className="text-foreground font-medium">
                          {runDate.toLocaleDateString()} at {runDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isPast ? 'text-text-muted' : 'text-accent font-semibold'}`}>
                          {isPast ? 'Trigger time passed' : 'Upcoming dispatch'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {job.status === 'scheduled' ? (
                          <span className="px-2.5 py-0.5 rounded-pill bg-accent-subtle text-accent border border-accent/20 font-semibold text-[10px] inline-flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent mr-1.5 animate-pulse" />
                            Queued
                          </span>
                        ) : job.status === 'running' ? (
                          <span className="px-2.5 py-0.5 rounded-pill bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold text-[10px] inline-flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-ping" />
                            Running
                          </span>
                        ) : job.status === 'completed' ? (
                          <span className="px-2.5 py-0.5 rounded-pill bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold text-[10px] inline-flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Completed
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-pill bg-rose-500/10 text-rose-500 border border-rose-500/20 font-semibold text-[10px] inline-flex items-center">
                            Cancelled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right space-x-1">
                        {job.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(job)}
                              title="Reschedule launch time"
                              className="p-1.5 rounded-control text-text-muted hover:text-accent hover:bg-surface-muted transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancelJob(job.id)}
                              title="Cancel scheduled dispatch"
                              className="p-1.5 rounded-control text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Scheduled Time Modal */}
      <AnimatePresence>
        {editingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingJob(null)}
              className="fixed inset-0 bg-neutral-11/60 dark:bg-black/75 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: "spring", stiffness: 480, damping: 36 }}
              className="relative bg-surface rounded-panel border border-border shadow-floating max-w-md w-full overflow-hidden z-10"
            >
              <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
                  Reschedule Dispatch (Job #{editingJob.id})
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="p-1 rounded-control text-text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    New Date & Time (Local Timezone)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newRunAt}
                    onChange={(e) => setNewRunAt(e.target.value)}
                    className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingJob(null)}
                    className="px-4 py-2 rounded-control border border-border bg-surface hover:bg-surface-muted text-text-secondary hover:text-foreground font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="px-4 py-2 rounded-control bg-accent text-accent-foreground hover:opacity-95 font-semibold shadow-resting cursor-pointer"
                  >
                    Update Time
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
