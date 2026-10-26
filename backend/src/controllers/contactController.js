const validator = require('validator');
const { get, run, all } = require('../config/db');

const getContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search = '', status = 'all', groupId, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    let query = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM group_contacts gc WHERE gc.contact_id = c.id) as group_count
      FROM contacts c
      WHERE c.user_id = ?
    `;
    const params = [userId];

    if (search.trim()) {
      query += ` AND (c.email LIKE ? OR c.name LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (status === 'unsubscribed') {
      query += ` AND c.is_unsubscribed = 1`;
    } else if (status === 'bounced') {
      query += ` AND c.is_bounced = 1`;
    } else if (status === 'active') {
      query += ` AND c.is_unsubscribed = 0 AND c.is_bounced = 0`;
    }

    if (groupId) {
      query += ` AND c.id IN (SELECT contact_id FROM group_contacts WHERE group_id = ?)`;
      params.push(groupId);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const countRow = await get(countQuery, params);
    const total = countRow ? countRow.total : 0;

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), offset);

    const contacts = await all(query, params);

    const parsedContacts = contacts.map(c => {
      let meta = {};
      if (c.metadata_json) {
        try { meta = JSON.parse(c.metadata_json); } catch (e) {}
      }
      return { ...c, metadata: meta };
    });

    return res.json({
      success: true,
      contacts: parsedContacts,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('getContacts error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve contacts.' });
  }
};

const createContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, name, metadata, groupId } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ success: false, error: 'Valid email is required.' });
    }

    if (groupId) {
      const userGroup = await get('SELECT id FROM groups WHERE id = ? AND user_id = ?', [groupId, userId]);
      if (!userGroup) {
        return res.status(404).json({ success: false, error: 'Target group not found or does not belong to your account.' });
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await get('SELECT id FROM contacts WHERE user_id = ? AND email = ?', [userId, cleanEmail]);

    if (existing) {
      return res.status(409).json({ success: false, error: 'A contact with this email already exists in your contacts.' });
    }

    const metaStr = metadata ? JSON.stringify(metadata) : null;
    const result = await run(
      'INSERT INTO contacts (user_id, email, name, metadata_json) VALUES (?, ?, ?, ?)',
      [userId, cleanEmail, name ? name.trim() : null, metaStr]
    );

    const contactId = result.lastID;

    if (groupId) {
      await run('INSERT OR IGNORE INTO group_contacts (group_id, contact_id) VALUES (?, ?)', [groupId, contactId]);
    }

    const contact = await get('SELECT * FROM contacts WHERE id = ?', [contactId]);
    return res.status(201).json({ success: true, contact });
  } catch (err) {
    console.error('createContact error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create contact.' });
  }
};

const updateContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { email, name, metadata, is_unsubscribed, is_bounced } = req.body;

    const contact = await get('SELECT * FROM contacts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found.' });
    }

    const updates = [];
    const params = [];

    if (email && validator.isEmail(email)) {
      updates.push('email = ?');
      params.push(email.trim().toLowerCase());
    }

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name ? name.trim() : null);
    }

    if (metadata !== undefined) {
      updates.push('metadata_json = ?');
      params.push(JSON.stringify(metadata));
    }

    if (is_unsubscribed !== undefined) {
      updates.push('is_unsubscribed = ?');
      params.push(is_unsubscribed ? 1 : 0);
      if (is_unsubscribed && !contact.is_unsubscribed) {
        updates.push('unsubscribed_at = CURRENT_TIMESTAMP');
      }
    }

    if (is_bounced !== undefined) {
      updates.push('is_bounced = ?');
      params.push(is_bounced ? 1 : 0);
      if (is_bounced && !contact.is_bounced) {
        updates.push('bounced_at = CURRENT_TIMESTAMP');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update.' });
    }

    params.push(id, userId);
    await run(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

    const updated = await get('SELECT * FROM contacts WHERE id = ?', [id]);
    return res.json({ success: true, contact: updated });
  } catch (err) {
    console.error('updateContact error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update contact.' });
  }
};

const deleteContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const contact = await get('SELECT id FROM contacts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found.' });
    }

    await run('DELETE FROM contacts WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ success: true, message: 'Contact deleted successfully.' });
  } catch (err) {
    console.error('deleteContact error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete contact.' });
  }
};

const importContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contacts = [], groupId } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, error: 'No contacts provided in request.' });
    }

    if (groupId) {
      const userGroup = await get('SELECT id FROM groups WHERE id = ? AND user_id = ?', [groupId, userId]);
      if (!userGroup) {
        return res.status(404).json({ success: false, error: 'Target group not found or does not belong to your account.' });
      }
    }

    let inserted = 0;
    let skipped = 0;
    let updated = 0;

    for (const item of contacts) {
      const email = item.email ? String(item.email).trim().toLowerCase() : '';
      if (!email || !validator.isEmail(email)) {
        skipped++;
        continue;
      }

      const name = item.name ? String(item.name).trim() : null;
      const metadata = { ...item };
      delete metadata.email;
      delete metadata.name;

      const metaStr = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;

      const existing = await get('SELECT id FROM contacts WHERE user_id = ? AND email = ?', [userId, email]);
      let contactId;

      if (existing) {
        contactId = existing.id;
        await run(
          'UPDATE contacts SET name = COALESCE(?, name), metadata_json = COALESCE(?, metadata_json) WHERE id = ?',
          [name, metaStr, contactId]
        );
        updated++;
      } else {
        const result = await run(
          'INSERT INTO contacts (user_id, email, name, metadata_json) VALUES (?, ?, ?, ?)',
          [userId, email, name, metaStr]
        );
        contactId = result.lastID;
        inserted++;
      }

      if (groupId && contactId) {
        await run('INSERT OR IGNORE INTO group_contacts (group_id, contact_id) VALUES (?, ?)', [groupId, contactId]);
      }
    }

    return res.json({
      success: true,
      message: `Import completed: ${inserted} added, ${updated} updated, ${skipped} skipped (invalid).`,
      stats: { inserted, updated, skipped, total: contacts.length }
    });
  } catch (err) {
    console.error('importContacts error:', err);
    return res.status(500).json({ success: false, error: 'Failed to import contacts.' });
  }
};

module.exports = {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContacts
};
