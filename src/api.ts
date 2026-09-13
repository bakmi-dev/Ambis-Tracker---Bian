const API_BASE = '/api/v1';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const text = await res.text();
      if (text) {
        const errData = JSON.parse(text);
        if (errData.error) errMsg = errData.error;
      }
    } catch (e) {
      // fallback to default errMsg
    }
    throw new Error(errMsg);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : { success: true, data: [] };
  
  return data;
}

// ==================== TASKS ====================
export const taskApi = {
  getAll: (params?: { date?: string; completed?: string; priority?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: any[] }>(`/tasks${query ? `?${query}` : ''}`);
  },
  create: (body: { title: string; description?: string; priority?: string; scheduled_date?: string; category?: string; tags?: string[] }) =>
    request<{ success: boolean; data: any }>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/tasks/${id}`, { method: 'DELETE' }),
};

// ==================== STUDY SESSIONS ====================
export const studySessionApi = {
  getAll: () => request<{ success: boolean; data: any[] }>('/study-sessions'),
  create: (body: { title?: string; start_time: string; end_time: string; duration_minutes: number; session_type?: string }) =>
    request<{ success: boolean; data: any }>('/study-sessions', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/study-sessions/${id}`, { method: 'DELETE' }),
};

// ==================== GOALS ====================
export const goalApi = {
  getAll: () => request<{ success: boolean; data: any[] }>('/goals'),
  create: (body: { title: string; description?: string; deadline?: string; category?: string }) =>
    request<{ success: boolean; data: any }>('/goals', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/goals/${id}`, { method: 'DELETE' }),
};

// ==================== COMPETITIONS ====================
export const competitionApi = {
  getAll: () => request<{ success: boolean; data: any[] }>('/competitions'),
  create: (body: { title: string; description?: string; organizer?: string; type?: string; deadline?: string; status?: string }) =>
    request<{ success: boolean; data: any }>('/competitions', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/competitions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/competitions/${id}`, { method: 'DELETE' }),
};

// ==================== PROJECTS ====================
export const projectApi = {
  getAll: () => request<{ success: boolean; data: any[] }>('/projects'),
  create: (body: { title: string; description?: string; deadline?: string; status?: string }) =>
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
  getProfile: () => request<{ success: boolean; data: any }>('/profile'),
  updateProfile: (body: { name?: string; profile_metadata?: string }) =>
    request<{ success: boolean; data: any }>('/profile', { method: 'PATCH', body: JSON.stringify(body) }),
};
