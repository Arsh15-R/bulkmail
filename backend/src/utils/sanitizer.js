const sanitizeHtml = require('sanitize-html');

const sanitizeEmailHtml = (dirtyHtml) => {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

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
      'a': sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' })
    },
    allowedSchemes: ['http', 'https', 'mailto', 'cid', 'data'],
    allowProtocolRelative: false
  });
};

module.exports = { sanitizeEmailHtml };
