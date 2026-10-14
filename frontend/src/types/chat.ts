export type DialogStatus = 'BOT' | 'WAITING_PSYCHOLOGIST' | 'ACTIVE' | 'CLOSED';
export type SenderRole = 'STUDENT' | 'BOT' | 'PSYCHOLOGIST';

export interface ChatMessage {
  id: string;
  dialog_id: string;
  sender_role: SenderRole;
  content: string;
  created_at: string;
}

export interface Dialog {
  id: string;
  student_id: string;
  status: DialogStatus;
  created_at: string;
  updated_at?: string;
  student_name?: string;
  messages?: ChatMessage[];
}

export interface ReplyMessagePayload {
  dialog_id: string;
  content: string;
}

