import api from '../lib/apiClient';

export interface Recommendation {
  id: string;
  type: 'education' | 'offer';
  title: string;
  rationale: string;
  url?: string;
  personaType: string;
  status: string;
  createdAt: string;
}

export interface Profile {
  userId: string;
  consent: boolean;
  accounts: Array<{
    id: string;
    type: string;
    balance: number;
    limit: number | null;
    utilization: number | null;
  }>;
  signals: {
    '30d': any;
    '180d': any;
  };
  personas: {
    '30d': {
      primary: { type: string; score: number } | null;
      secondary: { type: string; score: number } | null;
    };
    '180d': {
      primary: { type: string; score: number } | null;
      secondary: { type: string; score: number } | null;
    };
  };
}

// Auth APIs
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string) =>
    api.post('/users', { email, password }),
};

// Profile APIs
export const profileApi = {
  getProfile: (userId: string) =>
    api.get<Profile>(`/profile/${userId}`),
  updateConsent: (consentStatus: boolean) =>
    api.post('/profile/consent', { consentStatus }),
};

// Recommendations APIs
export const recommendationsApi = {
  getRecommendations: (userId: string, status?: string, refresh?: boolean) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (refresh) params.append('refresh', 'true');
    return api.get<{ recommendations: Recommendation[] }>(
      `/recommendations/${userId}?${params.toString()}`
    );
  },
  submitFeedback: (recommendationId: string, action: string) =>
    api.post('/recommendations/feedback', { recommendation_id: recommendationId, action }),
};

// Chat API
export const chatApi = {
  sendMessage: (message: string, conversationHistory: any[]) =>
    api.post('/chat', { message, conversationHistory }),
};

// Operator APIs
export const operatorApi = {
  getDashboard: () => api.get('/operator/dashboard'),
  getReviewQueue: () => api.get('/operator/review'),
  getUsers: (page: number = 1, limit: number = 20, persona?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (persona) params.append('persona', persona);
    return api.get(`/operator/users?${params.toString()}`);
  },
  getUserDetail: (userId: string) =>
    api.get(`/operator/user/${userId}`),
  hideRecommendation: (recommendationId: string, reason: string) =>
    api.post(`/operator/recommendation/${recommendationId}/hide`, { reason }),
  approveRecommendation: (recommendationId: string, notes: string) =>
    api.post(`/operator/recommendation/${recommendationId}/approve`, { notes }),
  overridePersona: (userId: string, primaryPersona: string, reason: string) =>
    api.post(`/operator/user/${userId}/persona-override`, { primaryPersona, reason }),
};
