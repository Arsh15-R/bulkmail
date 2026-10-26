import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import {
  FolderTree,
  Plus,
  Users,
  Send,
  Trash2,
  Edit2,
  ExternalLink,
  X,
  UserPlus,
  UserMinus,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

export const Groups = ({ onSendToGroup }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Members modal
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [addContactSearch, setAddContactSearch] = useState('');
  const [activeMemberTab, setActiveMemberTab] = useState('current'); // 'current' or 'add'

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await api.groups.list();
      if (res.success) {
        setGroups(res.groups || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group) => {
    setEditingGroup(group);
    setName(group.name);
    setDescription(group.description || '');
    setIsModalOpen(true);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await api.groups.update(editingGroup.id, { name, description });
        showToast('Group updated successfully.');
      } else {
        await api.groups.create({ name, description });
        showToast('Group created successfully.');
      }
      setIsModalOpen(false);
      loadGroups();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteGroup = async (id, groupName) => {
    if (!confirm(`Are you sure you want to delete group "${groupName}"?`)) return;

    try {
      await api.groups.delete(id);
      showToast('Group deleted.');
      loadGroups();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleViewMembers = async (group) => {
    setSelectedGroup(group);
    setIsMembersModalOpen(true);
    setActiveMemberTab('current');
    setMemberSearch('');
    setAddContactSearch('');
    try {
      const [grpRes, contRes] = await Promise.all([
        api.groups.get(group.id),
        api.contacts.list({ limit: 100 })
      ]);
      if (grpRes.success) setGroupMembers(grpRes.group.members || []);
      if (contRes.success) setAllContacts(contRes.contacts || []);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddMember = async (contactId) => {
    try {
      await api.groups.addMembers(selectedGroup.id, [contactId]);
      showToast('Contact added to group.');
      const res = await api.groups.get(selectedGroup.id);
      if (res.success) setGroupMembers(res.group.members || []);
      loadGroups();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveMember = async (contactId) => {
    try {
      await api.groups.removeMember(selectedGroup.id, contactId);
      showToast('Contact removed from group.');
      const res = await api.groups.get(selectedGroup.id);
      if (res.success) setGroupMembers(res.group.members || []);
      loadGroups();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(search.toLowerCase()))
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
              <FolderTree className="w-4 h-4" />
            </div>
            <h2 className="text-base font-display font-bold text-foreground tracking-tight">
              Contact Groups
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Segment your audience into targeted mailing lists for single-click campaign dispatch.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-accent-foreground hover:opacity-95 shadow-resting flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Group</span>
        </motion.button>
      </div>

      {/* Search Bar */}
      {groups.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-surface p-3 rounded-control border border-border shadow-resting text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter groups by name or description..."
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
            {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'}
          </span>
        </div>
      )}

      {/* Groups Grid */}
      {loading ? (
        <div className="p-16 text-center text-text-muted italic bg-surface rounded-panel border border-border shadow-resting">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-pill animate-spin" />
            <span className="text-xs">Loading contact groups...</span>
          </div>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-surface p-12 rounded-panel border border-border shadow-resting text-center space-y-3">
          <div className="w-12 h-12 rounded-pill bg-surface-muted border border-border flex items-center justify-center mx-auto text-text-muted">
            <FolderTree className="w-6 h-6 opacity-40" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground text-sm">No Contact Groups Created</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
              Organize contacts into custom groups like "Product Updates", "Enterprise Leads", or "Beta Testers".
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-accent-foreground hover:opacity-95 shadow-resting inline-flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Group</span>
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <motion.div
              key={group.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              className="bg-surface p-5 rounded-panel border border-border shadow-resting hover:border-accent/40 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 pr-2">
                    <h3 className="font-display font-semibold text-foreground text-sm tracking-tight truncate">
                      {group.name}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-semibold bg-accent-subtle text-accent border border-accent/20 font-mono">
                      <Users className="w-3 h-3 mr-1" />
                      {group.member_count || 0} {group.member_count === 1 ? 'Contact' : 'Contacts'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(group)}
                      title="Edit group"
                      className="p-1.5 rounded-control text-text-muted hover:text-accent hover:bg-surface-muted transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      title="Delete group"
                      className="p-1.5 rounded-control text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-text-muted mt-3 line-clamp-2 leading-relaxed">
                  {group.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleViewMembers(group)}
                  className="font-semibold text-text-secondary hover:text-foreground hover:underline transition cursor-pointer text-xs"
                >
                  Manage Members
                </button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => onSendToGroup(group.id)}
                  className="px-3 py-1.5 rounded-control bg-accent text-accent-foreground hover:opacity-95 text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Send to Group</span>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit Group Modal */}
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
                  {editingGroup ? 'Edit Contact Group' : 'Create Contact Group'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-control text-text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveGroup} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Group Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Early Adopters"
                    className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional details about recipients in this group..."
                    className="w-full rounded-control border border-border bg-surface-muted text-foreground p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
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
                    Save Group
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Group Members Modal */}
      <AnimatePresence>
        {isMembersModalOpen && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMembersModalOpen(false)}
              className="fixed inset-0 bg-neutral-11/60 dark:bg-black/75 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: "spring", stiffness: 480, damping: 36 }}
              className="relative bg-surface rounded-panel border border-border shadow-floating max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden z-10"
            >
              <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm tracking-tight flex items-center space-x-2">
                    <span>Members of "{selectedGroup.name}"</span>
                    <span className="px-2 py-0.5 rounded-pill text-[10px] font-mono font-semibold bg-accent-subtle text-accent border border-accent/20">
                      {groupMembers.length}
                    </span>
                  </h3>
                  <p className="text-xs text-text-muted">
                    Manage which contacts belong to this segmented list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMembersModalOpen(false)}
                  className="p-1 rounded-control text-text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="px-6 pt-3 bg-surface-muted border-b border-border-subtle flex space-x-4 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveMemberTab('current')}
                  className={`pb-2.5 border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
                    activeMemberTab === 'current'
                      ? 'border-accent text-accent'
                      : 'border-transparent text-text-muted hover:text-foreground'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Current Members ({groupMembers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMemberTab('add')}
                  className={`pb-2.5 border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
                    activeMemberTab === 'add'
                      ? 'border-accent text-accent'
                      : 'border-transparent text-text-muted hover:text-foreground'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Contacts</span>
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                {activeMemberTab === 'current' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-muted" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search current members..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-control border border-border bg-surface-muted text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      />
                    </div>

                    <div className="border border-border rounded-control divide-y divide-border-subtle max-h-72 overflow-y-auto">
                      {groupMembers.length === 0 ? (
                        <div className="p-8 text-center text-text-muted italic">
                          No contacts in this group yet. Switch to "Add Contacts" tab to add some.
                        </div>
                      ) : (
                        groupMembers
                          .filter(m => m.email.toLowerCase().includes(memberSearch.toLowerCase()) || (m.name && m.name.toLowerCase().includes(memberSearch.toLowerCase())))
                          .map((m) => (
                            <div key={m.id} className="p-3 flex items-center justify-between hover:bg-surface-muted/40 transition">
                              <div>
                                <div className="font-mono font-medium text-foreground text-xs">{m.email}</div>
                                {m.name && <div className="text-[11px] text-text-muted">{m.name}</div>}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.id)}
                                className="px-2.5 py-1 rounded-control bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-semibold text-[11px] flex items-center space-x-1 transition cursor-pointer"
                              >
                                <UserMinus className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-muted" />
                      <input
                        type="text"
                        value={addContactSearch}
                        onChange={(e) => setAddContactSearch(e.target.value)}
                        placeholder="Search directory to add contacts..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-control border border-border bg-surface-muted text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      />
                    </div>

                    <div className="border border-border rounded-control divide-y divide-border-subtle max-h-72 overflow-y-auto">
                      {allContacts
                        .filter(c => !groupMembers.some(gm => gm.id === c.id))
                        .filter(c => c.email.toLowerCase().includes(addContactSearch.toLowerCase()) || (c.name && c.name.toLowerCase().includes(addContactSearch.toLowerCase())))
                        .length === 0 ? (
                        <div className="p-8 text-center text-text-muted italic">
                          All directory contacts are already members of this group.
                        </div>
                      ) : (
                        allContacts
                          .filter(c => !groupMembers.some(gm => gm.id === c.id))
                          .filter(c => c.email.toLowerCase().includes(addContactSearch.toLowerCase()) || (c.name && c.name.toLowerCase().includes(addContactSearch.toLowerCase())))
                          .map((c) => (
                            <div key={c.id} className="p-3 flex items-center justify-between hover:bg-surface-muted/40 transition">
                              <div>
                                <div className="font-mono text-foreground text-xs">{c.email}</div>
                                {c.name && <div className="text-[11px] text-text-muted">{c.name}</div>}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddMember(c.id)}
                                className="px-2.5 py-1 rounded-control bg-accent-subtle hover:bg-accent/20 text-accent font-semibold text-[11px] flex items-center space-x-1 border border-accent/20 transition cursor-pointer"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>Add to Group</span>
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-border-subtle bg-surface-raised flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMembersModalOpen(false)}
                  className="px-4 py-2 rounded-control bg-surface border border-border hover:bg-surface-muted text-xs font-semibold text-foreground transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
