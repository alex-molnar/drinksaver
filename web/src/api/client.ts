import axios, { type AxiosInstance, type AxiosError } from 'axios';
import keycloak from '../auth/keycloak';

// API base URL - configurable via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add Bearer token
apiClient.interceptors.request.use(
  (config) => {
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401) {
      try {
        await keycloak.updateToken(5);
        // Retry the original request with new token
        if (error.config) {
          error.config.headers.Authorization = `Bearer ${keycloak.token}`;
          return apiClient.request(error.config);
        }
      } catch {
        // Refresh failed, redirect to login
        keycloak.logout();
      }
    }
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

// Helper to get current user ID from token
export const getCurrentUserId = (): string | undefined => {
  return keycloak.tokenParsed?.sub;
};

export default apiClient;
export { API_BASE_URL };
