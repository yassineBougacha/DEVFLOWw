export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum TaskCategory {
  FRONTEND = 'FRONTEND',
  API = 'API',
  DEVOPS = 'DEVOPS',
  DESIGN = 'DESIGN',
  GENERAL = 'GENERAL',
}

export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  category: TaskCategory;
  assignee: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  acceptanceCriteria: string[];
  estimatedHours: number; // New field for time estimation
  technicalPlan?: string; // New field for AI generated implementation details
  createdAt: number;
}

export interface AIMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface MeetingSession {
  id: string;
  date: number;
  durationSeconds: number;
  transcript: { role: 'user' | 'model', text: string }[];
  summary?: string;
  actionItems?: string[];
}

export interface LiveMeeting {
  id: string;
  hostId: string;
  hostName: string;
  topic: string;
  startTime: number;
  isActive: boolean;
  participants: string[]; // List of user names currently in the meeting
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}