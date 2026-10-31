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
      auth_provider: 'local',
      avatar_url: null,
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
      auth_provider: user.auth_provider || 'local',
      avatar_url: user.avatar_url || null,
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
      'SELECT id, name, email, auth_provider, avatar_url, daily_send_limit, dark_mode, created_at FROM users WHERE id = ?',
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
        auth_provider: user.auth_provider || 'local',
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
    const { name, dark_mode, daily_send_limit, avatar_url } = req.body;
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

    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatar_url && typeof avatar_url === 'string' && avatar_url.trim().length > 0 ? avatar_url.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields provided for update.' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.user.id);

    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const updatedUser = await get(
      'SELECT id, name, email, auth_provider, avatar_url, daily_send_limit, dark_mode FROM users WHERE id = ?',
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

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 72) {
      return res.status(400).json({ success: false, error: 'New password must be between 6 and 72 characters long.' });
    }

    const user = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // If account was created via Google SSO with no password yet
    if (!user.password_hash) {
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);
      await run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        newHash,
        req.user.id
      ]);
      return res.json({ success: true, message: 'Password set successfully.' });
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ success: false, error: 'Current password is required.' });
    }

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

/**
 * Public endpoint to get configured Google Client ID for GIS frontend initialization.
 */
const getGoogleClientId = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || null;
  return res.json({
    success: true,
    clientId,
    isConfigured: !!clientId
  });
};

/**
 * Google OAuth Authentication handler.
 * Verifies ID token or access token and logs in/registers user.
 */
const googleAuth = async (req, res) => {
  try {
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Google authentication credential or access token is required.'
      });
    }

    let email = '';
    let name = '';
    let googleId = '';
    let avatarUrl = null;

    if (credential) {
      // Verify Google ID token using Google tokeninfo API
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );

      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        console.warn('Google token verification failed:', errText);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired Google authentication token.'
        });
      }

      const payload = await verifyRes.json();

      if (!payload.email || (payload.email_verified !== 'true' && payload.email_verified !== true)) {
        return res.status(401).json({
          success: false,
          error: 'Unverified Google email address. Please use a verified Google account.'
        });
      }

      email = payload.email.toLowerCase().trim();
      name = (payload.name || payload.given_name || email.split('@')[0]).trim();
      googleId = payload.sub;
      avatarUrl = payload.picture || null;
    } else if (accessToken) {
      // Verify Google OAuth2 access token
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userinfoRes.ok) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Google OAuth access token.'
        });
      }

      const payload = await userinfoRes.json();
      if (!payload.email) {
        return res.status(401).json({
          success: false,
          error: 'No email found in Google account profile.'
        });
      }

      email = payload.email.toLowerCase().trim();
      name = (payload.name || payload.given_name || email.split('@')[0]).trim();
      googleId = payload.sub;
      avatarUrl = payload.picture || null;
    }

    // Find or Create User in Supabase PostgreSQL
    let user = await get('SELECT * FROM users WHERE email = ?', [email]);

    if (user) {
      await run(
        `UPDATE users 
         SET google_id = COALESCE(?, google_id), 
             avatar_url = COALESCE(?, avatar_url),
             auth_provider = CASE WHEN auth_provider = 'local' THEN 'google_linked' ELSE auth_provider END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [googleId, avatarUrl, user.id]
      );
      user = await get('SELECT * FROM users WHERE id = ?', [user.id]);
    } else {
      const insertResult = await run(
        `INSERT INTO users (name, email, password_hash, google_id, avatar_url, auth_provider, daily_send_limit, dark_mode) 
         VALUES (?, ?, NULL, ?, ?, 'google', 500, 0)`,
        [name, email, googleId, avatarUrl]
      );
      user = await get('SELECT * FROM users WHERE id = ?', [insertResult.lastID]);
    }

    // Calculate today's sent quota
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
      avatar_url: user.avatar_url || avatarUrl,
      auth_provider: user.auth_provider || 'google',
      daily_send_limit: dailyLimit,
      dark_mode: user.dark_mode || 0,
      sent_today: sentToday,
      remaining_today: Math.max(0, dailyLimit - sentToday)
    };

    const token = generateToken(safeUser);

    return res.json({
      success: true,
      message: 'Google login successful.',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('googleAuth error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during Google authentication.' });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  updateSettings,
  changePassword,
  getGoogleClientId,
  googleAuth
};
