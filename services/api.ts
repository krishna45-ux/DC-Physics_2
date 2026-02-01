
import axios from 'axios';
import { User, UserRole, Chapter, Quiz, Announcement, Note } from '../types';

// Configuration
const getBaseUrl = () => {
  let url = 'http://localhost:5000/api';

  // 1. Check for environment variable (Standard for React/Vite)
  // @ts-ignore
  if (import.meta.env && import.meta.env.VITE_API_URL) {
      // @ts-ignore
      url = import.meta.env.VITE_API_URL;
  }

  console.log("API Base URL:", url);
  return url;
};

const API_URL = getBaseUrl();

// Create Axios Instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000 // 5 seconds
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 (Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear storage and redirect to home/login if token is invalid
      localStorage.removeItem('token');
      localStorage.removeItem('physics_app_current_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// --- API Methods ---

export const auth = {
  login: async (email: string, password?: string, role?: UserRole) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data; // Expected: { token, ...userFields }
  },

  signup: async (userData: { name: string; email: string; password: string; role: UserRole; classLevel?: number }) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },

  verify: async (email: string, code: string) => {
    const response = await api.post('/auth/verify', { email, code });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // New Social Login Method
  socialLogin: async (data: { email: string; name: string; googleId: string }) => {
      const response = await api.post('/auth/social-login', data);
      return response.data;
  },

  // Helper to get current user profile if needed
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export const content = {
  getChapters: async (): Promise<Chapter[]> => {
    const response = await api.get('/chapters');
    return response.data;
  },

  getQuiz: async (chapterId: string): Promise<Quiz | null> => {
    try {
      const response = await api.get(`/quizzes/${chapterId}`);
      return response.data;
    } catch (error) {
      console.warn('Quiz fetch failed or no quiz exists', error);
      return null;
    }
  },

  getAnnouncements: async (): Promise<Announcement[]> => {
    // In real app, fetch from backend: const response = await api.get('/announcements'); return response.data;
    return [];
  },

  getNotes: async (filter?: { chapterId?: string, classLevel?: number }): Promise<Note[]> => {
    const params: any = {};
    if (filter?.chapterId) params.chapterId = filter.chapterId;
    if (filter?.classLevel) params.classLevel = filter.classLevel;

    try {
        const response = await api.get('/notes', { params });
        return response.data;
    } catch (e) {
        console.error("Failed to fetch notes", e);
        return [];
    }
  },

  addNote: async (note: Partial<Note>) => {
    try {
        const response = await api.post('/notes', note);
        return response.data;
    } catch (e) {
        console.warn("API add note failed, falling back logic handled by caller");
        throw e;
    }
  },

  deleteNote: async (id: string) => {
      await api.delete(`/notes/${id}`);
      return true;
  }
};

export const ai = {
  chat: async (message: string, context: string) => {
    const response = await api.post('/ai/chat', { message, context });
    return response.data.text;
  }
};

export const payment = {
  createOrder: async (amount: number, itemId: string, type: 'COURSE' | 'CHAPTER') => {
    const response = await api.post('/orders', { amount, itemId, type });
    return response.data;
  },

  verifyPayment: async (data: { razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string, itemId: string, type: string }) => {
      const response = await api.post('/payment/verify', data);
      return response.data; // { success: true, user: User }
  }
};

// Helper to refresh user progress
export const getUserProgress = async () => {
  try {
      const response = await api.get('/auth/me');
      return response.data.progress;
  } catch (e) {
      console.warn("Could not fetch fresh progress via API");
      return {};
  }
};

export default api;
