
export enum UserRole {
  REGULAR = 'REGULAR',
  ADMIN = 'ADMIN',
  DEV = 'DEV'
}

export interface Party {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  password?: string;
  admin_code?: string;
  role: UserRole;
  party_id: string;
  profile_link?: string;
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  party_id: string;
}

export interface Card {
  id: string;
  user_id: string;
  creator_role: UserRole;
  folder_id: string;
  party_id: string;
  display_name: string;
  external_link: string;
  external_link2?: string;
  link1_label?: string;
  link2_label?: string;
  is_permanent?: boolean;
  timestamp: number;
  x?: number;
  y?: number;
}

export interface InstructionBox {
  id: string;
  folder_id: string;
  party_id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Follow {
  id: string;
  follower_id: string;
  target_card_id: string;
  party_id: string;
  timestamp: number;
}

export enum NotificationType {
  FOLLOW = 'FOLLOW',
  FOLLOW_BACK = 'FOLLOW_BACK'
}

export interface AppNotification {
  id: string;
  recipient_id: string;
  sender_id: string;
  sender_name: string;
  type: NotificationType;
  related_card_id: string;
  party_id: string;
  timestamp: number;
  read: boolean;
}
