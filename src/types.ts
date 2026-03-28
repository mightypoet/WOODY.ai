export type UserRole = 'admin' | 'team_member' | 'account_manager';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface Client {
  id: string;
  name: string;
  brand: string;
  contact: string;
  services: string[];
  paymentTerms: string;
  createdAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  status: 'active' | 'completed' | 'on_hold';
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigneeId: string;
  deadline: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  clientId: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface Meeting {
  id: string;
  clientId: string;
  title: string;
  date: string;
  time: string;
  createdAt: string;
}

export type AIActionType = 
  | 'CREATE_CLIENT'
  | 'CREATE_PROJECT'
  | 'CREATE_TASK'
  | 'ASSIGN_TASK'
  | 'UPDATE_TASK_STATUS'
  | 'ADD_PAYMENT'
  | 'TRACK_PAYMENT'
  | 'SCHEDULE_MEETING'
  | 'SET_REMINDER'
  | 'GET_STATUS'
  | 'GET_CLIENT_DETAILS'
  | 'CREATE_TEAM_MEMBER'
  | 'ASSIGN_TASK_TO_MEMBER'
  | 'SEND_NOTIFICATION'
  | 'GET_TEAM_TASKS';

export interface AIAction {
  type: AIActionType;
  payload: any;
}
