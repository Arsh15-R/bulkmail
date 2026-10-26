const { get, run, all } = require('../config/db');
const { sanitizeEmailHtml } = require('../utils/sanitizer');

const getTemplates = async (req, res) => {
  try {
    const userId = req.user.id;
    const templates = await all(
      'SELECT id, name, subject, body_html, body_text, created_at, updated_at FROM templates WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );

    return res.json({ success: true, templates });
  } catch (err) {
    console.error('getTemplates error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve templates.' });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const template = await get('SELECT * FROM templates WHERE id = ? AND user_id = ?', [id, userId]);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found.' });
    }

    return res.json({ success: true, template });
  } catch (err) {
    console.error('getTemplateById error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve template.' });
  }
};

const createTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, subject, body_html, body_text } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Template name is required.' });
    }

    if (!body_html || typeof body_html !== 'string' || body_html.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Template HTML body is required.' });
    }

    const cleanHtml = sanitizeEmailHtml(body_html);

    const result = await run(
      'INSERT INTO templates (user_id, name, subject, body_html, body_text) VALUES (?, ?, ?, ?, ?)',
      [userId, name.trim(), subject ? subject.trim() : '', cleanHtml, body_text ? body_text.trim() : '']
    );

    const template = await get('SELECT * FROM templates WHERE id = ?', [result.lastID]);
    return res.status(201).json({ success: true, template });
  } catch (err) {
    console.error('createTemplate error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create template.' });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, subject, body_html, body_text } = req.body;

    const template = await get('SELECT id FROM templates WHERE id = ? AND user_id = ?', [id, userId]);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found.' });
    }

    const updates = [];
    const params = [];

    if (name && typeof name === 'string' && name.trim().length > 0) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (subject !== undefined) {
      updates.push('subject = ?');
      params.push(subject ? subject.trim() : '');
    }

    if (body_html !== undefined) {
      updates.push('body_html = ?');
      params.push(sanitizeEmailHtml(body_html));
    }

    if (body_text !== undefined) {
      updates.push('body_text = ?');
      params.push(body_text ? body_text.trim() : '');
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields provided for update.' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id, userId);

    await run(`UPDATE templates SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

    const updated = await get('SELECT * FROM templates WHERE id = ?', [id]);
    return res.json({ success: true, template: updated });
  } catch (err) {
    console.error('updateTemplate error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update template.' });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const template = await get('SELECT id FROM templates WHERE id = ? AND user_id = ?', [id, userId]);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found.' });
    }

    await run('DELETE FROM templates WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ success: true, message: 'Template deleted successfully.' });
  } catch (err) {
    console.error('deleteTemplate error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete template.' });
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
