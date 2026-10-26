const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

const getHeaders = (isJson = true) => {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('bm_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('bm_token');
    localStorage.removeItem('bm_user');
    window.dispatchEvent(new Event('bm_auth_logout'));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
};

export const api = {
  // Auth
  auth: {
    login: async (email, password) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return handleResponse(res);
    },
    signup: async (name, email, password) => {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      return handleResponse(res);
    },
    me: async () => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    updateSettings: async (settings) => {
      const res = await fetch(`${API_BASE}/auth/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(settings)
      });
      return handleResponse(res);
    },
    changePassword: async (currentPassword, newPassword) => {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      return handleResponse(res);
    }
  },

  // Contacts
  contacts: {
    list: async (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/contacts?${qs}`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    create: async (contactData) => {
      const res = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(contactData)
      });
      return handleResponse(res);
    },
    update: async (id, contactData) => {
      const res = await fetch(`${API_BASE}/contacts/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(contactData)
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/contacts/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    import: async (contacts, groupId = null) => {
      const res = await fetch(`${API_BASE}/contacts/import`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ contacts, groupId })
      });
      return handleResponse(res);
    }
  },

  // Groups
  groups: {
    list: async () => {
      const res = await fetch(`${API_BASE}/groups`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    get: async (id) => {
      const res = await fetch(`${API_BASE}/groups/${id}`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    create: async (groupData) => {
      const res = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(groupData)
      });
      return handleResponse(res);
    },
    update: async (id, groupData) => {
      const res = await fetch(`${API_BASE}/groups/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(groupData)
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/groups/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    addMembers: async (id, contactIds) => {
      const res = await fetch(`${API_BASE}/groups/${id}/members`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ contactIds })
      });
      return handleResponse(res);
    },
    removeMember: async (id, contactId) => {
      const res = await fetch(`${API_BASE}/groups/${id}/members/${contactId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return handleResponse(res);
    }
  },

  // Templates
  templates: {
    list: async () => {
      const res = await fetch(`${API_BASE}/templates`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    get: async (id) => {
      const res = await fetch(`${API_BASE}/templates/${id}`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    create: async (templateData) => {
      const res = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(templateData)
      });
      return handleResponse(res);
    },
    update: async (id, templateData) => {
      const res = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(templateData)
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return handleResponse(res);
    }
  },

  // Send
  send: {
    preview: async (payload) => {
      const res = await fetch(`${API_BASE}/send/preview`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse(res);
    },
    cleanup: async (recipients) => {
      const res = await fetch(`${API_BASE}/send/cleanup`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ recipients })
      });
      return handleResponse(res);
    },
    sendNow: async (payload) => {
      const res = await fetch(`${API_BASE}/send/now`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse(res);
    },
    sendTest: async (payload) => {
      const res = await fetch(`${API_BASE}/send/test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse(res);
    },
    verifySmtp: async () => {
      const res = await fetch(`${API_BASE}/send/verify-smtp`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    }
  },

  // History
  history: {
    list: async (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/history?${qs}`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    get: async (id) => {
      const res = await fetch(`${API_BASE}/history/${id}`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    retryFailed: async (id) => {
      const res = await fetch(`${API_BASE}/history/${id}/retry-failed`, {
        method: 'POST',
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    exportCsvUrl: (id) => {
      const token = localStorage.getItem('bm_token');
      return `${API_BASE}/history/${id}/export?token=${token}`;
    }
  },

  // Schedule
  schedule: {
    list: async () => {
      const res = await fetch(`${API_BASE}/schedule`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    create: async (payload) => {
      const res = await fetch(`${API_BASE}/schedule`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse(res);
    },
    update: async (id, runAt) => {
      const res = await fetch(`${API_BASE}/schedule/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ runAt })
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/schedule/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return handleResponse(res);
    }
  },

  // Drafts
  drafts: {
    get: async () => {
      const res = await fetch(`${API_BASE}/drafts`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    save: async (state) => {
      const res = await fetch(`${API_BASE}/drafts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ state })
      });
      return handleResponse(res);
    },
    delete: async () => {
      const res = await fetch(`${API_BASE}/drafts`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return handleResponse(res);
    }
  },

  // Upload
  upload: {
    files: async (fileList) => {
      const formData = new FormData();
      for (const file of fileList) {
        formData.append('files', file);
      }
      const token = localStorage.getItem('bm_token');
      const res = await fetch(`${API_BASE}/upload/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      return handleResponse(res);
    },
    zipAttachments: async (zipFile) => {
      const formData = new FormData();
      formData.append('zipFile', zipFile);
      const token = localStorage.getItem('bm_token');
      const res = await fetch(`${API_BASE}/upload/zip-attachments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      return handleResponse(res);
    }
  }
};
