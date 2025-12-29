
import { User, Folder, Card, Follow, AppNotification, UserRole, NotificationType, Party, InstructionBox } from './types';
import { supabase } from './supabase';

const SESSION_KEY = 'connector_pro_v3_session';
export const SYSTEM_PARTY_ID = 'SYSTEM';
export const CARD_EXPIRY_MS = 48 * 60 * 60 * 1000;

export const saveSession = (user: User | null) => {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
};

export const getSession = (): User | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

export const ensureDevUser = async () => {
  try {
    const { data: party, error: pError } = await supabase.from('parties').select('id').eq('id', SYSTEM_PARTY_ID).single();
    if (!party && (!pError || pError.code === 'PGRST116')) {
      await supabase.from('parties').insert([{ id: SYSTEM_PARTY_ID, name: 'System Core' }]);
    }

    const devId = 'dev-master-root';
    const { data: user, error: uError } = await supabase.from('users').select('id').eq('id', devId).single();
    
    const devData: User = {
      id: devId,
      name: 'Dev',
      role: UserRole.DEV,
      party_id: SYSTEM_PARTY_ID
    };

    if (!user && (!uError || uError.code === 'PGRST116')) {
      await supabase.from('users').insert([devData]);
    }
    
    return devData;
  } catch (err) {
    console.error("Critical: Failed to initialize Dev Node", err);
    throw err;
  }
};

export const resetAllData = async () => {
  try {
    const tables = ['notifications', 'follows', 'cards', 'instructions', 'folders'];
    for (const table of tables) {
      await supabase.from(table).delete().neq('id', '_root_protected_');
    }
    await supabase.from('users').delete().neq('id', 'dev-master-root');
    await supabase.from('parties').delete().neq('id', SYSTEM_PARTY_ID);
    return true;
  } catch (err: any) {
    throw new Error(err.message || "Wipe failed.");
  }
};

export const deleteParty = async (id: string) => {
  try {
    await supabase.from('notifications').delete().eq('party_id', id);
    await supabase.from('follows').delete().eq('party_id', id);
    await supabase.from('cards').delete().eq('party_id', id);
    await supabase.from('instructions').delete().eq('party_id', id);
    await supabase.from('folders').delete().eq('party_id', id);
    await supabase.from('users').delete().eq('party_id', id);
    const { error } = await supabase.from('parties').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err: any) {
    throw new Error(err.message || "Termination blocked.");
  }
};

export const deleteUser = async (id: string) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err: any) {
    throw new Error(err.message || "User expulsion failed.");
  }
};

export const getParties = async () => {
  try {
    const { data, error } = await supabase.from('parties').select('*').order('name');
    if (error) throw error;
    return (data || []) as Party[];
  } catch (err: any) {
    return [];
  }
};

export const findPartyByName = async (name: string): Promise<Party | null> => {
  try {
    const { data, error } = await supabase.from('parties').select('*').ilike('name', name.trim()).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as Party | null;
  } catch (err) {
    return null;
  }
};

export const findParty = async (partyId: string): Promise<Party | null> => {
  if (partyId === SYSTEM_PARTY_ID) return { id: SYSTEM_PARTY_ID, name: 'System Core' };
  try {
    const { data, error } = await supabase.from('parties').select('*').eq('id', partyId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as Party | null;
  } catch (err) {
    return null;
  }
};

export const getPartyData = async (partyId: string) => {
  const now = Date.now();
  const expiryThreshold = now - CARD_EXPIRY_MS;

  try {
    const [foldersRes, cardsRes, followsRes, notificationsRes, instructionsRes] = await Promise.all([
      supabase.from('folders').select('*').or(`party_id.eq.${partyId},party_id.eq.${SYSTEM_PARTY_ID}`).order('name'),
      supabase.from('cards')
        .select('*')
        .or(`party_id.eq.${partyId},party_id.eq.${SYSTEM_PARTY_ID}`)
        .or(`is_permanent.eq.true,timestamp.gt.${expiryThreshold}`)
        .order('timestamp', { ascending: false }),
      supabase.from('follows').select('*').eq('party_id', partyId),
      supabase.from('notifications').select('*').eq('party_id', partyId).order('timestamp', { ascending: false }),
      supabase.from('instructions').select('*').or(`party_id.eq.${partyId},party_id.eq.${SYSTEM_PARTY_ID}`)
    ]);

    return {
      folders: (foldersRes.data || []) as Folder[],
      cards: (cardsRes.data || []) as Card[],
      follows: (followsRes.data || []) as Follow[],
      notifications: (notificationsRes.data || []) as AppNotification[],
      instructions: (instructionsRes.data || []) as InstructionBox[]
    };
  } catch (err) {
    console.error("Fetch Party Data Error:", err);
    return { folders: [], cards: [], follows: [], notifications: [], instructions: [] };
  }
};

export const getAuthorityData = async () => {
  try {
    const [partiesRes, usersRes, foldersRes, cardsRes] = await Promise.all([
      supabase.from('parties').select('*'),
      supabase.from('users').select('*'),
      supabase.from('folders').select('*'),
      supabase.from('cards').select('*')
    ]);
    
    return {
      parties: (partiesRes.data || []) as Party[],
      users: (usersRes.data || []) as User[],
      folders: (foldersRes.data || []) as Folder[],
      cards: (cardsRes.data || []) as Card[]
    };
  } catch (err) {
    return { parties: [], users: [], folders: [], cards: [] };
  }
};

export const upsertCard = async (card: Card, isUpdate: boolean = false) => {
  try {
    if (isUpdate) {
      const { error } = await supabase.from('cards')
        .update(card)
        .eq('id', card.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('cards').insert([card]);
      if (error) throw error;
    }
  } catch (err: any) {
    throw new Error(err.message || "Failed to save card.");
  }
};

export const deleteCard = async (id: string) => {
  try {
    await supabase.from('cards').delete().eq('id', id);
  } catch (err: any) {}
};

export const upsertInstruction = async (box: InstructionBox) => {
  try {
    await supabase.from('instructions').upsert([box]);
  } catch (err: any) {}
};

export const deleteInstruction = async (id: string) => {
  try {
    await supabase.from('instructions').delete().eq('id', id);
  } catch (err: any) {}
};

export const validateAdminPassword = (password: string) => {
  const regex = /^Hamstar([1-9]{2})([1-9])$/;
  const match = password.trim().match(regex);
  if (!match) return null;
  return { partyId: match[1], adminId: match[2] };
};

export const validateDevPassword = (password: string) => {
  const regex = /^Dev([1-8]{2})$/;
  const match = password.trim().match(regex);
  return !!match;
};

export const registerParty = async (partyName: string, adminPassword: string) => {
  const info = validateAdminPassword(adminPassword);
  if (!info) throw new Error("Invalid password format.");
  const existing = await findPartyByName(partyName);
  if (existing) throw new Error(`Community name taken.`);
  const existingId = await findParty(info.partyId);
  if (existingId) throw new Error(`Code in use.`);
  
  const newParty: Party = { id: info.partyId, name: partyName.trim() };
  const newAdmin: User = {
    id: `admin-${info.partyId}-${info.adminId}`,
    name: 'Admin',
    admin_code: adminPassword.trim(),
    role: UserRole.ADMIN,
    party_id: info.partyId
  };

  try {
    const { error: pErr } = await supabase.from('parties').insert([newParty]);
    if (pErr) throw pErr;
    const { error: aErr } = await supabase.from('users').insert([newAdmin]);
    if (aErr) throw aErr;
    return { party: newParty, admin: newAdmin };
  } catch (err: any) {
    throw new Error(err.message || "Database rejected registration.");
  }
};

export const loginUser = async (username: string, password: string, partyId: string): Promise<User | null> => {
  try {
    const { data } = await supabase.from('users').select('*').eq('name', username).eq('party_id', partyId).single();
    if (!data) return null;
    const user = data as User;
    if (user.role === UserRole.ADMIN) return user.admin_code === password ? user : null;
    return user.password === password ? user : null;
  } catch (err) {
    return null;
  }
};

export const registerUser = async (user: User) => {
  try {
    const { error } = await supabase.from('users').insert([user]);
    if (error) throw error;
    return user;
  } catch (err: any) {
    throw new Error(err.message || "Registration blocked.");
  }
};

export const checkUserExists = async (username: string, partyId: string) => {
  try {
    const { data } = await supabase.from('users').select('id').eq('name', username).eq('party_id', partyId).single();
    return !!data;
  } catch (err) {
    return false;
  }
};

export const addFolder = async (folder: Folder) => {
  try {
    await supabase.from('folders').insert([folder]);
  } catch (err: any) {}
};

export const updateFolderName = async (id: string, name: string) => {
  try {
    await supabase.from('folders').update({ name }).eq('id', id);
  } catch (err: any) {}
};

export const deleteFolder = async (id: string) => {
  try {
    await supabase.from('folders').delete().eq('id', id);
  } catch (err: any) {}
};

export const upsertFollow = async (follow: Follow, shouldAdd: boolean) => {
  try {
    if (shouldAdd) {
      await supabase.from('follows').insert([follow]);
    } else {
      await supabase.from('follows').delete().eq('follower_id', follow.follower_id).eq('target_card_id', follow.target_card_id);
    }
  } catch (err: any) {}
};

export const addNotification = async (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
  try {
    const newNotif = { ...notif, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), read: false };
    await supabase.from('notifications').insert([newNotif]);
    return newNotif as AppNotification;
  } catch (err: any) {
    return null;
  }
};

export const markRead = async (id: string) => {
  try {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  } catch (err: any) {}
};
