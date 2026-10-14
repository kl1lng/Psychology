import type { Department } from './department';

// User roles
export type UserRole = 'admin' | 'psychologist' | 'teacher' | 'student' | 'guest';

export enum Role {
  ADMIN = 'ADMIN',
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  GUEST = 'GUEST',
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  class_id?: string | null;
  department_id?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  points_balance: number;
  created_at?: string;
  updated_at?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export interface GuestToken {
  access_token: string;
  token_type: string;
  guest_id: string;
  message: string;
}
