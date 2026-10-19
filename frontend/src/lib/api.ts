import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT from cookie if present
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 and network errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.response = {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        config: error.config,
        data: {
          detail: 'Сервер недоступен. Повторите попытку позже.',
        },
      };
    }
    if (error.response?.status === 401) {
      Cookies.remove('access_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
    class_id?: string;
    department_id?: string;
    department_code?: string;
  }) => api.post('/api/v1/auth/register', data, { timeout: 3000 }),
  login: (email: string, password: string) =>
    api.post('/api/v1/auth/login', { email, password }),
  guestLogin: () =>
    api.post('/api/v1/auth/guest', undefined, { timeout: 3000 }),
  logout: () =>
    api.post('/api/v1/auth/logout'),
  me: () =>
    api.get('/api/v1/auth/me'),
};

// ─── Assessments ─────────────────────────────────────────────────────────────
export const assessmentsApi = {
  list: () => {
    const lang = (typeof window !== 'undefined' && localStorage.getItem('app_lang')) || 'ru';
    return api.get(`/api/v1/assessments/?lang=${lang}`);
  },
  getTest: (testId: string) => {
    const lang = (typeof window !== 'undefined' && localStorage.getItem('app_lang')) || 'ru';
    return api.get(`/api/v1/assessments/${testId}?lang=${lang}`);
  },
  submit: (testId: string, answers: { question_id: number; answer: number }[], studentId?: string) => {
    const lang = (typeof window !== 'undefined' && localStorage.getItem('app_lang')) || 'ru';
    return api.post(`/api/v1/assessments/submit?lang=${lang}`, {
      test_id: testId,
      answers,
      student_id: studentId,
    });
  },
};

// ─── Mood ─────────────────────────────────────────────────────────────────────
export const moodApi = {
  saveEntry: (stressLevel: number, note?: string, emotion?: string) =>
    api.post('/api/v1/mood/entry', {
      stress_level: stressLevel,
      note,
      emotion,
    }),
  getStats: (days = 30) =>
    api.get('/api/v1/mood/stats', { params: { days } }),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  get: (userId: string) => api.get(`/api/v1/users/${userId}`),
};

// ─── Chat ────────────────────────────────────────────────────────────────────
export const chatApi = {
  sendMessage: (content: string, studentId?: string) =>
    api.post('/api/v1/chat/message', { content, student_id: studentId }),
  reply: (dialogId: string, content: string) =>
    api.post('/api/v1/chat/reply', { dialog_id: dialogId, content }),
  callPsychologist: (studentId?: string) =>
    api.post('/api/v1/chat/call-psychologist', { student_id: studentId }),
  getHistory: (identifier: string) =>
    api.get(`/api/v1/chat/history/${identifier}`),
  getMessages: (dialogId: string) =>
    api.get(`/api/v1/chat/dialog/${dialogId}/messages`),
  getWaiting: () =>
    api.get('/api/v1/chat/waiting'),
  searchArchive: (params: { from?: string; to?: string; student_id?: string; status?: string; limit?: number; offset?: number }) =>
    api.get('/api/v1/chat/archive', { params }),
};

// ─── Appointments ────────────────────────────────────────────────────────────
export const appointmentsApi = {
  book: (data: { student_id?: string; notes?: string; preferred_time?: string; source?: string; lang?: string }) =>
    api.post('/api/v1/appointments/book', data),
  list: (status?: string) =>
    api.get('/api/v1/appointments/', { params: { status_filter: status } }),
};

export const intakesApi = {
  students: () => api.get('/api/v1/intakes/students'),
  list: () => api.get('/api/v1/intakes/'),
  create: (data: { student_id: string; curator_name: string; paper_signed: boolean; note?: string }) => api.post('/api/v1/intakes/', data),
  setPaperSignature: (id: string, paper_signed: boolean) => api.patch(`/api/v1/intakes/${id}/signature`, { paper_signed }),
};



// ─── Analytics ───────────────────────────────────────────────────────────────
export const analyticsApi = {
  getResults: (params?: { class_id?: string; risk_level?: string; limit?: number; offset?: number }) =>
    api.get('/api/v1/analytics/results', { params }),
  getMonthlyComparison: (class_id?: string) =>
    api.get('/api/v1/analytics/monthly-comparison', { params: { class_id } }),
  getStudentResults: (studentId: string) =>
    api.get(`/api/v1/analytics/results/${studentId}`),
  getAssessmentDetail: (assessmentId: string) =>
    api.get(`/api/v1/analytics/assessment/${assessmentId}`),
  getClassComparison: () =>
    api.get('/api/v1/analytics/class-comparison'),
  getActivity: (days = 30) =>
    api.get('/api/v1/analytics/activity', { params: { days } }),
  getDashboard: () =>
    api.get('/api/v1/analytics/dashboard'),
  getStudentNotes: (studentId: string) =>
    api.get(`/api/v1/analytics/student/${studentId}/notes`),
  addStudentNote: (studentId: string, note: string, psychologistId?: string) =>
    api.post(`/api/v1/analytics/student/${studentId}/notes`, { note, psychologist_id: psychologistId }),
};

// ─── Q&A Anonymous Board ───────────────────────────────────────────────────
export const qaApi = {
  getFeed: (category?: string, limit = 30) =>
    api.get('/api/v1/qa/feed', { params: { category, limit } }),
  getModeration: (status?: string, limit = 50) =>
    api.get('/api/v1/qa/moderation', { params: { status, limit } }),
  askQuestion: (data: { title: string; content: string; category: string; student_id?: string }) =>
    api.post('/api/v1/qa/ask', data),
  answerQuestion: (questionId: string, data: { answer: string; is_published?: boolean; psychologist_id?: string }) =>
    api.post(`/api/v1/qa/answer/${questionId}`, data),
  likeQuestion: (questionId: string) =>
    api.post(`/api/v1/qa/like/${questionId}`),
};

// ─── Podcasts ────────────────────────────────────────────────────────────────
export const podcastsApi = {
  list: (limit = 20, offset = 0) =>
    api.get('/api/v1/podcasts/', { params: { limit, offset } }),
  upload: (formData: FormData) =>
    api.post('/api/v1/podcasts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (podcastId: string) =>
    api.delete(`/api/v1/podcasts/${podcastId}`),
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export const leaderboardApi = {
  get: (limit = 50) =>
    api.get('/api/v1/leaderboard/', { params: { limit } }),
};

// ─── Departments ─────────────────────────────────────────────────────────────
export const departmentsApi = {
  list: () => api.get('/api/v1/departments/'),
  get: (id: string) => api.get(`/api/v1/departments/${id}`),
  create: (data: { name: string; code: string }) => api.post('/api/v1/departments/', data),
  update: (id: string, data: { name?: string; code?: string }) => api.put(`/api/v1/departments/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/departments/${id}`),
};

// ─── Admin / Dev ──────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => api.get('/api/v1/admin/stats'),
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; department_id?: string }) =>
    api.get('/api/v1/admin/users', { params }),
  createUser: (data: { email: string; password: string; full_name: string; role: string; class_id?: string; department_id?: string }) =>
    api.post('/api/v1/admin/users', data),
  deleteUser: (id: string) => api.delete(`/api/v1/admin/users/${id}`),
  seedDemoData: () => api.post('/api/v1/admin/seed-demo-data'),
  clearDemoData: () => api.post('/api/v1/admin/clear-demo-data'),
};

export default api;

