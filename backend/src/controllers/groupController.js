const { get, run, all } = require('../config/db');

const getGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const groups = await all(
      `SELECT g.*, COUNT(gc.contact_id) as member_count 
       FROM groups g 
       LEFT JOIN group_contacts gc ON g.id = gc.group_id 
       WHERE g.user_id = ? 
       GROUP BY g.id 
       ORDER BY g.name ASC`,
      [userId]
    );

    return res.json({ success: true, groups });
  } catch (err) {
    console.error('getGroups error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve groups.' });
  }
};

const getGroupById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const group = await get('SELECT * FROM groups WHERE id = ? AND user_id = ?', [id, userId]);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const members = await all(
      `SELECT c.* FROM contacts c 
       JOIN group_contacts gc ON c.id = gc.contact_id 
       WHERE gc.group_id = ? 
       ORDER BY c.email ASC`,
      [id]
    );

    return res.json({ success: true, group: { ...group, members } });
  } catch (err) {
    console.error('getGroupById error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve group details.' });
  }
};

const createGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Group name is required.' });
    }

    const result = await run(
      'INSERT INTO groups (user_id, name, description) VALUES (?, ?, ?)',
      [userId, name.trim(), description ? description.trim() : null]
    );

    const group = await get('SELECT * FROM groups WHERE id = ?', [result.lastID]);
    return res.status(201).json({ success: true, group });
  } catch (err) {
    console.error('createGroup error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create group.' });
  }
};

const updateGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description } = req.body;

    const group = await get('SELECT id FROM groups WHERE id = ? AND user_id = ?', [id, userId]);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const updates = [];
    const params = [];

    if (name && typeof name === 'string' && name.trim().length > 0) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ? description.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields provided to update.' });
    }

    params.push(id, userId);
    await run(`UPDATE groups SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

    const updated = await get('SELECT * FROM groups WHERE id = ?', [id]);
    return res.json({ success: true, group: updated });
  } catch (err) {
    console.error('updateGroup error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update group.' });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const group = await get('SELECT id FROM groups WHERE id = ? AND user_id = ?', [id, userId]);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    await run('DELETE FROM groups WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ success: true, message: 'Group deleted successfully.' });
  } catch (err) {
    console.error('deleteGroup error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete group.' });
  }
};

const addMembers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { contactIds = [] } = req.body;

    const group = await get('SELECT id FROM groups WHERE id = ? AND user_id = ?', [id, userId]);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one contact ID is required.' });
    }

    let addedCount = 0;
    for (const cid of contactIds) {
      // Verify contact belongs to the authenticated user to prevent IDOR
      const contact = await get('SELECT id FROM contacts WHERE id = ? AND user_id = ?', [cid, userId]);
      if (contact) {
        await run('INSERT OR IGNORE INTO group_contacts (group_id, contact_id) VALUES (?, ?)', [id, cid]);
        addedCount++;
      }
    }

    return res.json({ success: true, message: `Added ${addedCount} member(s) to group.` });
  } catch (err) {
    console.error('addMembers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to add members.' });
  }
};

const removeMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, contactId } = req.params;

    const group = await get('SELECT id FROM groups WHERE id = ? AND user_id = ?', [id, userId]);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    // Verify contact belongs to the authenticated user
    const contact = await get('SELECT id FROM contacts WHERE id = ? AND user_id = ?', [contactId, userId]);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found or does not belong to your account.' });
    }

    await run('DELETE FROM group_contacts WHERE group_id = ? AND contact_id = ?', [id, contactId]);
    return res.json({ success: true, message: 'Member removed from group.' });
  } catch (err) {
    console.error('removeMember error:', err);
    return res.status(500).json({ success: false, error: 'Failed to remove member.' });
  }
};

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addMembers,
  removeMember
};
