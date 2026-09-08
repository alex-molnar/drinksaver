import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import keycloak from '../auth/keycloak';
import config from '../config';

// API base URL, supplied at container start by /config.js
const API_BASE_URL = config.apiUrl;

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

/**
 * Marks a request that has already been retried after a 401. The retry goes back
 * through this same interceptor, so without it a 401 the refresh cannot fix
 * retries forever.
 *
 * That is not hypothetical. keycloak-js resolves updateToken(5) with `false`,
 * without contacting Keycloak at all, whenever the local token still has five
 * seconds of validity left. So for any 401 whose cause is not local expiry (a
 * rotated realm signing key, a revoked session, an audience or issuer mismatch,
 * clock skew) the refresh "succeeds", the same token is replayed, and the same
 * 401 comes back, with no backoff, from every open tab.
 */
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    // Handle 401 Unauthorized - try to refresh the token, but only once per request.
    if (error.response?.status === 401 && config && !config._retried) {
      config._retried = true;
      try {
        await keycloak.updateToken(5);
        config.headers.Authorization = `Bearer ${keycloak.token}`;
        return apiClient.request(config);
      } catch {
        // Refresh failed, redirect to login
        keycloak.logout();
      }
    } else if (error.response?.status === 401 && config?._retried) {
      // A second 401 for the same request means the token is not the problem, or
      // is one a refresh cannot mend. Treat it the way a failed refresh is treated.
      keycloak.logout();
    }

    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
