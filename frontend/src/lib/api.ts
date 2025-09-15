import type { LoginRequest, LoginResponse, RegisterRequest, User } from '../types/auth';
import type { ChatRequest, ChatResponse } from '../types/chat';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Simple API functions - React Query handles the rest
export const api = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/jwt/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: credentials.username,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new ApiError(response.status, errorData.detail);
    }

    return response.json();
  },

  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem('access_token');
    if (!token) throw new ApiError(401, 'No token');

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to get user');
    }

    return response.json();
  },

  async register(userData: RegisterRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Registration failed' }));
      throw new ApiError(response.status, errorData.detail);
    }

    return response.json();
  },

  async sendChatMessage(chatRequest: ChatRequest): Promise<ChatResponse> {
    const token = localStorage.getItem('access_token');
    if (!token) throw new ApiError(401, 'No token');

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Chat request failed' }));
      throw new ApiError(response.status, errorData.detail);
    }

    return response.json();
  },
};