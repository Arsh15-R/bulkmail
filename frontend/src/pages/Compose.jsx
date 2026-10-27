import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RichEditor } from '../components/RichEditor';
import { CsvMapperModal } from '../components/CsvMapperModal';
import { ListCleanupModal } from '../components/ListCleanupModal';
import { PreviewModal } from '../components/PreviewModal';
import { SendProgressModal } from '../components/SendProgressModal';
import {
  Send,
  Eye,
  Sparkles,
  Paperclip,
  Calendar,
  Clock,
  Save,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Users,
  User,
  Sliders,
  X,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  FileText,
  MailCheck,
  Check,
  Zap,
  Info
} from 'lucide-react';

export const Compose = ({ onNavigateToHistory }) => {
  const { user, refreshUser } = useAuth();

  // Mode: 'same', 'single', 'merge', 'custom'
  const [mode, setMode] = useState('same');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');

  // Mode 1: Same email to many
  const [pastedRecipients, setPastedRecipients] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [availableGroups, setAvailableGroups] = useState([]);
  const [isRawRecipientsOpen, setIsRawRecipientsOpen] = useState(false);

  // Mode 2: Single email
  const [singleRecipient, setSingleRecipient] = useState('');

  // Mode 3: Mail merge
  const [mergeRecipients, setMergeRecipients] = useState([]);
  const [mergePlaceholders, setMergePlaceholders] = useState(['name', 'email', 'order_id']);

  // Mode 4: Custom per-recipient table
  const [customRows, setCustomRows] = useState([
    { email: '', name: '', subject: '', body_html: '', cc: '', bcc: '', replyTo: '', attachmentName: '' }
  ]);

  // Global Settings & Overrides
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [showAdvancedHeaders, setShowAdvancedHeaders] = useState(false);

  // Attachments
  const [globalAttachments, setGlobalAttachments] = useState([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Toggles
  const [isDryRun, setIsDryRun] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Templates
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Modals
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [cleanupStats, setCleanupStats] = useState(null);
  const [cleanupDetails, setCleanupDetails] = useState(null);
  const [cleanListCache, setCleanListCache] = useState(null);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [previews, setPreviews] = useState([]);

  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeCampaignTotal, setActiveCampaignTotal] = useState(0);

  // Autosave and Notification status
  const [autosaveStatus, setAutosaveStatus] = useState('saved');
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [toast, setToast] = useState(null);
  const isDirty = useRef(false);
  const isResettingRef = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Groups and Templates on mount
  useEffect(() => {
    loadGroupsAndTemplates();
    loadDraft();
  }, []);

  const loadGroupsAndTemplates = async () => {
    try {
      const [groupsData, tplsData] = await Promise.all([
        api.groups.list(),
        api.templates.list()
      ]);
      if (groupsData.success) setAvailableGroups(groupsData.groups || []);
      if (tplsData.success) setSavedTemplates(tplsData.templates || []);
    } catch (err) {
      console.warn('Failed to load groups/templates:', err.message);
    }
  };

  // Autosave Draft every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (isDirty.current && !isResettingRef.current) {
        saveDraft();
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [mode, title, subject, bodyHtml, bodyText, pastedRecipients, singleRecipient, mergeRecipients, customRows, cc, bcc, replyTo, globalAttachments]);

  const markDirty = () => {
    if (isResettingRef.current) return;
    isDirty.current = true;
    setAutosaveStatus('unsaved');
  };

  const isFormEmpty = (state) => {
    if (!state) return true;
    const hasSubject = Boolean(state.subject && state.subject.trim());
    const hasTitle = Boolean(state.title && state.title.trim());
    const cleanHtml = (state.bodyHtml || '')
      .replace(/<p><br\s*\/?><\/p>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    const hasBody = Boolean(cleanHtml || (state.bodyText && state.bodyText.trim()));
    const hasRecipients = Boolean(
      (state.pastedRecipients && state.pastedRecipients.trim()) ||
      (state.singleRecipient && state.singleRecipient.trim()) ||
      (state.mergeRecipients && state.mergeRecipients.length > 0) ||
      (state.customRows && state.customRows.some(r => (r.email && r.email.trim()) || (r.subject && r.subject.trim())))
    );
    return !hasSubject && !hasTitle && !hasBody && !hasRecipients;
  };

  const saveDraft = async () => {
    if (isResettingRef.current) return;
    try {
      const state = {
        mode,
        title,
        subject,
        bodyHtml,
        bodyText,
        pastedRecipients,
        singleRecipient,
        mergeRecipients,
        customRows,
        cc,
        bcc,
        replyTo
      };

      if (isFormEmpty(state)) {
        isDirty.current = false;
        setAutosaveStatus('saved');
        return;
      }

      localStorage.setItem('bm_draft', JSON.stringify(state));
      await api.drafts.save(state);
      isDirty.current = false;
      setAutosaveStatus('saved');
    } catch (err) {
      console.warn('Draft save error:', err);
    }
  };

  const loadDraft = async () => {
    try {
      let draftState = null;
      const local = localStorage.getItem('bm_draft');
      if (local) {
        draftState = JSON.parse(local);
      } else {
        const res = await api.drafts.get();
        if (res.success && res.draft?.state) {
          draftState = res.draft.state;
        }
      }

      if (draftState && !isFormEmpty(draftState)) {
        if (draftState.mode) setMode(draftState.mode);
        if (draftState.title) setTitle(draftState.title);
        if (draftState.subject) setSubject(draftState.subject);
        if (draftState.bodyHtml !== undefined) setBodyHtml(draftState.bodyHtml);
        if (draftState.bodyText !== undefined) setBodyText(draftState.bodyText);
        if (draftState.pastedRecipients !== undefined) setPastedRecipients(draftState.pastedRecipients);
        if (draftState.singleRecipient !== undefined) setSingleRecipient(draftState.singleRecipient);
        if (draftState.mergeRecipients !== undefined) setMergeRecipients(draftState.mergeRecipients);
        if (draftState.customRows !== undefined) setCustomRows(draftState.customRows);
        if (draftState.cc !== undefined) setCc(draftState.cc);
        if (draftState.bcc !== undefined) setBcc(draftState.bcc);
        if (draftState.replyTo !== undefined) setReplyTo(draftState.replyTo);
        setHasRestoredDraft(true);
      } else {
        setHasRestoredDraft(false);
      }
    } catch (err) {
      console.warn('Error restoring draft:', err);
    }
  };

  const resetCompose = async ({ showNotification = false } = {}) => {
    isResettingRef.current = true;
    isDirty.current = false;

    localStorage.removeItem('bm_draft');
    try {
      await api.drafts.delete();
    } catch (err) {
      console.warn('Failed to delete draft from backend:', err);
    }

    setMode('same');
    setTitle('');
    setSubject('');
    setBodyHtml('');
    setBodyText('');
    setPastedRecipients('');
    setSelectedGroupId('');
    setSingleRecipient('');
    setMergeRecipients([]);
    setCustomRows([{ email: '', name: '', subject: '', body_html: '', cc: '', bcc: '', replyTo: '', attachmentName: '' }]);
    setCc('');
    setBcc('');
    setReplyTo('');
    setShowAdvancedHeaders(false);
    setGlobalAttachments([]);
    setSelectedTemplateId('');
    setScheduledAt('');
    setIsScheduling(false);
    setCleanListCache(null);
    setCleanupStats(null);
    setCleanupDetails(null);

    setHasRestoredDraft(false);
    setAutosaveStatus('saved');

    if (showNotification) {
      showToast('Draft discarded.', 'info');
    }

    setTimeout(() => {
      isResettingRef.current = false;
      isDirty.current = false;
    }, 300);
  };

  // Template selection
  const handleTemplateChange = (e) => {
    const tplId = e.target.value;
    setSelectedTemplateId(tplId);
    if (!tplId) return;

    const tpl = savedTemplates.find(t => String(t.id) === String(tplId));
    if (tpl) {
      if (tpl.subject) setSubject(tpl.subject);
      if (tpl.body_html) setBodyHtml(tpl.body_html);
      if (tpl.body_text) setBodyText(tpl.body_text);
      markDirty();
      showToast(`Loaded template: "${tpl.name}"`);
    }
  };

  // Save as template
  const handleSaveAsTemplate = async () => {
    const name = prompt('Enter a name for this new template:');
    if (!name || name.trim().length === 0) return;

    try {
      const res = await api.templates.create({
        name: name.trim(),
        subject,
        body_html: bodyHtml,
        body_text: bodyText
      });
      if (res.success) {
        setSavedTemplates(prev => [res.template, ...prev]);
        setSelectedTemplateId(res.template.id);
        showToast(`Template "${name}" saved!`);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Group selection
  const handleGroupSelect = async (groupId) => {
    setSelectedGroupId(groupId);
    if (!groupId) return;

    try {
      const res = await api.groups.get(groupId);
      if (res.success && res.group?.members) {
        const emails = res.group.members.map(m => m.email).join(', ');
        setPastedRecipients(prev => (prev ? `${prev}, ${emails}` : emails));
        markDirty();
        showToast(`Added ${res.group.members.length} contacts from "${res.group.name}".`);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // File Upload Handling
  const uploadFilesList = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploadingFiles(true);
    try {
      const res = await api.upload.files(files);
      if (res.success && res.files) {
        setGlobalAttachments(prev => [...prev, ...res.files]);
        showToast(`Uploaded ${res.files.length} attachment(s).`);
      }
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const handleFileUpload = (e) => {
    uploadFilesList(Array.from(e.target.files));
  };

  const removeGlobalAttachment = (index) => {
    setGlobalAttachments(prev => prev.filter((_, i) => i !== index));
    markDirty();
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
  };

  const handleDropFiles = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    if (e.dataTransfer?.files?.length > 0) {
      uploadFilesList(Array.from(e.dataTransfer.files));
    }
  };

  // Build recipients list based on mode
  const getRawRecipients = () => {
    if (mode === 'single') {
      return singleRecipient.trim() ? [{ email: singleRecipient.trim(), name: '' }] : [];
    }

    if (mode === 'same') {
      const raw = pastedRecipients
        .split(/[\n,;]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0);
      return raw.map(email => ({ email, name: '' }));
    }

    if (mode === 'merge') {
      return mergeRecipients;
    }

    if (mode === 'custom') {
      return customRows.filter(r => r.email && r.email.trim().length > 0);
    }

    return [];
  };

  // Parse email list for chip display
  const parsedEmailChips = pastedRecipients
    .split(/[\n,;]+/)
    .map(e => e.trim())
    .filter(e => e.length > 0);

  const removeEmailChip = (chipToRemove) => {
    const updated = parsedEmailChips.filter(e => e !== chipToRemove);
    setPastedRecipients(updated.join(', '));
    markDirty();
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // List Cleanup trigger
  const handleListCleanup = async () => {
    const raw = getRawRecipients();
    if (raw.length === 0) {
      showToast('No recipients to clean.', 'error');
      return;
    }

    try {
      const res = await api.send.cleanup(raw);
      if (res.success) {
        setCleanupStats(res.stats);
        setCleanupDetails(res.details);
        setCleanListCache(res.cleanList);
        setIsCleanupModalOpen(true);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const applyCleanList = () => {
    if (!cleanListCache) return;

    if (mode === 'same') {
      const cleanEmails = cleanListCache.map(r => (typeof r === 'string' ? r : r.email)).join(', ');
      setPastedRecipients(cleanEmails);
    } else if (mode === 'merge') {
      setMergeRecipients(cleanListCache);
    } else if (mode === 'custom') {
      setCustomRows(cleanListCache);
    }
    markDirty();
    showToast(`List updated: now ${cleanListCache.length} clean recipients.`);
  };

  // Test Email
  const handleSendTestToMe = async () => {
    if (!subject) {
      showToast('Please enter a Subject before sending a test.', 'error');
      return;
    }

    try {
      const res = await api.send.sendTest({
        subject,
        body_html: bodyHtml,
        body_text: bodyText
      });
      if (res.success) {
        showToast(res.message);
        if (refreshUser) refreshUser();
        window.dispatchEvent(new Event('bm_quota_updated'));
      }
    } catch (err) {
      showToast(`Test failed: ${err.message}`, 'error');
    }
  };

  // Preview & Send Flow
  const handleOpenPreview = async () => {
    const raw = getRawRecipients();
    if (raw.length === 0) {
      showToast('Please specify at least one recipient address.', 'error');
      return;
    }

    if (!subject && mode !== 'custom') {
      showToast('Please provide an email Subject line.', 'error');
      return;
    }

    try {
      const payload = {
        mode,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        recipients: raw,
        cc,
        bcc,
        replyTo,
        attachments: globalAttachments
      };

      const res = await api.send.preview(payload);
      if (res.success) {
        setPreviewSummary(res.summary);
        setPreviews(res.previews || []);
        setIsPreviewModalOpen(true);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Final Dispatch
  const handleConfirmSend = async () => {
    setIsPreviewModalOpen(false);
    const raw = getRawRecipients();

    const payload = {
      title: title || `${subject || 'Campaign'} - ${new Date().toLocaleDateString()}`,
      mode,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      recipients: raw,
      isDryRun,
      trackingEnabled,
      delayMs: 500,
      settings: {
        cc,
        bcc,
        replyTo,
        attachments: globalAttachments
      }
    };

    try {
      if (isScheduling && scheduledAt) {
        const schedRes = await api.schedule.create({
          ...payload,
          runAt: scheduledAt
        });
        if (schedRes.success) {
          showToast(`Campaign scheduled successfully for ${new Date(scheduledAt).toLocaleString()}`);
          await resetCompose();
          if (onNavigateToHistory) onNavigateToHistory('scheduled');
        }
      } else {
        const sendRes = await api.send.sendNow(payload);
        if (sendRes.success && sendRes.campaignId) {
          await resetCompose();
          setActiveCampaignId(sendRes.campaignId);
          setActiveCampaignTotal(raw.length);
          setIsProgressModalOpen(true);
        }
      }
    } catch (err) {
      showToast(`Failed to launch campaign: ${err.message}`, 'error');
    }
  };

  // Custom row controls
  const addCustomRow = () => {
    setCustomRows(prev => [
      ...prev,
      { email: '', name: '', subject: subject || '', body_html: bodyHtml || '', cc: '', bcc: '', replyTo: '', attachmentName: '' }
    ]);
    markDirty();
  };

  const removeCustomRow = (index) => {
    setCustomRows(prev => prev.filter((_, i) => i !== index));
    markDirty();
  };

  const updateCustomRow = (index, field, val) => {
    setCustomRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
    markDirty();
  };

  const rawRecipientsList = getRawRecipients();
  const recipientCount = rawRecipientsList.length;

  return (
    <div className="space-y-6 pb-28">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-20 right-6 z-50 px-4 py-2.5 rounded-control shadow-floating border text-xs font-semibold flex items-center space-x-2 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-danger/10 text-danger border-danger/25'
              : toast.type === 'info'
              ? 'bg-accent-subtle text-accent-strong border-accent/20'
              : 'bg-success/10 text-success border-success/25'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Restored Draft Banner */}
      <AnimatePresence>
        {hasRestoredDraft && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-accent-subtle/80 border border-accent/20 rounded-panel flex items-center justify-between text-xs text-accent-strong shadow-xs"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <span className="font-medium">
                Restored your previous unsaved draft session.
              </span>
            </div>
            <button
              type="button"
              onClick={() => resetCompose({ showNotification: true })}
              className="font-semibold text-danger hover:underline flex items-center space-x-1 px-2 py-1 rounded-control hover:bg-danger/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard Draft</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Context Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground tracking-tight">
            Dispatch Campaign
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Select a dispatch mode, personalize content with placeholders, and queue delivery.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Autosave status indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-pill bg-surface-muted border border-border-subtle text-[11px] text-text-muted">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autosaveStatus === 'saved' ? 'bg-success' : 'bg-warning animate-pulse'
              }`}
            />
            <span className="capitalize">{autosaveStatus === 'saved' ? 'Draft saved' : 'Unsaved changes'}</span>
          </div>
        </div>
      </div>

      {/* Mode Selector Cards (Animated Active Pill) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            id: 'same',
            label: 'Same to Many',
            desc: 'Broadcast one email to multiple addresses or contacts',
            icon: Users
          },
          {
            id: 'single',
            label: 'Single Recipient',
            desc: 'Direct 1-on-1 dispatch with real-time validation',
            icon: User
          },
          {
            id: 'merge',
            label: 'Mail Merge (CSV)',
            desc: 'Dynamic rows with {{placeholder}} variable mapping',
            icon: FileSpreadsheet
          },
          {
            id: 'custom',
            label: 'Custom Table',
            desc: 'Per-row custom To, Subject, Body, CC & File',
            icon: Sliders
          }
        ].map((tab) => {
          const isSelected = mode === tab.id;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id);
                markDirty();
              }}
              className={`relative p-3.5 text-left rounded-panel border transition-all duration-200 outline-none group ${
                isSelected
                  ? 'border-accent bg-accent-subtle/40 shadow-xs'
                  : 'bg-surface border-border hover:border-border-strong hover:bg-surface-muted/40'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="active-mode-card-ring"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  className="absolute inset-0 rounded-panel ring-2 ring-accent/30 pointer-events-none"
                />
              )}
              <div className="flex items-start justify-between">
                <div
                  className={`w-7 h-7 rounded-control flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-accent text-accent-foreground shadow-xs'
                      : 'bg-surface-muted text-text-muted group-hover:text-foreground'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-accent" />
                )}
              </div>
              <div className="mt-2.5 font-display font-semibold text-xs text-foreground tracking-tight">
                {tab.label}
              </div>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                {tab.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Form Surfaces */}
      <div className="bg-surface rounded-panel border border-border p-5 sm:p-6 shadow-resting space-y-6">
        {/* Row 1: Campaign Internal Title & Template Picker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Campaign Title <span className="text-text-muted font-normal">(Internal Reference)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              placeholder="e.g. Monthly Newsletter - October 2026"
              className="w-full text-xs rounded-control border border-border bg-surface-muted/40 px-3 py-2.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-surface transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground">
                Load Saved Template
              </label>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                className="text-[11px] font-semibold text-accent hover:underline flex items-center space-x-1"
              >
                <Save className="w-3 h-3" />
                <span>Save as Template</span>
              </button>
            </div>
            <select
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              className="w-full text-xs rounded-control border border-border bg-surface-muted/40 px-3 py-2.5 text-foreground focus:outline-none focus:border-accent focus:bg-surface transition-colors cursor-pointer"
            >
              <option value="">-- Choose from saved templates --</option>
              {savedTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recipients Input Section Depending on Mode */}
        {mode === 'single' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Recipient Email Address <span className="text-danger">*</span>
              </label>
              {singleRecipient && (
                <span
                  className={`text-[11px] font-mono flex items-center space-x-1 ${
                    emailRegex.test(singleRecipient.trim())
                      ? 'text-success'
                      : 'text-warning'
                  }`}
                >
                  {emailRegex.test(singleRecipient.trim()) ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Valid email format</span>
                    </>
                  ) : (
                    <>
                      <Info className="w-3 h-3" />
                      <span>Incomplete address</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <input
              type="email"
              value={singleRecipient}
              onChange={(e) => {
                setSingleRecipient(e.target.value);
                markDirty();
              }}
              placeholder="client@company.com"
              className="w-full text-xs font-mono rounded-control border border-border bg-surface-muted/40 px-3 py-2.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-surface transition-colors"
            />
          </div>
        )}

        {mode === 'same' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-foreground">
                  Recipients List
                </label>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-pill bg-surface-muted text-text-secondary border border-border-subtle">
                  {parsedEmailChips.length} recipient{parsedEmailChips.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                {availableGroups.length > 0 && (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-text-muted text-[11px]">Insert from:</span>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => handleGroupSelect(e.target.value)}
                      className="text-xs rounded-control border border-border bg-surface-muted/60 px-2 py-1 text-foreground cursor-pointer focus:outline-none focus:border-accent"
                    >
                      <option value="">-- Contact Group --</option>
                      {availableGroups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.member_count})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsRawRecipientsOpen(prev => !prev)}
                  className="text-[11px] font-medium text-text-secondary hover:text-foreground underline decoration-border-strong transition-colors"
                >
                  {isRawRecipientsOpen ? 'Show Email Chips' : 'Edit as Raw Text'}
                </button>
              </div>
            </div>

            {/* Interactive Email Chips or Textarea */}
            {!isRawRecipientsOpen ? (
              <div className="p-3 rounded-control border border-border bg-surface-muted/30 min-h-[90px] flex flex-wrap gap-1.5 items-start">
                {parsedEmailChips.length === 0 ? (
                  <div className="w-full py-4 text-center text-text-muted text-xs">
                    Paste or type recipient email addresses separated by commas or new lines...
                  </div>
                ) : (
                  parsedEmailChips.map((chip, idx) => {
                    const isValid = emailRegex.test(chip);
                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-pill text-xs font-mono transition-colors ${
                          isValid
                            ? 'bg-surface border border-border text-foreground'
                            : 'bg-danger/10 border border-danger/30 text-danger'
                        }`}
                      >
                        <span className="truncate max-w-[220px]">{chip}</span>
                        <button
                          type="button"
                          onClick={() => removeEmailChip(chip)}
                          className="hover:opacity-75 text-text-muted hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })
                )}
                <input
                  type="text"
                  placeholder={parsedEmailChips.length > 0 ? "+ add another email..." : ""}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        setPastedRecipients(prev => (prev ? `${prev}, ${val}` : val));
                        e.currentTarget.value = '';
                        markDirty();
                      }
                    }
                  }}
                  className="text-xs font-mono bg-transparent outline-none flex-1 min-w-[150px] p-1 text-foreground placeholder:text-text-muted"
                />
              </div>
            ) : (
              <textarea
                rows={4}
                value={pastedRecipients}
                onChange={(e) => {
                  setPastedRecipients(e.target.value);
                  markDirty();
                }}
                placeholder="alice@example.com, bob@example.com, charlie@company.com..."
                className="w-full text-xs font-mono rounded-control border border-border bg-surface-muted/40 p-3 text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-surface transition-colors"
              />
            )}
          </div>
        )}

        {mode === 'merge' && (
          <div className="p-4 rounded-panel border border-accent/25 bg-accent-subtle/25 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-control bg-accent/15 text-accent-strong flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-display text-foreground">
                    Mail Merge CSV DataSource
                  </h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {mergeRecipients.length > 0
                      ? `Mapped ${mergeRecipients.length} personalized rows with custom columns.`
                      : 'Upload a CSV to dispatch individualized emails with custom field variables.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCsvModalOpen(true)}
                className="px-3.5 py-1.5 rounded-control text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 shadow-xs transition-opacity self-start sm:self-auto"
              >
                {mergeRecipients.length > 0 ? 'Replace / Re-map CSV' : 'Upload CSV Spreadsheet'}
              </button>
            </div>

            {mergeRecipients.length > 0 && (
              <div className="pt-2 border-t border-accent/15 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-text-muted text-[11px]">Available variables:</span>
                {mergePlaceholders.map(ph => (
                  <span
                    key={ph}
                    className="px-2 py-0.5 rounded-pill bg-surface border border-accent/25 text-accent font-mono text-[11px] font-semibold"
                  >
                    {`{{${ph}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'custom' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold font-display text-foreground">
                  Custom Per-Recipient Table
                </h4>
                <p className="text-[11px] text-text-muted">
                  Every row has complete independent control over To, Subject, Body, and File.
                </p>
              </div>
              <button
                type="button"
                onClick={addCustomRow}
                className="px-3 py-1.5 rounded-control text-xs font-semibold bg-surface-muted hover:bg-surface border border-border text-foreground flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-border rounded-panel bg-surface">
              <table className="w-full text-xs">
                <thead className="bg-surface-muted text-text-muted font-semibold border-b border-border">
                  <tr>
                    <th className="p-2.5 text-left w-48">To Email *</th>
                    <th className="p-2.5 text-left w-36">Name</th>
                    <th className="p-2.5 text-left w-56">Subject *</th>
                    <th className="p-2.5 text-left min-w-[200px]">Custom HTML/Body</th>
                    <th className="p-2.5 text-left w-36">Attachment Filename</th>
                    <th className="p-2.5 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {customRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="p-2">
                        <input
                          type="email"
                          value={row.email}
                          onChange={(e) => updateCustomRow(idx, 'email', e.target.value)}
                          placeholder="client@domain.com"
                          className="w-full text-xs rounded-control border border-border bg-transparent p-1.5 font-mono text-foreground focus:outline-none focus:border-accent"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateCustomRow(idx, 'name', e.target.value)}
                          placeholder="Recipient Name"
                          className="w-full text-xs rounded-control border border-border bg-transparent p-1.5 text-foreground focus:outline-none focus:border-accent"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.subject}
                          onChange={(e) => updateCustomRow(idx, 'subject', e.target.value)}
                          placeholder="Row Subject"
                          className="w-full text-xs rounded-control border border-border bg-transparent p-1.5 text-foreground focus:outline-none focus:border-accent"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.body_html}
                          onChange={(e) => updateCustomRow(idx, 'body_html', e.target.value)}
                          placeholder="<p>Custom email body...</p>"
                          className="w-full text-xs rounded-control border border-border bg-transparent p-1.5 text-foreground focus:outline-none focus:border-accent"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.attachmentName}
                          onChange={(e) => updateCustomRow(idx, 'attachmentName', e.target.value)}
                          placeholder="file.pdf"
                          className="w-full text-xs rounded-control border border-border bg-transparent p-1.5 font-mono text-foreground focus:outline-none focus:border-accent"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeCustomRow(idx)}
                          disabled={customRows.length === 1}
                          className="text-text-muted hover:text-danger disabled:opacity-30 p-1 rounded-control transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subject Line (Used in modes 1, 2, 3) */}
        {mode !== 'custom' && (
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Email Subject <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                markDirty();
              }}
              placeholder={
                mode === 'merge'
                  ? 'Hello {{name|valued client}}, update regarding #{{order_id}}'
                  : 'Important Product Update'
              }
              className="w-full text-sm font-medium rounded-control border border-border bg-surface-muted/40 px-3 py-2.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-surface transition-colors"
            />
          </div>
        )}

        {/* Collapsible CC, BCC, Reply-To */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvancedHeaders(prev => !prev)}
            className="text-xs font-semibold text-text-secondary hover:text-foreground flex items-center space-x-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-text-muted" />
            <span>{showAdvancedHeaders ? 'Hide CC, BCC, Reply-To headers' : 'Show CC, BCC, Reply-To headers'}</span>
            {showAdvancedHeaders ? <ChevronUp className="w-3 h-3 text-text-muted" /> : <ChevronDown className="w-3 h-3 text-text-muted" />}
          </button>

          <AnimatePresence>
            {showAdvancedHeaders && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-border-subtle">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">CC</label>
                    <input
                      type="text"
                      value={cc}
                      onChange={(e) => { setCc(e.target.value); markDirty(); }}
                      placeholder="copy@example.com"
                      className="w-full text-xs rounded-control border border-border bg-surface-muted/40 p-2 text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">BCC</label>
                    <input
                      type="text"
                      value={bcc}
                      onChange={(e) => { setBcc(e.target.value); markDirty(); }}
                      placeholder="archive@example.com"
                      className="w-full text-xs rounded-control border border-border bg-surface-muted/40 p-2 text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">Reply-To</label>
                    <input
                      type="text"
                      value={replyTo}
                      onChange={(e) => { setReplyTo(e.target.value); markDirty(); }}
                      placeholder="support@example.com"
                      className="w-full text-xs rounded-control border border-border bg-surface-muted/40 p-2 text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Body Editor (Modes 1, 2, 3) */}
        {mode !== 'custom' && (
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Email Content
            </label>
            <RichEditor
              htmlValue={bodyHtml}
              onChangeHtml={(val) => {
                setBodyHtml(val);
                markDirty();
              }}
              textValue={bodyText}
              onChangeText={(val) => {
                setBodyText(val);
                markDirty();
              }}
              placeholders={mode === 'merge' ? mergePlaceholders : ['name', 'email']}
            />
          </div>
        )}

        {/* Drag-and-Drop Global Attachments */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-foreground mb-2">
            Global Attachments <span className="text-text-muted font-normal">(Included in every email)</span>
          </label>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropFiles}
            className={`p-4 rounded-panel border-2 border-dashed transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer ${
              isDraggingFiles
                ? 'border-accent bg-accent-subtle/50 scale-[1.005]'
                : 'border-border-strong bg-surface-muted/20 hover:border-accent/60 hover:bg-surface-muted/50'
            }`}
            onClick={() => document.getElementById('global-attachment-input')?.click()}
          >
            <input
              type="file"
              id="global-attachment-input"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-9 h-9 rounded-control bg-surface border border-border flex items-center justify-center text-accent mb-2 shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-foreground">
              {isUploadingFiles ? (
                <span>Uploading files...</span>
              ) : (
                <span>Click to browse or drop files here</span>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              PDF, Excel, Word, CSV, images, ZIP archives (max 10MB per file)
            </p>
          </div>

          {globalAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {globalAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-control bg-surface border border-border text-xs flex items-center space-x-2 shadow-xs"
                >
                  <Paperclip className="w-3.5 h-3.5 text-text-muted" />
                  <span className="font-medium text-foreground truncate max-w-[180px]">{att.originalName}</span>
                  <span className="text-[10px] text-text-muted">({Math.round(att.size / 1024)} KB)</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeGlobalAttachment(idx);
                    }}
                    className="text-text-muted hover:text-danger p-0.5 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Settings: Tracking, Dry-run & Scheduling */}
        <div className="p-4 bg-surface-muted/60 rounded-panel border border-border-subtle space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tracking Toggle Card */}
            <label className="flex items-start space-x-2.5 p-3 rounded-control border border-border bg-surface cursor-pointer hover:border-accent/50 transition-colors">
              <input
                type="checkbox"
                checked={trackingEnabled}
                onChange={(e) => setTrackingEnabled(e.target.checked)}
                className="mt-0.5 rounded border-border-strong text-accent focus:ring-accent"
              />
              <div>
                <span className="font-semibold text-xs text-foreground block">
                  Engagement Tracking
                </span>
                <span className="text-[11px] text-text-muted block mt-0.5">
                  1x1 open pixel & 302 click redirects
                </span>
              </div>
            </label>

            {/* Dry Run Toggle Card */}
            <label className="flex items-start space-x-2.5 p-3 rounded-control border border-border bg-surface cursor-pointer hover:border-warning/50 transition-colors">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="mt-0.5 rounded border-border-strong text-warning focus:ring-warning"
              />
              <div>
                <span className="font-semibold text-xs text-warning block">
                  Dry-Run Simulation
                </span>
                <span className="text-[11px] text-text-muted block mt-0.5">
                  Simulate queue without SMTP dispatch
                </span>
              </div>
            </label>

            {/* Schedule Toggle Card */}
            <label className="flex items-start space-x-2.5 p-3 rounded-control border border-border bg-surface cursor-pointer hover:border-accent/50 transition-colors">
              <input
                type="checkbox"
                checked={isScheduling}
                onChange={(e) => setIsScheduling(e.target.checked)}
                className="mt-0.5 rounded border-border-strong text-accent focus:ring-accent"
              />
              <div>
                <span className="font-semibold text-xs text-foreground block flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  <span>Scheduled Dispatch</span>
                </span>
                <span className="text-[11px] text-text-muted block mt-0.5">
                  Execute via background cron job
                </span>
              </div>
            </label>
          </div>

          {/* Schedule Date & Time Picker */}
          {isScheduling && (
            <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-foreground">Target Date & Time:</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="rounded-control border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
              />
              <span className="text-text-muted text-[11px]">
                Jobs persist in Supabase and survive server restarts.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-t border-border px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Summary status on the left */}
          <div className="flex items-center space-x-3 text-xs">
            <span className="font-semibold text-foreground flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>
                {recipientCount} recipient{recipientCount === 1 ? '' : 's'} ready
              </span>
            </span>

            {isDryRun && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-pill bg-warning/15 text-warning font-mono text-[10px] font-semibold border border-warning/25">
                Dry Run Mode
              </span>
            )}

            {isScheduling && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-pill bg-accent-subtle text-accent font-mono text-[10px] font-semibold border border-accent/25">
                Scheduled
              </span>
            )}
          </div>

          {/* Action buttons on the right */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Send Test to Me */}
            <button
              type="button"
              onClick={handleSendTestToMe}
              title={`Sends test sample to your email (${user?.email})`}
              className="px-3 py-2 rounded-control text-xs font-semibold bg-surface-muted hover:bg-surface text-foreground border border-border transition-colors hidden sm:flex items-center space-x-1.5"
            >
              <MailCheck className="w-3.5 h-3.5 text-text-muted" />
              <span>Send Test</span>
            </button>

            {/* List Cleanup */}
            <button
              type="button"
              onClick={handleListCleanup}
              className="px-3 py-2 rounded-control text-xs font-semibold bg-surface-muted hover:bg-surface text-foreground border border-border flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-warning" />
              <span>Clean List</span>
            </button>

            {/* Preview & Send Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleOpenPreview}
              className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 shadow-resting flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Preview & Send</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CsvMapperModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onApplyData={(data, cols) => {
          setMergeRecipients(data);
          setMergePlaceholders(cols);
          markDirty();
          showToast(`Imported ${data.length} recipients for Mail Merge!`);
        }}
      />

      <ListCleanupModal
        isOpen={isCleanupModalOpen}
        onClose={() => setIsCleanupModalOpen(false)}
        cleanupStats={cleanupStats}
        cleanupDetails={cleanupDetails}
        onApplyCleanList={applyCleanList}
      />

      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        summary={previewSummary}
        previews={previews}
        onConfirmSend={handleConfirmSend}
        isDryRun={isDryRun}
      />

      <SendProgressModal
        isOpen={isProgressModalOpen}
        campaignId={activeCampaignId}
        totalRecipients={activeCampaignTotal}
        isDryRun={isDryRun}
        onComplete={() => {
          setIsProgressModalOpen(false);
          if (refreshUser) refreshUser();
          window.dispatchEvent(new Event('bm_quota_updated'));
        }}
        onViewHistory={() => {
          setIsProgressModalOpen(false);
          if (refreshUser) refreshUser();
          window.dispatchEvent(new Event('bm_quota_updated'));
          if (onNavigateToHistory) onNavigateToHistory('history');
        }}
      />
    </div>
  );
};
