export type MessageSenderType = 'queen' | 'crew_member' | 'match';

export interface Chat {
  id: string;
  match_id: string;
  queen_id: string;
  match_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: MessageSenderType;
  crew_member_name?: string;
  voice_mode?: 'funny' | 'serious';
  content: string;
  emoji_reactions: Record<string, string>; // { user_id: emoji }
  is_crew_takeover: boolean;
  created_at: string;
}

export interface CrewMention {
  id: string;
  chat_id: string;
  message_id: string;
  question: string;
  answered: boolean;
  answer_message_id?: string;
  created_at: string;
}
