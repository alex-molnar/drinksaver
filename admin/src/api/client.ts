import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import keycloak from '../auth/keycloak';
import config from '../config';

const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

apiClient.interceptors.request.use((request) => {
  if (keycloak.token) request.headers.Authorization = `Bearer ${keycloak.token}`;
  return request;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableConfig | undefined;
    if (error.response?.status === 401 && request && !request._retried) {
      request._retried = true;
      try {
        await keycloak.updateToken(5);
        request.headers.Authorization = `Bearer ${keycloak.token}`;
        return apiClient.request(request);
      } catch {
        keycloak.logout();
      }
    } else if (error.response?.status === 401 && request?._retried) {
      keycloak.logout();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
