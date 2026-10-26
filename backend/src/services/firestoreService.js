const { getFirestore } = require('../config/firebase');

/**
 * Firestore Service Layer for BulkMailer
 * Manages collections: users, contacts, groups, templates, campaigns,
 * campaign_recipients, tracking_events, scheduled_jobs, drafts, daily_send_logs.
 */
class FirestoreService {
  constructor() {
    this._db = null;
  }

  get db() {
    if (!this._db) {
      this._db = getFirestore();
      if (!this._db) {
        throw new Error('Firebase Firestore is not initialized. Please configure your serviceAccountKey.json or .env credentials.');
      }
    }
    return this._db;
  }

  // --- Users ---
  async getUserByEmail(email) {
    const cleanEmail = email.toLowerCase().trim();
    const snap = await this.db.collection('users').where('email', '==', cleanEmail).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async getUserById(id) {
    const doc = await this.db.collection('users').doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async createUser(userData) {
    const docRef = await this.db.collection('users').add({
      ...userData,
      email: userData.email.toLowerCase().trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return { id: docRef.id, ...userData };
  }

  async updateUser(id, updates) {
    await this.db.collection('users').doc(String(id)).update({
      ...updates,
      updated_at: new Date().toISOString()
    });
    return this.getUserById(id);
  }

  // --- Contacts ---
  async getContacts(userId, { search = '', status = 'all', page = 1, limit = 50 } = {}) {
    let query = this.db.collection('contacts').where('user_id', '==', String(userId));

    if (status === 'unsubscribed') {
      query = query.where('is_unsubscribed', '==', 1);
    } else if (status === 'bounced') {
      query = query.where('is_bounced', '==', 1);
    } else if (status === 'active') {
      query = query.where('is_unsubscribed', '==', 0).where('is_bounced', '==', 0);
    }

    const snap = await query.get();
    let contacts = [];
    snap.forEach(doc => {
      contacts.push({ id: doc.id, ...doc.data() });
    });

    if (search.trim()) {
      const s = search.toLowerCase().trim();
      contacts = contacts.filter(c =>
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.name && c.name.toLowerCase().includes(s))
      );
    }

    contacts.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const total = contacts.length;
    const offset = (Math.max(1, page) - 1) * limit;
    const paginated = contacts.slice(offset, offset + limit);

    return {
      contacts: paginated,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getContactByEmail(userId, email) {
    const cleanEmail = email.toLowerCase().trim();
    const snap = await this.db.collection('contacts')
      .where('user_id', '==', String(userId))
      .where('email', '==', cleanEmail)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }

  async createContact(contactData) {
    const cleanEmail = contactData.email.toLowerCase().trim();
    const docRef = await this.db.collection('contacts').add({
      ...contactData,
      user_id: String(contactData.user_id),
      email: cleanEmail,
      is_unsubscribed: contactData.is_unsubscribed || 0,
      is_bounced: contactData.is_bounced || 0,
      created_at: new Date().toISOString()
    });
    return { id: docRef.id, ...contactData };
  }

  async updateContact(id, updates) {
    await this.db.collection('contacts').doc(String(id)).update(updates);
    const doc = await this.db.collection('contacts').doc(String(id)).get();
    return { id: doc.id, ...doc.data() };
  }

  async deleteContact(id) {
    await this.db.collection('contacts').doc(String(id)).delete();
    return true;
  }

  // --- Groups ---
  async getGroups(userId) {
    const snap = await this.db.collection('groups').where('user_id', '==', String(userId)).get();
    const groups = [];
    snap.forEach(doc => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        ...data,
        member_count: Array.isArray(data.member_ids) ? data.member_ids.length : 0
      });
    });
    groups.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return groups;
  }

  async getGroupById(id, userId) {
    const doc = await this.db.collection('groups').doc(String(id)).get();
    if (!doc.exists) return null;
    const group = { id: doc.id, ...doc.data() };
    if (String(group.user_id) !== String(userId)) return null;

    // Fetch member contacts
    const memberIds = group.member_ids || [];
    const members = [];
    for (const mid of memberIds) {
      const cDoc = await this.db.collection('contacts').doc(String(mid)).get();
      if (cDoc.exists) members.push({ id: cDoc.id, ...cDoc.data() });
    }
    return { ...group, members };
  }

  async createGroup(groupData) {
    const docRef = await this.db.collection('groups').add({
      ...groupData,
      user_id: String(groupData.user_id),
      member_ids: groupData.member_ids || [],
      created_at: new Date().toISOString()
    });
    return { id: docRef.id, ...groupData, member_count: 0 };
  }

  async updateGroup(id, updates) {
    await this.db.collection('groups').doc(String(id)).update(updates);
    const doc = await this.db.collection('groups').doc(String(id)).get();
    return { id: doc.id, ...doc.data() };
  }

  async deleteGroup(id) {
    await this.db.collection('groups').doc(String(id)).delete();
    return true;
  }

  async addMembersToGroup(groupId, contactIds) {
    const docRef = this.db.collection('groups').doc(String(groupId));
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Group not found');
    const existingIds = new Set(doc.data().member_ids || []);
    contactIds.forEach(cid => existingIds.add(String(cid)));
    await docRef.update({ member_ids: Array.from(existingIds) });
    return true;
  }

  async removeMemberFromGroup(groupId, contactId) {
    const docRef = this.db.collection('groups').doc(String(groupId));
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Group not found');
    const memberIds = (doc.data().member_ids || []).filter(id => id !== String(contactId));
    await docRef.update({ member_ids: memberIds });
    return true;
  }

  // --- Templates ---
  async getTemplates(userId) {
    const snap = await this.db.collection('templates').where('user_id', '==', String(userId)).get();
    const templates = [];
    snap.forEach(doc => templates.push({ id: doc.id, ...doc.data() }));
    templates.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    return templates;
  }

  async getTemplateById(id, userId) {
    const doc = await this.db.collection('templates').doc(String(id)).get();
    if (!doc.exists) return null;
    const tpl = { id: doc.id, ...doc.data() };
    if (String(tpl.user_id) !== String(userId)) return null;
    return tpl;
  }

  async createTemplate(templateData) {
    const docRef = await this.db.collection('templates').add({
      ...templateData,
      user_id: String(templateData.user_id),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return { id: docRef.id, ...templateData };
  }

  async updateTemplate(id, updates) {
    await this.db.collection('templates').doc(String(id)).update({
      ...updates,
      updated_at: new Date().toISOString()
    });
    const doc = await this.db.collection('templates').doc(String(id)).get();
    return { id: doc.id, ...doc.data() };
  }

  async deleteTemplate(id) {
    await this.db.collection('templates').doc(String(id)).delete();
    return true;
  }

  // --- Campaigns ---
  async getCampaigns(userId, { status, page = 1, limit = 20 } = {}) {
    let query = this.db.collection('campaigns').where('user_id', '==', String(userId));
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }
    const snap = await query.get();
    const campaigns = [];
    snap.forEach(doc => campaigns.push({ id: doc.id, ...doc.data() }));
    campaigns.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const total = campaigns.length;
    const offset = (Math.max(1, page) - 1) * limit;
    const paginated = campaigns.slice(offset, offset + limit);

    return {
      campaigns: paginated,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getCampaignById(id, userId) {
    const doc = await this.db.collection('campaigns').doc(String(id)).get();
    if (!doc.exists) return null;
    const camp = { id: doc.id, ...doc.data() };
    if (userId && String(camp.user_id) !== String(userId)) return null;

    // Get recipients
    const recSnap = await this.db.collection('campaign_recipients').where('campaign_id', '==', String(id)).get();
    const recipients = [];
    recSnap.forEach(rDoc => recipients.push({ id: rDoc.id, ...rDoc.data() }));

    return { campaign: camp, recipients };
  }

  async createCampaign(campaignData) {
    const docRef = await this.db.collection('campaigns').add({
      ...campaignData,
      user_id: String(campaignData.user_id),
      status: campaignData.status || 'draft',
      sent_count: 0,
      failed_count: 0,
      bounced_count: 0,
      skipped_count: 0,
      opened_count: 0,
      clicked_count: 0,
      created_at: new Date().toISOString()
    });
    return { id: docRef.id, ...campaignData };
  }

  async updateCampaign(id, updates) {
    await this.db.collection('campaigns').doc(String(id)).update(updates);
    const doc = await this.db.collection('campaigns').doc(String(id)).get();
    return { id: doc.id, ...doc.data() };
  }

  // --- Campaign Recipients ---
  async createRecipients(recipientsList) {
    const batch = this.db.batch();
    const created = [];
    for (const r of recipientsList) {
      const docRef = this.db.collection('campaign_recipients').doc();
      const data = {
        ...r,
        campaign_id: String(r.campaign_id),
        status: r.status || 'pending',
        is_opened: 0,
        is_clicked: 0,
        created_at: new Date().toISOString()
      };
      batch.set(docRef, data);
      created.push({ id: docRef.id, ...data });
    }
    await batch.commit();
    return created;
  }

  async getRecipientByToken(tokenType, tokenValue) {
    const field = tokenType === 'tracking' ? 'tracking_token' : 'unsubscribe_token';
    const snap = await this.db.collection('campaign_recipients').where(field, '==', tokenValue).limit(1).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }

  async updateRecipient(id, updates) {
    await this.db.collection('campaign_recipients').doc(String(id)).update(updates);
    const doc = await this.db.collection('campaign_recipients').doc(String(id)).get();
    return { id: doc.id, ...doc.data() };
  }

  // --- Scheduled Jobs ---
  async createScheduledJob(jobData) {
    const docRef = await this.db.collection('scheduled_jobs').add({
      ...jobData,
      user_id: String(jobData.user_id),
      campaign_id: String(jobData.campaign_id),
      status: 'pending',
      created_at: new Date().toISOString()
    });
    return { id: docRef.id, ...jobData };
  }

  async getScheduledJobs(userId) {
    let query = this.db.collection('scheduled_jobs');
    if (userId) {
      query = query.where('user_id', '==', String(userId));
    }
    const snap = await query.get();
    const jobs = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      // Join campaign title
      let title = 'Scheduled Broadcast';
      let mode = 'same';
      let total_recipients = 0;
      if (data.campaign_id) {
        const cDoc = await this.db.collection('campaigns').doc(String(data.campaign_id)).get();
        if (cDoc.exists) {
          title = cDoc.data().title || title;
          mode = cDoc.data().mode || mode;
          total_recipients = cDoc.data().total_recipients || 0;
        }
      }
      jobs.push({ id: doc.id, ...data, title, mode, total_recipients });
    }
    jobs.sort((a, b) => new Date(a.run_at) - new Date(b.run_at));
    return jobs;
  }

  // --- Drafts ---
  async getDraft(userId) {
    const doc = await this.db.collection('drafts').doc(String(userId)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async saveDraft(userId, state) {
    await this.db.collection('drafts').doc(String(userId)).set({
      user_id: String(userId),
      state,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  }

  async deleteDraft(userId) {
    await this.db.collection('drafts').doc(String(userId)).delete();
    return true;
  }

  // --- Daily Quotas ---
  async getDailySentCount(userId, dateStr) {
    const docId = `${userId}_${dateStr}`;
    const doc = await this.db.collection('daily_send_logs').doc(docId).get();
    if (!doc.exists) return 0;
    return doc.data().count || 0;
  }

  async incrementDailySentCount(userId, dateStr) {
    const docId = `${userId}_${dateStr}`;
    const docRef = this.db.collection('daily_send_logs').doc(docId);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.update({ count: (doc.data().count || 0) + 1 });
    } else {
      await docRef.set({ user_id: String(userId), date: dateStr, count: 1 });
    }
    return true;
  }
}

const firestoreService = new FirestoreService();

module.exports = firestoreService;
