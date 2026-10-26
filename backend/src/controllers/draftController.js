const { get, run } = require('../config/db');

const getDraft = async (req, res) => {
  try {
    const userId = req.user.id;
    const draft = await get('SELECT * FROM drafts WHERE user_id = ?', [userId]);

    if (!draft) {
      return res.json({ success: true, draft: null });
    }

    let parsedState = {};
    try {
      parsedState = JSON.parse(draft.compose_state_json);
    } catch (e) {
      parsedState = {};
    }

    return res.json({
      success: true,
      draft: {
        id: draft.id,
        state: parsedState,
        updated_at: draft.updated_at
      }
    });
  } catch (err) {
    console.error('getDraft error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve draft.' });
  }
};

const saveDraft = async (req, res) => {
  try {
    const userId = req.user.id;
    const { state } = req.body;

    if (!state || typeof state !== 'object') {
      return res.status(400).json({ success: false, error: 'Valid state object is required.' });
    }

    const stateJson = JSON.stringify(state);

    await run(
      `INSERT INTO drafts (user_id, compose_state_json, updated_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP) 
       ON CONFLICT(user_id) DO UPDATE SET compose_state_json = ?, updated_at = CURRENT_TIMESTAMP`,
      [userId, stateJson, stateJson]
    );

    return res.json({ success: true, message: 'Draft saved successfully.' });
  } catch (err) {
    console.error('saveDraft error:', err);
    return res.status(500).json({ success: false, error: 'Failed to save draft.' });
  }
};

const deleteDraft = async (req, res) => {
  try {
    const userId = req.user.id;
    await run('DELETE FROM drafts WHERE user_id = ?', [userId]);
    return res.json({ success: true, message: 'Draft cleared.' });
  } catch (err) {
    console.error('deleteDraft error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete draft.' });
  }
};

module.exports = {
  getDraft,
  saveDraft,
  deleteDraft
};
