/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type JobStatus = 'delivered' | 'interview1' | 'interview2' | 'offer';

export interface JobApplication {
  id: string;
  company: string;
  position: string;
  logoType: 'bytedance' | 'ant' | 'xiaomi' | 'amazon' | 'custom';
  customLogoColor?: string;
  description: string;
  status: JobStatus;
  appliedDate: string;
  priority: 'normal' | 'urgent';
  tag?: string; // e.g. "WIN" or custom
  salary?: string;
  location?: string;
  notes?: string;
}

export interface TodoItem {
  id: string;
  jobId: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'normal';
  createdAt: string;
  removing?: boolean; // temporary state for animation trigger
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number; // 0 to 4+
  label: string; // Detail description
}

export interface PipelineStats {
  delivered: number;
  interview1: number;
  interview2: number;
  offer: number;
}
