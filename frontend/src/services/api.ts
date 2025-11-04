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
    apr: number | null;
    minimumPayment: number | null;
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
  updateAccount: (data: { email?: string; currentPassword?: string; newPassword?: string }) =>
    api.put('/profile/account', data),
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

// Content APIs
export interface ContentItem {
  id: string;
  title: string;
  source: string;
  url: string;
  excerpt: string;
  tags: string[];
  personaFit: string[];
  signals: string[];
  createdAt: string;
}

export const contentApi = {
  getAll: (topic?: string, search?: string) => {
    const params = new URLSearchParams();
    if (topic) params.append('topic', topic);
    if (search) params.append('search', search);
    return api.get<{ content: ContentItem[]; total: number }>(`/content?${params.toString()}`);
  },
};

// Transactions APIs
export interface SpendingPatterns {
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    merchant: string | null;
    category: string | null;
    categoryDetailed: string | null;
  }>;
  categoryBreakdown: Record<string, number>;
  recurringVsOneTime: {
    recurring: number;
    oneTime: number;
  };
  totalSpending: number;
  windowDays: number;
}

export const transactionsApi = {
  getSpendingPatterns: (windowDays: number = 30) =>
    api.get<SpendingPatterns>(`/transactions?windowDays=${windowDays}`),
};

// Operator APIs
export interface Article {
  id: string;
  title: string;
  content: string;
  rationale: string;
  type: 'education' | 'offer';
  generatedAt: string;
  disclaimer: string;
}

export const articlesApi = {
  getArticle: (recommendationId: string) =>
    api.get<Article>(`/articles/${recommendationId}`),
};

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
