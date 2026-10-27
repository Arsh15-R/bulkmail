const bcrypt = require('bcryptjs');
const validator = require('validator');
const { get, run } = require('../config/db');
const { generateToken } = require('../middleware/auth');

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'Full name is required (maximum 100 characters).' });
    }

    if (!email || typeof email !== 'string' || !validator.isEmail(email) || email.length > 254) {
      return res.status(400).json({ success: false, error: 'A valid email address is required (maximum 254 characters).' });
    }

    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 72) {
      return res.status(400).json({ success: false, error: 'Password must be between 6 and 72 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await run(
      'INSERT INTO users (name, email, password_hash, daily_send_limit, dark_mode) VALUES (?, ?, ?, 500, 0)',
      [name.trim(), cleanEmail, passwordHash]
    );

    const user = {
      id: result.lastID,
      name: name.trim(),
      email: cleanEmail,
      daily_send_limit: 500,
      dark_mode: 0,
      sent_today: 0,
      remaining_today: 500
    };

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof password !== 'string' || password.length > 72) {
      return res.status(400).json({ success: false, error: 'Valid email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await get('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const log = await get('SELECT count FROM daily_send_logs WHERE user_id = ? AND date = ?', [
      user.id,
      today
    ]);
    const sentToday = log ? Number(log.count) : 0;
    const dailyLimit = user.daily_send_limit || 500;

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      daily_send_limit: dailyLimit,
      dark_mode: user.dark_mode,
      sent_today: sentToday,
      remaining_today: Math.max(0, dailyLimit - sentToday)
    };

    const token = generateToken(safeUser);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await get(
      'SELECT id, name, email, daily_send_limit, dark_mode, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Get today's sent count
    const today = new Date().toISOString().split('T')[0];
    const log = await get('SELECT count FROM daily_send_logs WHERE user_id = ? AND date = ?', [
      req.user.id,
      today
    ]);
    const sentToday = log ? Number(log.count) : 0;
    const dailyLimit = user.daily_send_limit || 500;

    return res.json({
      success: true,
      user: {
        ...user,
        daily_send_limit: dailyLimit,
        sent_today: sentToday,
        remaining_today: Math.max(0, dailyLimit - sentToday)
      }
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve user profile.' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { name, dark_mode, daily_send_limit } = req.body;
    const updates = [];
    const params = [];

    if (typeof name === 'string' && name.trim().length > 0) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (dark_mode !== undefined) {
      updates.push('dark_mode = ?');
      params.push(dark_mode ? 1 : 0);
    }

    if (daily_send_limit !== undefined && Number.isInteger(Number(daily_send_limit)) && Number(daily_send_limit) > 0) {
      updates.push('daily_send_limit = ?');
      params.push(Number(daily_send_limit));
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields provided for update.' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.user.id);

    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const updatedUser = await get(
      'SELECT id, name, email, daily_send_limit, dark_mode FROM users WHERE id = ?',
      [req.user.id]
    );

    return res.json({
      success: true,
      message: 'Settings updated successfully.',
      user: updatedUser
    });
  } catch (err) {
    console.error('updateSettings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update user settings.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, error: 'Both current and new password are required.' });
    }

    if (newPassword.length < 6 || newPassword.length > 72) {
      return res.status(400).json({ success: false, error: 'New password must be between 6 and 72 characters long.' });
    }

    const user = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      newHash,
      req.user.id
    ]);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ success: false, error: 'Failed to change password.' });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  updateSettings,
  changePassword
};
