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

// Background Sync Request (Silent Fail)
async function request<T>(url: string, options?: RequestInit): Promise<T | null> {
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
      return null;
    }

    if (!res.ok) {
      // SILENT FAIL
      console.warn(`[Background Sync] ${url}: Request failed with status ${res.status}`);
      return null;
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : { success: true, data: [] };
    return data;
  } catch (error: any) {
    // SILENT FAIL
    console.warn(`[Background Sync] ${options?.method || 'GET'} ${url}:`, error.message);
    return null;
  }
}

// ==================== LOCAL STORAGE ADAPTER ====================
function getLocal(key: string) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function setLocal(key: string, data: any[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
  return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
}

function handleLocalOperation(key: string, operation: 'GET' | 'POST' | 'PATCH' | 'DELETE', payload?: any, id?: string) {
  const data = getLocal(key);
  
  if (operation === 'GET') {
    return { success: true, data };
  }
  
  if (operation === 'POST') {
    const newItem = { id: generateId(), created_at: new Date().toISOString(), ...payload };
    setLocal(key, [...data, newItem]);
    showToast('Tersimpan!');
    return { success: true, data: newItem };
  }
  
  if (operation === 'PATCH') {
    const index = data.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...payload, updated_at: new Date().toISOString() };
      setLocal(key, data);
      showToast('Tersimpan!');
      return { success: true, data: data[index] };
    }
    return { success: false, message: 'Item not found' };
  }
  
  if (operation === 'DELETE') {
    const newData = data.filter((item: any) => item.id !== id);
    setLocal(key, newData);
    showToast('Data dihapus!');
    return { success: true, message: 'Deleted' };
  }
  
  return { success: false, message: 'Unknown operation' };
}

// ==================== TASKS ====================
export const taskApi = {
  getAll: async (_params?: { date?: string; completed?: string; priority?: string }) => {
    request(`/tasks`, { method: 'GET' }); // background sync
    return handleLocalOperation('ambis_tasks', 'GET');
  },
  create: async (body: { title: string; description?: string; priority?: string; due_date?: string; estimated_minutes?: number; category?: string; tags?: string[] }) => {
    request('/tasks', { method: 'POST', body: JSON.stringify(body) }); // background sync
    const res = handleLocalOperation('ambis_tasks', 'POST', { ...body, is_completed: false });
    window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
    return res;
  },
  update: async (id: string, body: Record<string, any>) => {
    request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); // background sync
    const res = handleLocalOperation('ambis_tasks', 'PATCH', body, id);
    window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
    return res;
  },
  delete: async (id: string) => {
    request(`/tasks/${id}`, { method: 'DELETE' }); // background sync
    const res = handleLocalOperation('ambis_tasks', 'DELETE', undefined, id);
    window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
    return res;
  },
};

// ==================== STUDY SESSIONS ====================
export const studySessionApi = {
  getAll: async () => {
    request('/study-sessions');
    return handleLocalOperation('ambis_sessions', 'GET');
  },
  create: async (body: { title?: string; start_time: string; end_time: string; duration_minutes: number; session_type?: string; takeaway?: string }) => {
    request('/study-sessions', { method: 'POST', body: JSON.stringify(body) });
    const res = handleLocalOperation('ambis_sessions', 'POST', body);
    window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
    return res;
  },
  delete: async (id: string) => {
    request(`/study-sessions/${id}`, { method: 'DELETE' });
    const res = handleLocalOperation('ambis_sessions', 'DELETE', undefined, id);
    window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
    return res;
  },
};

// ==================== GOALS ====================
export const goalApi = {
  getAll: async () => {
    request('/goals');
    return handleLocalOperation('ambis_goals', 'GET');
  },
  create: async (body: { title: string; description?: string; deadline?: string; target_date?: string; category?: string; milestones?: any[] }) => {
    request('/goals', { method: 'POST', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_goals', 'POST', body);
  },
  update: async (id: string, body: Record<string, any>) => {
    request(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_goals', 'PATCH', body, id);
  },
  delete: async (id: string) => {
    request(`/goals/${id}`, { method: 'DELETE' });
    return handleLocalOperation('ambis_goals', 'DELETE', undefined, id);
  },
};

// ==================== COMPETITIONS ====================
export const competitionApi = {
  getAll: async () => {
    request('/competitions');
    return handleLocalOperation('ambis_competitions', 'GET');
  },
  create: async (body: { title: string; description?: string; organizer?: string; type?: string; deadline?: string; status?: string; timeline?: any; outcome?: string; links?: any[]; documentation_images?: any[] }) => {
    request('/competitions', { method: 'POST', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_competitions', 'POST', body);
  },
  update: async (id: string, body: Record<string, any>) => {
    request(`/competitions/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_competitions', 'PATCH', body, id);
  },
  delete: async (id: string) => {
    request(`/competitions/${id}`, { method: 'DELETE' });
    return handleLocalOperation('ambis_competitions', 'DELETE', undefined, id);
  },
};

// ==================== PROJECTS ====================
export const projectApi = {
  getAll: async () => {
    request('/projects');
    return handleLocalOperation('ambis_projects', 'GET');
  },
  create: async (body: { title: string; description?: string; deadline?: string; status?: string; priority?: string; progress_percent?: number; logo_url?: string; category?: string; prd_url?: string; design_url?: string; repo_url?: string; demo_url?: string }) => {
    request('/projects', { method: 'POST', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_projects', 'POST', body);
  },
  update: async (id: string, body: Record<string, any>) => {
    request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_projects', 'PATCH', body, id);
  },
  delete: async (id: string) => {
    request(`/projects/${id}`, { method: 'DELETE' });
    return handleLocalOperation('ambis_projects', 'DELETE', undefined, id);
  },
  // Project Tasks (Kanban)
  createTask: async (projectId: string, body: { title: string }) => {
    request(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) });
    return handleLocalOperation(`ambis_project_tasks_${projectId}`, 'POST', body);
  },
  updateTask: async (projectId: string, taskId: string, body: Record<string, any>) => {
    request(`/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) });
    return handleLocalOperation(`ambis_project_tasks_${projectId}`, 'PATCH', body, taskId);
  },
  deleteTask: async (projectId: string, taskId: string) => {
    request(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
    return handleLocalOperation(`ambis_project_tasks_${projectId}`, 'DELETE', undefined, taskId);
  },
};

// ==================== JOURNAL ====================
export const journalApi = {
  getAll: async () => {
    request('/journal');
    return handleLocalOperation('ambis_journal', 'GET');
  },
  create: async (body: { title?: string; content: string; entry_date?: string; emotion_tag?: string }) => {
    request('/journal', { method: 'POST', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_journal', 'POST', body);
  },
  update: async (id: string, body: Record<string, any>) => {
    request(`/journal/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_journal', 'PATCH', body, id);
  },
  delete: async (id: string) => {
    request(`/journal/${id}`, { method: 'DELETE' });
    return handleLocalOperation('ambis_journal', 'DELETE', undefined, id);
  },
};

// ==================== KNOWLEDGE ====================
export const knowledgeApi = {
  getAll: async (_params?: { category?: string; pinned?: string }) => {
    request('/knowledge');
    return handleLocalOperation('ambis_knowledge', 'GET');
  },
  getOne: async (id: string) => {
    request(`/knowledge/${id}`);
    const data = getLocal('ambis_knowledge');
    const item = data.find((i: any) => i.id === id);
    return { success: !!item, data: item || null };
  },
  create: async (body: { title: string; content?: string; category?: string; is_pinned?: boolean; tags?: string[] }) => {
    request('/knowledge', { method: 'POST', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_knowledge', 'POST', body);
  },
  update: async (id: string, body: Record<string, any>) => {
    request(`/knowledge/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_knowledge', 'PATCH', body, id);
  },
  delete: async (id: string) => {
    request(`/knowledge/${id}`, { method: 'DELETE' });
    return handleLocalOperation('ambis_knowledge', 'DELETE', undefined, id);
  },
};

// ==================== LEARNING ====================
export const learningApi = {
  getAll: async (_params?: { status?: string }) => {
    request('/learning');
    return handleLocalOperation('ambis_learning', 'GET');
  },
  create: async (body: { title: string; type?: string; url?: string; status?: string }) => {
    request('/learning', { method: 'POST', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_learning', 'POST', body);
  },
  update: async (id: string, body: Record<string, any>) => {
    request(`/learning/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_learning', 'PATCH', body, id);
  },
  delete: async (id: string) => {
    request(`/learning/${id}`, { method: 'DELETE' });
    return handleLocalOperation('ambis_learning', 'DELETE', undefined, id);
  },
};

// ==================== ANALYTICS ====================
export const analyticsApi = {
  getSummary: async () => {
    // Generate mock analytics based on local data
    const tasks = getLocal('ambis_tasks');
    const rituals = getLocal('ambis_rituals');
    return {
      success: true,
      data: {
        total_xp: 0,
        current_streak: 0,
        tasks_completed: tasks.filter((t: any) => t.is_completed).length,
        study_hours: 0,
        rituals_completed: rituals.length
      }
    };
  },
};

// ==================== PROFILE / USER ====================
export const profileApi = {
  getProfile: async () => {
    const res = await request<{ success: boolean; user: any }>('/profile');
    if (res && res.success) return res;
    return { success: true, user: getLocal('ambis_profile')[0] || { name: 'User' } };
  },
  updateProfile: async (body: any): Promise<{ success: boolean; user: any }> => {
    request('/profile', { method: 'PATCH', body: JSON.stringify(body) });
    const res: any = handleLocalOperation('ambis_profile', 'POST', body);
    return { success: res.success, user: res.data };
  },
};

// ==================== AUTH ====================
export const authApi = {
  getMe: async () => {
    const res = await request<{ success: boolean; user: any }>('/auth/me');
    if (res && res.success) return res;
    return { success: true, user: { id: 'local', name: 'Local User' } };
  },
  login: async (body: { email: string; password?: string }) => {
    const res = await request<{ success: boolean; data: { user: any; token: string }; message?: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    if (res && res.success) return res;
    return { success: true, data: { user: { email: body.email }, token: 'local_token' } };
  },
  register: async (body: { name: string; email: string; password?: string }) => {
    const res = await request<{ success: boolean; data: { user: any; token: string }; message?: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    if (res && res.success) return res;
    return { success: true, data: { user: { email: body.email, name: body.name }, token: 'local_token' } };
  },
  googleAuth: async (body: { credential: string }) => {
    const res = await request<{ success: boolean; isNewUser: boolean; data: { user: any; token: string }; message?: string }>('/auth/google', { method: 'POST', body: JSON.stringify(body) });
    if (res && res.success) return res;
    return { success: true, isNewUser: false, data: { user: { name: 'Google User' }, token: 'local_token' } };
  },
  completeOnboarding: async (body: any) => {
    const res = await request<{ success: boolean; data: { user: any }; message?: string }>('/auth/complete-onboarding', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ambis_token') || ''}` }
    });
    if (res && res.success) return res;
    return { success: true, data: { user: body } };
  },
};

// ==================== RITUALS ====================
export const ritualApi = {
  getAll: async () => {
    request('/rituals');
    return handleLocalOperation('ambis_rituals', 'GET');
  },
  create: async (body: { title: string; target_minutes?: string | number }) => {
    request('/rituals', { method: 'POST', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_rituals', 'POST', { ...body, is_active: true });
  },
  update: async (id: string, body: { title?: string; target_minutes?: number }) => {
    request(`/rituals/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    return handleLocalOperation('ambis_rituals', 'PATCH', body, id);
  },
  toggle: async (id: string) => {
    request(`/rituals/${id}/toggle`, { method: 'PATCH' });
    const data = getLocal('ambis_rituals');
    const item = data.find((i: any) => i.id === id);
    if (item) {
      return handleLocalOperation('ambis_rituals', 'PATCH', { is_active: !item.is_active }, id);
    }
    return { success: false, message: 'Not found' };
  },
  delete: async (id: string) => {
    request(`/rituals/${id}`, { method: 'DELETE' });
    return handleLocalOperation('ambis_rituals', 'DELETE', undefined, id);
  },
};