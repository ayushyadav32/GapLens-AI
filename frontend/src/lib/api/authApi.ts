import apiClient from './client';
import type { User, LoginCredentials, RegisterData, AuthTokens } from '@/types';

export const authApi = {
  login: (data: LoginCredentials) =>
    apiClient.post<{ access: string; refresh: string; user: User }>('/auth/login/', data),

  register: (data: RegisterData) =>
    apiClient.post<{ user: User; message: string }>('/auth/register/', data),

  me: () =>
    apiClient.get<User>('/auth/me/'),

  logout: (refresh: string) =>
    apiClient.post('/auth/logout/', { refresh }),

  refreshToken: (refresh: string) =>
    apiClient.post<{ access: string }>('/auth/token/refresh/', { refresh }),
};
