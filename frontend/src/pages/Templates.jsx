import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { RichEditor } from '../components/RichEditor';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Send,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export const Templates = ({ onUseTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [modalError, setModalError] = useState('');

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.templates.list();
      if (res.success) {
        setTemplates(res.templates || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setName('');
    setSubject('');
    setBodyHtml('<h1>Hello {{name|valued client}},</h1><p>We are delighted to share our latest updates with you...</p>');
    setBodyText('');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tpl) => {
    setEditingTemplate(tpl);
    setName(tpl.name);
    setSubject(tpl.subject || '');
    setBodyHtml(tpl.body_html || '');
    setBodyText(tpl.body_text || '');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        body_html: bodyHtml,
        body_text: bodyText
      };

      if (editingTemplate) {
        await api.templates.update(editingTemplate.id, payload);
        showToast('Template updated successfully.');
      } else {
        await api.templates.create(payload);
        showToast('Template created successfully.');
      }
      setIsModalOpen(false);
      loadTemplates();
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleDeleteTemplate = async (id, tplName) => {
    if (!confirm(`Are you sure you want to delete template "${tplName}"?`)) return;

    try {
      await api.templates.delete(id);
      showToast('Template deleted.');
      loadTemplates();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCloneTemplate = async (tpl) => {
    try {
      await api.templates.create({
        name: `${tpl.name} (Copy)`,
        subject: tpl.subject,
        body_html: tpl.body_html,
        body_text: tpl.body_text
      });
      showToast('Template duplicated.');
      loadTemplates();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Helper to extract merge tags used in HTML or Subject
  const extractPlaceholders = (text, html) => {
    const combined = `${text || ''} ${html || ''}`;
    const matches = combined.match(/\{\{([^}]+)\}\}/g) || [];
    return Array.from(new Set(matches.map(m => m.replace(/[{}]/g, '').split('|')[0].trim())));
  };

  const filteredTemplates = templates.filter(tpl =>
    tpl.name.toLowerCase().includes(search.toLowerCase()) ||
    (tpl.subject && tpl.subject.toLowerCase().includes(search.toLowerCase()))
  );

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
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-base font-display font-bold text-foreground tracking-tight">
              Email Templates
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Build and reuse modular layouts with personalized merge tags like <code className="font-mono text-accent">{"{{name|there}}"}</code>.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-accent-foreground hover:opacity-95 shadow-resting flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Template</span>
        </motion.button>
      </div>

      {/* Search Bar */}
      {templates.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-surface p-3 rounded-control border border-border shadow-resting text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates by title or subject..."
              className="w-full pl-9 pr-8 py-1.5 rounded-control border border-border bg-surface-muted text-foreground placeholder:text-text-muted text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-text-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-[11px] text-text-muted font-mono hidden sm:inline">
            {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'}
          </span>
        </div>
      )}

      {/* Templates Grid */}
      {loading ? (
        <div className="p-16 text-center text-text-muted italic bg-surface rounded-panel border border-border shadow-resting">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-pill animate-spin" />
            <span className="text-xs">Loading email templates...</span>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-surface p-12 rounded-panel border border-border shadow-resting text-center space-y-3">
          <div className="w-12 h-12 rounded-pill bg-surface-muted border border-border flex items-center justify-center mx-auto text-text-muted">
            <FileText className="w-6 h-6 opacity-40" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground text-sm">No Saved Templates</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
              Save time on repetitive dispatches by creating reusable newsletters, transactional notices, and customer outreach drafts.
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-accent-foreground hover:opacity-95 shadow-resting inline-flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Template</span>
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => {
            const detectedTags = extractPlaceholders(tpl.subject, tpl.body_html);
            return (
              <motion.div
                key={tpl.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="bg-surface rounded-panel border border-border shadow-resting hover:border-accent/40 overflow-hidden flex flex-col justify-between transition-all"
              >
                <div className="p-5 space-y-3">
                  {/* Card Title & Row Actions */}
                  <div className="flex items-start justify-between">
                    <h3 className="font-display font-semibold text-foreground text-sm tracking-tight truncate pr-2">
                      {tpl.name}
                    </h3>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleCloneTemplate(tpl)}
                        title="Duplicate template"
                        className="p-1.5 rounded-control text-text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(tpl)}
                        title="Edit template"
                        className="p-1.5 rounded-control text-text-muted hover:text-accent hover:bg-surface-muted transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        title="Delete template"
                        className="p-1.5 rounded-control text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div className="text-xs text-text-secondary truncate">
                    <span className="font-mono uppercase text-[10px] text-text-muted tracking-wider">Subj: </span>
                    <span className="font-medium text-foreground">{tpl.subject || '<No Subject>'}</span>
                  </div>

                  {/* HTML Snippet Preview */}
                  <div className="p-3 bg-surface-muted rounded-control border border-border-subtle text-[11px] text-text-muted line-clamp-3 font-mono leading-relaxed select-none">
                    {tpl.body_html.replace(/<[^>]+>/g, ' ').trim() || 'Empty body'}
                  </div>

                  {/* Tags */}
                  {detectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {detectedTags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-pill bg-accent-subtle text-accent border border-accent/20 text-[10px] font-mono"
                        >
                          {`{{${tag}}}`}
                        </span>
                      ))}
                      {detectedTags.length > 4 && (
                        <span className="text-[10px] text-text-muted font-mono self-center">
                          +{detectedTags.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-surface-muted border-t border-border-subtle flex items-center justify-between text-xs">
                  <span className="text-[10px] text-text-muted font-mono">
                    {new Date(tpl.updated_at).toLocaleDateString()}
                  </span>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => onUseTemplate(tpl)}
                    className="px-3 py-1.5 rounded-control bg-accent text-accent-foreground hover:opacity-95 text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Use in Compose</span>
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Template Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-neutral-11/60 dark:bg-black/75 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: "spring", stiffness: 480, damping: 36 }}
              className="relative bg-surface rounded-panel border border-border shadow-floating max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden z-10"
            >
              <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between shrink-0">
                <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
                  {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-control text-text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                {modalError && (
                  <div className="p-2.5 rounded-control bg-rose-500/10 border border-rose-500/20 text-rose-500">
                    {modalError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      Template Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Monthly Newsletter"
                      className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      Subject Line Template
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Welcome {{name|valued client}} to our community"
                      className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1.5">
                    Template Content & Body
                  </label>
                  <RichEditor
                    htmlValue={bodyHtml}
                    onChangeHtml={setBodyHtml}
                    textValue={bodyText}
                    onChangeText={setBodyText}
                    placeholders={['name', 'email', 'order_id', 'company']}
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-control border border-border bg-surface hover:bg-surface-muted text-text-secondary hover:text-foreground font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="px-5 py-2 rounded-control bg-accent text-accent-foreground hover:opacity-95 font-semibold shadow-resting cursor-pointer"
                  >
                    Save Template
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
