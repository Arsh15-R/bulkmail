import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import {
  Clock,
  RotateCcw,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MousePointerClick,
  MailCheck,
  ChevronRight,
  X,
  ExternalLink,
  ChevronLeft,
  Activity,
  Layers,
  Sparkles,
  BarChart3,
  Trash2,
  Check
} from 'lucide-react';

export const History = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail Modal / Drawer
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignRecipients, setCampaignRecipients] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.history.list({ page, limit: 20 });
      if (res.success) {
        setCampaigns(res.campaigns || []);
        setPagination(res.pagination || { page: 1, total: 0, totalPages: 1 });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, []);

  const handleOpenDetail = async (camp) => {
    setSelectedCampaign(camp);
    setIsDetailOpen(true);
    setLoadingDetails(true);

    try {
      const res = await api.history.get(camp.id);
      if (res.success) {
        setSelectedCampaign(res.campaign);
        setCampaignRecipients(res.recipients || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRetryFailed = async (campId) => {
    try {
      const res = await api.history.retryFailed(campId);
      if (res.success) {
        showToast(res.message);
        setIsDetailOpen(false);
        loadHistory(1);
      }
    } catch (err) {
      showToast(`Retry failed: ${err.message}`, 'error');
    }
  };

  const handleExportCsv = (campId) => {
    const url = api.history.exportCsvUrl(campId);
    window.open(url, '_blank');
    showToast('Downloading campaign CSV export...');
  };

  const handleDeleteCampaign = async (campaignId) => {
    setIsDeleting(true);
    try {
      const res = await api.history.delete(campaignId);
      if (res.success) {
        showToast('Mail campaign deleted successfully.');
        setDeleteConfirm(null);
        if (selectedCampaign && selectedCampaign.id === campaignId) {
          setIsDetailOpen(false);
          setSelectedCampaign(null);
        }
        setSelectedIds(prev => prev.filter(id => id !== campaignId));
        window.dispatchEvent(new Event('bm_quota_updated'));
        loadHistory(pagination.page);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete campaign.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await api.history.bulkDelete(selectedIds);
      if (res.success) {
        showToast(`Deleted ${selectedIds.length} mail campaign(s).`);
        setDeleteConfirm(null);
        setSelectedIds([]);
        window.dispatchEvent(new Event('bm_quota_updated'));
        loadHistory(1);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete campaigns.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteRecipient = async (recipientId) => {
    setIsDeleting(true);
    try {
      const res = await api.history.deleteRecipient(recipientId);
      if (res.success) {
        showToast('Recipient mail record deleted.');
        setDeleteConfirm(null);
        setCampaignRecipients(prev => prev.filter(r => r.id !== recipientId));
        if (selectedCampaign) {
          const updated = await api.history.get(selectedCampaign.id);
          if (updated.success) {
            setSelectedCampaign(updated.campaign);
          }
        }
        window.dispatchEvent(new Event('bm_quota_updated'));
        loadHistory(pagination.page);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete recipient.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (campaigns.length === 0) return;
    if (selectedIds.length === campaigns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(campaigns.map(c => c.id));
    }
  };

  const toggleSelectOne = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
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
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-base font-display font-bold text-foreground tracking-tight">
              Campaign History & Telemetry
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Complete audit trail of all email dispatches with real-time open rates, click tracking, and 1-click retry.
          </p>
        </div>

        <button
          onClick={() => loadHistory(pagination.page)}
          className="px-3.5 py-2 rounded-control text-xs font-semibold bg-surface-muted hover:bg-surface text-foreground border border-border flex items-center space-x-1.5 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-surface-raised border border-border px-4 py-2.5 rounded-panel flex items-center justify-between shadow-xs">
          <div className="text-xs font-semibold text-foreground flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>
              {selectedIds.length} mail campaign{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 text-xs text-text-muted hover:text-foreground transition cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setDeleteConfirm({ type: 'bulk', count: selectedIds.length })}
              className="px-3 py-1.5 rounded-control text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Campaign Logs Table */}
      <div className="bg-surface rounded-panel border border-border overflow-hidden shadow-resting">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted border-b border-border text-text-muted font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all campaigns"
                    checked={campaigns.length > 0 && selectedIds.length === campaigns.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-accent focus:ring-accent cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Campaign Title & Subject</th>
                <th className="p-3.5">Mode</th>
                <th className="p-3.5">Delivery Stats</th>
                <th className="p-3.5">Engagement</th>
                <th className="p-3.5">Dispatched At</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-text-muted italic">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-pill animate-spin" />
                      <span className="text-xs">Loading campaign audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-text-muted space-y-3">
                    <div className="w-12 h-12 rounded-pill bg-surface-muted border border-border flex items-center justify-center mx-auto text-text-muted">
                      <Clock className="w-6 h-6 opacity-40" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">No Campaigns Dispatched Yet</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        Your sent emails, simulations, and telemetry reports will appear here automatically.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => {
                  const sentRate = camp.total_recipients > 0 ? Math.round((camp.sent_count / camp.total_recipients) * 100) : 0;
                  const openRate = camp.sent_count > 0 ? Math.round((camp.open_count / camp.sent_count) * 100) : 0;
                  const isSelected = selectedIds.includes(camp.id);
                  return (
                    <tr
                      key={camp.id}
                      onClick={() => handleOpenDetail(camp)}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-accent-subtle/30 hover:bg-accent-subtle/50' : 'hover:bg-surface-muted/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select campaign ${camp.id}`}
                          checked={isSelected}
                          onChange={(e) => toggleSelectOne(camp.id, e)}
                          className="rounded border-border text-accent focus:ring-accent cursor-pointer"
                        />
                      </td>

                      {/* Campaign Title & Subject */}
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground text-xs flex items-center space-x-1.5">
                          <span className="truncate max-w-[220px]">{camp.title || `Campaign #${camp.id}`}</span>
                          {camp.is_dry_run === 1 && (
                            <span className="px-1.5 py-0.5 rounded-pill text-[9px] font-mono font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              SIM
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted truncate max-w-[240px] mt-0.5">
                          {camp.subject || '<No Subject>'}
                        </div>
                      </td>

                      {/* Mode */}
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-pill bg-surface-muted border border-border text-text-secondary text-[10px] font-mono capitalize">
                          {camp.sending_mode}
                        </span>
                      </td>

                      {/* Delivery Stats */}
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="text-emerald-500 font-semibold">{camp.sent_count} sent</span>
                          <span className="text-text-muted">/</span>
                          <span className="text-text-muted">{camp.total_recipients} total</span>
                        </div>
                        {camp.failed_count > 0 && (
                          <div className="text-rose-500 text-[10px] font-semibold mt-0.5">
                            {camp.failed_count} failed
                          </div>
                        )}
                      </td>

                      {/* Engagement Metrics */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3 text-[11px] font-mono">
                          <span className="inline-flex items-center text-accent" title="Unique Opens">
                            <Eye className="w-3 h-3 mr-1" />
                            {camp.open_count} ({openRate}%)
                          </span>
                          <span className="inline-flex items-center text-text-secondary" title="Unique Clicks">
                            <MousePointerClick className="w-3 h-3 mr-1" />
                            {camp.click_count}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-3.5 text-text-muted font-mono text-[11px]">
                        {new Date(camp.created_at).toLocaleDateString()} {new Date(camp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleExportCsv(camp.id)}
                            title="Export to CSV"
                            className="p-1.5 rounded-control text-text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'single', campaign: camp })}
                            title="Delete Mail Record"
                            className="p-1.5 rounded-control text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDetail(camp)}
                            title="View Full Report"
                            className="p-1.5 rounded-control text-text-muted hover:text-accent hover:bg-surface-muted transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border bg-surface-muted flex items-center justify-between text-xs text-text-muted">
            <span className="font-mono">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} campaigns total)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadHistory(pagination.page - 1)}
                className="p-1 rounded-control border border-border bg-surface hover:bg-surface-muted text-foreground disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadHistory(pagination.page + 1)}
                className="p-1 rounded-control border border-border bg-surface hover:bg-surface-muted text-foreground disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Detail Drawer / Modal */}
      <AnimatePresence>
        {isDetailOpen && selectedCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="fixed inset-0 bg-neutral-11/60 dark:bg-black/75 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: "spring", stiffness: 480, damping: 36 }}
              className="relative bg-surface rounded-panel border border-border shadow-floating max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden z-10"
            >
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between shrink-0">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
                      {selectedCampaign.title || `Campaign #${selectedCampaign.id}`}
                    </h3>
                    {selectedCampaign.is_dry_run === 1 && (
                      <span className="px-2 py-0.5 rounded-pill text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Dry-Run Simulation
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted truncate max-w-lg">
                    Subject: {selectedCampaign.subject || '<No Subject>'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExportCsv(selectedCampaign.id)}
                    className="px-3 py-1.5 rounded-control text-xs font-semibold bg-surface-muted hover:bg-surface text-foreground border border-border flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-text-muted" />
                    <span>CSV Export</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirm({ type: 'single', campaign: selectedCampaign })}
                    className="px-3 py-1.5 rounded-control text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Mail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDetailOpen(false)}
                    className="p-1 rounded-control text-text-muted hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-surface-raised rounded-control border border-border shadow-xs text-center">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-text-muted">Total Batch</div>
                    <div className="text-base font-bold text-foreground font-mono mt-0.5">
                      {selectedCampaign.total_recipients}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-500/10 rounded-control border border-emerald-500/20 shadow-xs text-center">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-500 font-semibold">Delivered</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      {selectedCampaign.sent_count}
                    </div>
                  </div>

                  <div className="p-3 bg-accent-subtle rounded-control border border-accent/20 shadow-xs text-center">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-accent font-semibold">Unique Opens</div>
                    <div className="text-base font-bold text-accent font-mono mt-0.5">
                      {selectedCampaign.open_count}
                    </div>
                  </div>

                  <div className="p-3 bg-purple-500/10 rounded-control border border-purple-500/20 shadow-xs text-center">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-purple-400 font-semibold">Link Clicks</div>
                    <div className="text-base font-bold text-purple-500 dark:text-purple-300 font-mono mt-0.5">
                      {selectedCampaign.click_count}
                    </div>
                  </div>
                </div>

                {/* Retry Failed Button if any failures */}
                {selectedCampaign.failed_count > 0 && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-control flex items-center justify-between">
                    <div className="text-xs text-rose-500">
                      <strong className="font-semibold">{selectedCampaign.failed_count}</strong> email dispatches failed or bounced during this campaign.
                    </div>
                    <button
                      onClick={() => handleRetryFailed(selectedCampaign.id)}
                      className="px-3 py-1.5 rounded-control text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry Failed ({selectedCampaign.failed_count})</span>
                    </button>
                  </div>
                )}

                {/* Per-Recipient Breakdown Table */}
                <div className="space-y-2">
                  <h4 className="font-mono text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    Recipient Breakdown ({campaignRecipients.length})
                  </h4>

                  <div className="border border-border rounded-control overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-surface-muted text-text-muted border-b border-border text-[10px] uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="p-2.5">Recipient</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Opened</th>
                            <th className="p-2.5">Clicks</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle bg-surface text-[11px]">
                          {loadingDetails ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-text-muted italic">
                                Loading recipient details...
                              </td>
                            </tr>
                          ) : campaignRecipients.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-text-muted italic">
                                No recipient audit logs recorded.
                              </td>
                            </tr>
                          ) : (
                            campaignRecipients.map((rec) => (
                              <tr key={rec.id} className="hover:bg-surface-muted/40">
                                <td className="p-2.5 text-foreground truncate max-w-[200px]">
                                  {rec.email}
                                </td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-pill text-[10px] font-semibold uppercase ${
                                      rec.status === 'sent'
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        : rec.status === 'failed' || rec.status === 'bounced'
                                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    }`}
                                    title={rec.error_message || ''}
                                  >
                                    {rec.status}
                                  </span>
                                </td>
                                <td className="p-2.5 text-text-secondary">
                                  {rec.opened_at ? (
                                    <span className="text-accent flex items-center">
                                      <Check className="w-3 h-3 mr-1" />
                                      {new Date(rec.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  ) : (
                                    <span className="text-text-muted">—</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-text-secondary">
                                  {rec.clicked_at ? (
                                    <span className="text-purple-400 flex items-center">
                                      <MousePointerClick className="w-3 h-3 mr-1" />
                                      {rec.click_count || 1}
                                    </span>
                                  ) : (
                                    <span className="text-text-muted">—</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right">
                                  <button
                                    onClick={() => setDeleteConfirm({ type: 'recipient', recipient: rec })}
                                    title="Delete recipient record"
                                    className="p-1 rounded text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-3.5 border-t border-border-subtle bg-surface-raised flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="px-4 py-2 rounded-control bg-surface border border-border hover:bg-surface-muted text-xs font-semibold text-foreground transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteConfirm(null)}
              className="fixed inset-0 bg-neutral-11/60 dark:bg-black/75 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-surface rounded-panel border border-border shadow-floating max-w-md w-full p-6 space-y-4 z-10"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-pill bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm">
                    {deleteConfirm.type === 'bulk'
                      ? `Delete ${deleteConfirm.count} Mail Campaigns?`
                      : deleteConfirm.type === 'recipient'
                      ? 'Delete Recipient Mail Record?'
                      : 'Delete Mail Campaign?'}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    This action cannot be undone. All telemetry, logs, and recipient data will be permanently removed.
                  </p>
                </div>
              </div>

              {deleteConfirm.type === 'single' && deleteConfirm.campaign && (
                <div className="p-3 bg-surface-muted rounded-control border border-border-subtle text-xs space-y-1">
                  <div className="font-semibold text-foreground truncate">
                    {deleteConfirm.campaign.title || `Campaign #${deleteConfirm.campaign.id}`}
                  </div>
                  <div className="text-text-muted truncate">
                    Subject: {deleteConfirm.campaign.subject || '<No Subject>'}
                  </div>
                </div>
              )}

              {deleteConfirm.type === 'recipient' && deleteConfirm.recipient && (
                <div className="p-3 bg-surface-muted rounded-control border border-border-subtle text-xs space-y-1">
                  <div className="font-semibold text-foreground truncate">
                    {deleteConfirm.recipient.email}
                  </div>
                  <div className="text-text-muted truncate">
                    Status: {deleteConfirm.recipient.status}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3.5 py-2 rounded-control text-xs font-semibold bg-surface-muted hover:bg-surface text-foreground border border-border transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    if (deleteConfirm.type === 'single') {
                      handleDeleteCampaign(deleteConfirm.campaign.id);
                    } else if (deleteConfirm.type === 'bulk') {
                      handleBulkDelete();
                    } else if (deleteConfirm.type === 'recipient') {
                      handleDeleteRecipient(deleteConfirm.recipient.id);
                    }
                  }}
                  className="px-3.5 py-2 rounded-control text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-pill animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
