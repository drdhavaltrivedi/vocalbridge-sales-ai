export type ClientStatus = 'pending' | 'dialing' | 'called' | 'no_answer' | 'interested' | 'not_interested' | 'follow_up';

export interface Client {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  info?: string;
  status: ClientStatus;
  lastCallId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type CallStatus = 'initiated' | 'active' | 'completed' | 'failed';

export interface Call {
  id: string;
  clientId: string;
  clientName: string;
  status: CallStatus;
  startTime: string;
  endTime?: string;
  transcript?: Array<{
    role: 'agent' | 'customer';
    text: string;
    time: string;
  }>;
  summary?: string;
  sentiment?: string;
  outcome?: string;
  roiProjection?: string;
  upsellOpportunities?: string[];
  recordingUrl?: string;
}

export interface KnowledgeBaseDoc {
  id: string;
  title: string;
  content: string;
  category?: string;
  lastUpdated: string;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface Persona {
  name: string;
  tone: string;
  speechPatterns: string;
  systemInstruction: string;
  speed: number;
  pitch: number;
  inflection: number;
  voiceName: string;
  useClonedVoice?: boolean;
  clonedVoiceUrl?: string;
}

export interface Settings {
  id: string;
  persona: Persona;
  focusAreas: string[];
  lastUpdated: string;
}

export interface CampaignSettings {
  delayBetweenCalls: number;
  retryNoAnswer: boolean;
  retryDelayMinutes: number;
}

export type CampaignStatus = 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  clientIds: string[];
  completedClientIds: string[];
  skippedClientIds: string[];
  currentClientId: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  totalLeads: number;
  completedCalls: number;
  convertedCalls: number;
  settings: CampaignSettings;
}

export type UserRole = 'admin' | 'agent';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface User {
  uid: string;
  email: string | null;
  role: UserRole;
}
