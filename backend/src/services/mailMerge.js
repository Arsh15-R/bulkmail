const { sanitizeEmailHtml } = require('../utils/sanitizer');

/**
 * Parses and merges template with data object.
 * Supports:
 *   {{name}} - simple placeholder
 *   {{name|valued customer}} - placeholder with fallback
 *
 * @param {string} template - Raw template string
 * @param {object} data - Key/value dictionary (e.g. from CSV or recipient)
 * @returns {object} { text, missingPlaceholders: string[] }
 */
const renderTemplate = (template, data = {}) => {
  if (!template || typeof template !== 'string') {
    return { text: '', missingPlaceholders: [] };
  }

  const missingPlaceholders = [];

  // Create case-insensitive lookup
  const normalizedData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) {
      normalizedData[k.trim().toLowerCase()] = String(v).trim();
    }
  }

  // Regex matches {{ key }} or {{ key | fallback }}
  const regex = /\{\{\s*([a-zA-Z0-9_-]+)(?:\s*\|\s*([^}]*))?\s*\}\}/g;

  const text = template.replace(regex, (match, key, fallback) => {
    const lookupKey = key.trim().toLowerCase();
    const val = normalizedData[lookupKey];

    if (val !== undefined && val !== '') {
      return val;
    }

    if (fallback !== undefined) {
      return fallback.trim();
    }

    // Missing and no fallback
    if (!missingPlaceholders.includes(key)) {
      missingPlaceholders.push(key);
    }
    return match; // Keep unresolved placeholder intact for highlighting
  });

  return { text, missingPlaceholders };
};

/**
 * Renders subject, HTML body, and plain text body for a recipient.
 */
const renderEmail = ({ subjectTemplate = '', htmlTemplate = '', textTemplate = '', data = {} }) => {
  const renderedSubject = renderTemplate(subjectTemplate, data);
  const renderedHtml = renderTemplate(htmlTemplate, data);
  const renderedText = renderTemplate(textTemplate, data);

  const missing = Array.from(
    new Set([
      ...renderedSubject.missingPlaceholders,
      ...renderedHtml.missingPlaceholders,
      ...renderedText.missingPlaceholders
    ])
  );

  // Sanitize subject line to prevent Email Header Injection (CRLF / SMTP Injection CWE-93)
  const cleanSubject = renderedSubject.text.replace(/[\r\n\x00-\x1F\x7F]+/g, ' ').trim();

  return {
    subject: cleanSubject,
    html: sanitizeEmailHtml(renderedHtml.text),
    text: renderedText.text,
    missingPlaceholders: missing,
    hasMissingPlaceholders: missing.length > 0
  };
};

module.exports = {
  renderTemplate,
  renderEmail
};
