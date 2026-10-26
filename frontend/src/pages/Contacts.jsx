import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import Papa from 'papaparse';
import {
  Users,
  Search,
  Plus,
  Upload,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  UserX,
  AlertCircle,
  X,
  Send,
  User,
  Building,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download
} from 'lucide-react';

export const Contacts = ({ onSendToContacts }) => {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({ email: '', name: '', company: '' });
  const [modalError, setModalError] = useState('');

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadContacts = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.contacts.list({
        search,
        status: statusFilter,
        page,
        limit: 25
      });
      if (res.success) {
        setContacts(res.contacts || []);
        setPagination(res.pagination || { page: 1, total: 0, totalPages: 1 });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts(1);
    setSelectedIds([]);
  }, [search, statusFilter]);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({ email: '', name: '', company: '' });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      email: contact.email,
      name: contact.name || '',
      company: contact.metadata?.company || ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setModalError('');

    try {
      const payload = {
        email: formData.email.trim(),
        name: formData.name.trim(),
        metadata: formData.company ? { company: formData.company.trim() } : {}
      };

      if (editingContact) {
        const res = await api.contacts.update(editingContact.id, payload);
        if (res.success) {
          showToast('Contact updated successfully.');
          setIsModalOpen(false);
          loadContacts(pagination.page);
        }
      } else {
        const res = await api.contacts.create(payload);
        if (res.success) {
          showToast('Contact created successfully.');
          setIsModalOpen(false);
          loadContacts(1);
        }
      }
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleDeleteContact = async (id, email) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) return;

    try {
      const res = await api.contacts.delete(id);
      if (res.success) {
        showToast('Contact deleted.');
        setSelectedIds(prev => prev.filter(item => item !== id));
        loadContacts(pagination.page);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected contacts?`)) return;

    try {
      for (const id of selectedIds) {
        await api.contacts.delete(id);
      }
      showToast(`Deleted ${selectedIds.length} contacts.`);
      setSelectedIds([]);
      loadContacts(pagination.page);
    } catch (err) {
      showToast(`Failed deleting: ${err.message}`, 'error');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(contacts.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCsvImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await api.contacts.import(results.data);
          if (res.success) {
            showToast(res.message);
            loadContacts(1);
          }
        } catch (err) {
          showToast(`Import failed: ${err.message}`, 'error');
        }
      }
    });
  };

  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    return email ? email.slice(0, 2).toUpperCase() : '??';
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
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base font-display font-bold text-foreground tracking-tight">
              Contacts Directory
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Manage your audience database with automatic bounce tracking and unsubscribe compliance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* CSV Import */}
          <input
            type="file"
            id="contacts-csv-import"
            accept=".csv"
            onChange={handleCsvImport}
            className="hidden"
          />
          <label
            htmlFor="contacts-csv-import"
            className="cursor-pointer px-3.5 py-2 rounded-control text-xs font-semibold bg-surface-muted hover:bg-surface text-foreground border border-border flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-text-muted" />
            <span>Import CSV</span>
          </label>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-accent-foreground hover:opacity-95 shadow-resting flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Contact</span>
          </motion.button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-control border border-border shadow-resting text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
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

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-surface-muted p-1 rounded-pill border border-border-subtle w-full sm:w-auto justify-center">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'unsubscribed', label: 'Unsubscribed' },
            { id: 'bounced', label: 'Bounced' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-pill font-medium text-xs transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-surface text-foreground font-semibold shadow-xs border border-border-subtle'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-surface-raised border border-accent/30 rounded-control p-3 shadow-floating flex items-center justify-between text-xs"
          >
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-foreground font-mono">
                {selectedIds.length} {selectedIds.length === 1 ? 'contact' : 'contacts'} selected
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className="text-text-muted hover:text-foreground underline text-[11px]"
              >
                Deselect all
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-control text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 flex items-center space-x-1 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts Data Table */}
      <div className="bg-surface rounded-panel border border-border overflow-hidden shadow-resting">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted border-b border-border text-text-muted font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selectedIds.length === contacts.length}
                    onChange={handleSelectAll}
                    aria-label="Select all contacts"
                    className="w-3.5 h-3.5 rounded-sm accent-accent cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Company / Meta</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Created</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-text-muted italic">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-pill animate-spin" />
                      <span className="text-xs">Loading contacts directory...</span>
                    </div>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-text-muted space-y-3">
                    <div className="w-12 h-12 rounded-pill bg-surface-muted border border-border flex items-center justify-center mx-auto text-text-muted">
                      <Users className="w-6 h-6 opacity-40" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">No contacts found</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {search ? 'Try clearing your search query.' : 'Upload a CSV file or add a contact manually to get started.'}
                      </div>
                    </div>
                    {!search && (
                      <button
                        onClick={handleOpenAdd}
                        className="px-3.5 py-1.5 rounded-control text-xs font-semibold bg-accent text-accent-foreground inline-flex items-center space-x-1.5 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Contact</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                contacts.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors hover:bg-surface-muted/50 ${
                        isSelected ? 'bg-accent-subtle/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(c.id)}
                          aria-label={`Select ${c.email}`}
                          className="w-3.5 h-3.5 rounded-sm accent-accent cursor-pointer"
                        />
                      </td>

                      {/* Contact Identity */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-pill bg-surface-muted border border-border-subtle flex items-center justify-center text-[11px] font-bold font-mono text-text-secondary shrink-0">
                            {getInitials(c.name, c.email)}
                          </div>
                          <div className="truncate">
                            <div className="font-mono font-medium text-foreground text-xs truncate">
                              {c.email}
                            </div>
                            {c.name && (
                              <div className="text-[11px] text-text-muted truncate">
                                {c.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Company / Meta */}
                      <td className="p-3.5 text-text-secondary">
                        {c.metadata?.company || Object.values(c.metadata || {})[0] || (
                          <span className="text-text-muted font-mono">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {c.is_unsubscribed === 1 ? (
                          <span className="px-2.5 py-0.5 rounded-pill bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium text-[11px] inline-flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mr-1.5" />
                            Unsubscribed
                          </span>
                        ) : c.is_bounced === 1 ? (
                          <span className="px-2.5 py-0.5 rounded-pill bg-rose-500/10 text-rose-500 border border-rose-500/20 font-medium text-[11px] inline-flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                            Bounced
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-pill bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium text-[11px] inline-flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="p-3.5 text-text-muted font-mono text-[11px]">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>

                      {/* Row Actions */}
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit contact"
                          className="p-1.5 rounded-control text-text-muted hover:text-accent hover:bg-surface-muted transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(c.id, c.email)}
                          title="Delete contact"
                          className="p-1.5 rounded-control text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-border bg-surface-muted flex items-center justify-between text-xs text-text-muted">
          <span className="font-mono">
            Showing <strong className="text-foreground">{contacts.length}</strong> of {pagination.total} contacts
          </span>

          {pagination.totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadContacts(pagination.page - 1)}
                className="p-1 rounded-control border border-border bg-surface hover:bg-surface-muted text-foreground disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] px-1">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadContacts(pagination.page + 1)}
                className="p-1 rounded-control border border-border bg-surface hover:bg-surface-muted text-foreground disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Contact Modal */}
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
              className="relative bg-surface rounded-panel border border-border shadow-floating max-w-md w-full overflow-hidden z-10"
            >
              <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-control text-text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="p-6 space-y-4 text-xs">
                {modalError && (
                  <div className="p-2.5 rounded-control bg-rose-500/10 border border-rose-500/20 text-rose-500">
                    {modalError}
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Alice Smith"
                    className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Acme Corporation"
                    className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                    className="px-4 py-2 rounded-control bg-accent text-accent-foreground hover:opacity-95 font-semibold shadow-resting cursor-pointer"
                  >
                    Save Contact
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
