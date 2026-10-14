import type { User } from './user';

export interface Department {
  id: string;
  name: string;
  code: string;
  created_at?: string;
  updated_at?: string;
  teachers?: User[];
}

export interface DepartmentCreate {
  name: string;
  code: string;
}

export interface DepartmentUpdate {
  name?: string;
  code?: string;
}
