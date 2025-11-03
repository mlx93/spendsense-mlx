// API service wrapper (alternative to lib/apiClient.ts)
// This file provides API service functions for frontend components

import api from '../lib/apiClient';

export const apiService = {
  // Auth endpoints
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, password: string) => api.post('/users', { email, password }),
  
  // Profile endpoints
  getProfile: (userId: string) => api.get(`/profile/${userId}`),
  updateConsent: (consentStatus: boolean) => api.post('/profile/consent', { consentStatus }),
  
  // Recommendations endpoints
  getRecommendations: (userId: string, status?: string, refresh?: boolean) => 
    api.get(`/recommendations/${userId}`, { params: { status, refresh } }),
  submitFeedback: (recommendationId: string, action: string) => 
    api.post('/feedback', { recommendation_id: recommendationId, action }),
  
  // Chat endpoints
  sendChatMessage: (message: string, conversationHistory?: any[]) => 
    api.post('/chat', { message, conversationHistory }),
  
  // Operator endpoints
  getOperatorReview: () => api.get('/operator/review'),
  getOperatorDashboard: () => api.get('/operator/dashboard'),
};

export default apiService;

