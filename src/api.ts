const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// DOM-based Toast notification (Fallback/Success)
function showToast(message: string) {
  if (typeof window === 'undefined') return;
  const existing = document.getElementById('ambis-toast');
  if (existing) document.body.removeChild(existing);

  const toast = document.createElement('div');
  toast.id = 'ambis-toast';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = '#a078ff'; // Primary tone
  toast.style.color = '#fff';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '9999px';
  toast.style.zIndex = '9999';
  toast.style.fontWeight = '600';
  toast.style.boxShadow = '0 0 20px rgba(160,120,255,0.4)';
  toast.style.transition = 'opacity 0.3s ease-in-out';
  toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(toast)) document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('ambis_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('ambis:unauthorized'));
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      let errorMsg = `Request failed with status ${res.status}`;
      try {
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (parsed.message) errorMsg = parsed.message;
      } catch (e) {
        // ignore parse error
      }
      throw new Error(errorMsg);
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : { success: true, data: [] };
    
    // Toast if backend actually worked
    if (!url.startsWith('/auth') && options?.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
      if (options.method === 'DELETE') showToast('Data berhasil dihapus (Cloud)!');
      else if (options.body && Object.keys(JSON.parse(options.body as string)).length > 2) showToast('Data berhasil disimpan (Cloud)!');
      else showToast('Data berhasil diperbarui (Cloud)!');
    }

    return data;
  } catch (error: any) {
    console.error(`[API Error] ${options?.method || 'GET'} ${url}:`, error.message);
    throw error;
  }
}

// ==================== TASKS ====================
export const taskApi = {
  getAll: (params?: { date?: string; completed?: string; priority?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: any[] }>(`/tasks${query ? `?${query}` : ''}`);
  },
  create: async (body: { title: string; description?: string; priority?: string; due_date?: string; estimated_minutes?: number; category?: string; tags?: string[] }) => {
    const res = await request<{ success: boolean; data: any }>('/tasks', { method: 'POST', body: JSON.stringify(body) });
    window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
    return res;
  },
  update: async (id: string, body: Record<string, any>) => {
    const res = await request<{ success: boolean; data: any }>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
    return res;
  },
  delete: async (id: string) => {
    const res = await request<{ success: boolean; message: string }>(`/tasks/${id}`, { method: 'DELETE' });
    window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
    return res;
  },
};

// ==================== STUDY SESSIONS ====================
export const studySessionApi = {
  getAll: () => request<{ success: boolean; data: any[] }>('/study-sessions'),
  create: async (body: { title?: string; start_time: string; end_time: string; duration_minutes: number; session_type?: string; takeaway?: string }) => {
    const res = await request<{ success: boolean; data: any }>('/study-sessions', { method: 'POST', body: JSON.stringify(body) });
    window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
    return res;
  },
  delete: async (id: string) => {
    const res = await request<{ success: boolean; message: string }>(`/study-sessions/${id}`, { method: 'DELETE' });
    window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
    return res;
  },
};

// ==================== GOALS ====================
export const goalApi = {
  getAll: () => request<{ success: boolean; data: any[] }>('/goals'),
  create: (body: { title: string; description?: string; deadline?: string; target_date?: string; category?: string; milestones?: any[] }) =>
    request<{ success: boolean; data: any }>('/goals', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/goals/${id}`, { method: 'DELETE' }),
};

// ==================== COMPETITIONS ====================
export const competitionApi = {
  getAll: () => request<{ success: boolean; data: any[] }>('/competitions'),
  create: (body: { title: string; description?: string; organizer?: string; type?: string; deadline?: string; status?: string; timeline?: any; outcome?: string; links?: any[]; documentation_images?: any[] }) =>
    request<{ success: boolean; data: any }>('/competitions', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/competitions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/competitions/${id}`, { method: 'DELETE' }),
};

// ==================== PROJECTS ====================
export const projectApi = {
  getAll: () => request<{ success: boolean; data: any[] }>('/projects'),
  create: (body: { title: string; description?: string; deadline?: string; status?: string; priority?: string; progress_percent?: number; logo_url?: string; category?: string; prd_url?: string; design_url?: string; repo_url?: string; demo_url?: string }) =>
    request<{ success: boolean; data: any }>('/projects', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/projects/${id}`, { method: 'DELETE' }),
  // Project Tasks (Kanban)
  createTask: (projectId: string, body: { title: string }) =>
    request<{ success: boolean; data: any }>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (projectId: string, taskId: string, body: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTask: (projectId: string, taskId: string) =>
    request<{ success: boolean; message: string }>(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),
};

// ==================== JOURNAL ====================
export const journalApi = {
  getAll: () => request<{ success: boolean; data: any[] }>('/journal'),
  create: (body: { title?: string; content: string; entry_date?: string; emotion_tag?: string }) =>
    request<{ success: boolean; data: any }>('/journal', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/journal/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/journal/${id}`, { method: 'DELETE' }),
};

// ==================== KNOWLEDGE ====================
export const knowledgeApi = {
  getAll: (params?: { category?: string; pinned?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: any[] }>(`/knowledge${query ? `?${query}` : ''}`);
  },
  getOne: (id: string) => request<{ success: boolean; data: any }>(`/knowledge/${id}`),
  create: (body: { title: string; content?: string; category?: string; is_pinned?: boolean; tags?: string[] }) =>
    request<{ success: boolean; data: any }>('/knowledge', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/knowledge/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/knowledge/${id}`, { method: 'DELETE' }),
};

// ==================== LEARNING ====================
export const learningApi = {
  getAll: (params?: { status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: any[] }>(`/learning${query ? `?${query}` : ''}`);
  },
  create: (body: { title: string; type?: string; url?: string; status?: string }) =>
    request<{ success: boolean; data: any }>('/learning', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/learning/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/learning/${id}`, { method: 'DELETE' }),
};

// ==================== ANALYTICS ====================
export const analyticsApi = {
  getSummary: () => request<{ success: boolean; data: any }>('/analytics/summary'),
};

// ==================== PROFILE / USER ====================
export const profileApi = {
  getProfile: () => request<{ success: boolean; user: any }>('/profile'),
  updateProfile: (body: { name?: string; avatar_url?: string; role_track?: string; bio?: string; github?: string; linkedin?: string; website?: string; workspace_name?: string; location?: string }) =>
    request<{ success: boolean; user: any }>('/profile', { method: 'PATCH', body: JSON.stringify(body) }),
};

// ==================== AUTH ====================
export const authApi = {
  login: (body: { email: string; password?: string }) =>
    request<{ success: boolean; data: { user: any; token: string }; message?: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: { name: string; email: string; password?: string }) =>
    request<{ success: boolean; data: { user: any; token: string }; message?: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  googleAuth: (body: { credential: string }) =>
    request<{ success: boolean; isNewUser: boolean; data: { user: any; token: string }; message?: string }>('/auth/google', { method: 'POST', body: JSON.stringify(body) }),
  completeOnboarding: (body: { name: string; avatar_url?: string; role_track?: string; workspace_name?: string; focus_target_hours?: number }) =>
    request<{ success: boolean; data: { user: any }; message?: string }>('/auth/complete-onboarding', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ambis_token') || ''}` }
    }),
};

// ==================== RITUALS ====================
export const ritualApi = {
  getAll: () => request<{ success: boolean; data: any[] }>('/rituals'),
  create: (body: { title: string; target_minutes?: string | number }) =>
    request<{ success: boolean; data: any }>('/rituals', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { title?: string; target_minutes?: number }) =>
    request<{ success: boolean; data: any }>(`/rituals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  toggle: (id: string) =>
    request<{ success: boolean; data: any }>(`/rituals/${id}/toggle`, { method: 'PATCH' }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/rituals/${id}`, { method: 'DELETE' }),
};