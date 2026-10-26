let sanitizeHtml = null;

try {
  sanitizeHtml = require('sanitize-html');
} catch (e) {
  // If require fails due to ESM in Node 22/24, load via dynamic import
  import('sanitize-html')
    .then((m) => {
      sanitizeHtml = m.default || m;
    })
    .catch(() => {});
}

const fallbackSanitize = (html) => {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*(["'])?[^"'>]+(\1)?/gi, '')
    .replace(/javascript:[^"'>]+/gi, '');
};

const sanitizeEmailHtml = (dirtyHtml) => {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  if (typeof sanitizeHtml === 'function') {
    try {
      return sanitizeHtml(dirtyHtml, {
        allowedTags: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
          'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
          'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span',
          'img', 'center', 'font', 'u', 's', 'sub', 'sup'
        ],
        allowedAttributes: {
          a: ['href', 'name', 'target', 'rel', 'style', 'class'],
          img: ['src', 'alt', 'title', 'width', 'height', 'style', 'class'],
          '*': ['style', 'class', 'align', 'valign', 'bgcolor', 'color', 'border', 'cellpadding', 'cellspacing', 'width', 'height']
        },
        transformTags: {
          a: sanitizeHtml.simpleTransform
            ? sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' })
            : undefined
        },
        allowedSchemes: ['http', 'https', 'mailto', 'cid', 'data'],
        allowProtocolRelative: false
      });
    } catch (err) {
      return fallbackSanitize(dirtyHtml);
    }
  }

  return fallbackSanitize(dirtyHtml);
};

module.exports = { sanitizeEmailHtml };
