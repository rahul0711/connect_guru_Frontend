import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '@/lib/axios';

export type RegisterPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gender: string;
  role: 'User' | 'Business';
};

export type RegisterResponse = {
  success: boolean;
  message: string;
  data?: {
    token?: string;
    user?: Record<string, unknown>;
  };
};

// ── Register ─────────────────────────────────────────────────
export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>('/auth/register', payload);

  // Persist token & user data locally if returned
  if (response.data?.data?.token) {
    await AsyncStorage.setItem('auth_token', response.data.data.token);
  }
  if (response.data?.data?.user) {
    await AsyncStorage.setItem('user_data', JSON.stringify(response.data.data.user));
  }

  return response.data;
}

// ── Login types ───────────────────────────────────────────────
export type LoginPayload = {
  email: string;   // accepts email OR phone number
  password: string;
};

export type LoginData = {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: string;
  expiresAt: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  data?: LoginData;
};

// ── Login ─────────────────────────────────────────────────────
export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', payload);

  const d = response.data?.data;
  if (d?.token) {
    await AsyncStorage.setItem('auth_token', d.token);
    await AsyncStorage.setItem(
      'user_data',
      JSON.stringify({
        userId: d.userId,
        fullName: d.fullName,
        email: d.email,
        role: d.role,
        expiresAt: d.expiresAt,
      }),
    );
  }

  return response.data;
}
