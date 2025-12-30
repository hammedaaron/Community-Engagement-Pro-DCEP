
import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { User, UserRole, Folder, Card, Follow, AppNotification, NotificationType, Party, InstructionBox } from './types';
import { getSession, saveSession, findParty, getPartyData, markRead, deleteCard as dbDeleteCard, upsertCard, upsertFollow, addNotification, SYSTEM_PARTY_ID, isCardExpired } from './db';
import { supabase } from './supabase';
import Layout from './components/Layout';
import CardGrid from './components/CardGrid';
import AuthorityTable from './components/AuthorityTable';
import CreateProfileModal from './components/CreateProfileModal';
import EditProfileModal from './components/EditProfileModal';
import Gate from './components/Gate';
import Toast from './components/Toast';
import DevWorkflow from './components/DevWorkflow';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activeParty: Party | null;
  isAdmin: boolean;
  isDev: boolean;
  logout: () => void;
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  cards: Card[];
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  follows: Follow[];
  toggleFollow: (cardId: string) => void;
  notifications: AppNotification[];
  instructions: InstructionBox[];
  markNotificationRead: (id: string) => void;
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  deleteCard: (id: string) => void;
  updateCard: (id: string, name: string, link1: string, link2: string, link1Label?: string, link2Label?: string, isPermanent?: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isPoweredUp: boolean;
  setIsPoweredUp: (val: boolean) => void;
  showToast: (message: any, type?: 'success' | 'error') => void;
  isWorkflowMode: boolean;
  setIsWorkflowMode: (val: boolean) => void;
  socketStatus: 'connected' | 'disconnected' | 'connecting';
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getSession());
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [instructions, setInstructions] = useState<InstructionBox[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isPoweredUp, setIsPoweredUp] = useState(false);
  const [isWorkflowMode, setIsWorkflowMode] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  const lastSyncTime = useRef<number>(0);
  const syncTimeout = useRef<any>(null);

  const showToast = useCallback((message: any, type: 'success' | 'error' = 'success') => {
    let finalMsg = typeof message === 'string' ? message : message?.message || "Notice";
    setToast({ message: finalMsg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const syncData = useCallback(async (retryCount = 0) => {
    const pid = currentUser?.party_id || SYSTEM_PARTY_ID;
    try {
      const party = await findParty(pid);
      setActiveParty(party);
      const data = await getPartyData(pid);
      
      setFolders(data.folders);
      // Visibility rule: Filter out cards whose expiry boundary has passed based on party timezone
      const visibleCards = data.cards.filter(c => !isCardExpired(c, party));
      setCards(visibleCards);
      
      setFollows(data.follows);
      setNotifications(data.notifications);
      setInstructions(data.instructions);
    } catch (err: any) {
      if (retryCount < 1) setTimeout(() => syncData(retryCount + 1), 2000);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const throttledSync = useCallback(() => {
    const now = Date.now();
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    if (now - lastSyncTime.current > 2000) {
      lastSyncTime.current = now;
      syncData();
    } else {
      syncTimeout.current = setTimeout(() => {
        lastSyncTime.current = Date.now();
        syncData();
      }, 2000);
    }
  }, [syncData]);

  useEffect(() => {
    if (!currentUser || !currentUser.party_id) return;

    const pid = currentUser.party_id;
    const channel = supabase.channel(`optimized-party-${pid}`);

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `party_id=eq.${pid}` }, () => throttledSync())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders', filter: `party_id=eq.${pid}` }, () => throttledSync())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instructions', filter: `party_id=eq.${pid}` }, () => throttledSync())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties', filter: `id=eq.${pid}` }, () => throttledSync())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setSocketStatus('connected');
        else if (status === 'CLOSED') setSocketStatus('disconnected');
      });

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        throttledSync();
      }
    }, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') throttledSync();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    syncData();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser, throttledSync, syncData]);

  useEffect(() => {
    if (currentUser) {
      saveSession(currentUser);
      if (currentUser.role === UserRole.DEV) setTheme('dark');
    }
  }, [currentUser]);

  useEffect(() => {
    if (folders.length > 0 && !selectedFolderId && currentUser?.role !== UserRole.DEV) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId, currentUser]);

  const toggleFollow = useCallback(async (cardId: string) => {
    if (!currentUser || !activeParty) return;
    const isAlreadyFollowed = follows.some(f => f.follower_id === currentUser.id && f.target_card_id === cardId);
    const targetCard = cards.find(c => c.id === cardId);
    if (!targetCard) return;

    try {
      const newFollow: Follow = { id: Math.random().toString(36).substr(2, 9), follower_id: currentUser.id, target_card_id: cardId, party_id: activeParty.id, timestamp: Date.now() };
      await upsertFollow(newFollow, !isAlreadyFollowed);
      
      if (!isAlreadyFollowed && targetCard.user_id !== currentUser.id) {
        const relatedNotifs = notifications.filter(n => n.recipient_id === currentUser.id && n.sender_id === targetCard.user_id && n.type === NotificationType.FOLLOW && !n.read);
        for (const n of relatedNotifs) await markRead(n.id);

        const senderCard = cards.find(c => c.user_id === currentUser.id && c.party_id === activeParty.id);
        const myCardIds = cards.filter(c => c.user_id === currentUser.id).map(c => c.id);
        const isFollowBack = follows.some(f => f.follower_id === targetCard.user_id && myCardIds.includes(f.target_card_id));
        
        await addNotification({ 
          recipient_id: targetCard.user_id, sender_id: currentUser.id, sender_name: currentUser.name, 
          type: isFollowBack ? NotificationType.FOLLOW_BACK : NotificationType.FOLLOW, 
          related_card_id: senderCard?.id || '', party_id: activeParty.id 
        });
      }
      throttledSync();
    } catch (err) { showToast(err, "error"); }
  }, [currentUser, activeParty, follows, cards, notifications, throttledSync, showToast]);

  const markNotificationRead = async (id: string) => {
    await markRead(id);
    throttledSync();
  };

  const deleteCard = async (id: string) => {
    await dbDeleteCard(id);
    throttledSync();
    setEditingCard(null);
    showToast("Profile removed.");
  };

  const updateCard = async (id: string, name: string, link1: string, link2: string, link1Label?: string, link2Label?: string, isPermanent?: boolean) => {
    const existingCard = cards.find(c => c.id === id);
    if (!existingCard) return;
    await upsertCard({ 
      ...existingCard, 
      display_name: name, 
      external_link: link1, 
      external_link2: link2,
      link1_label: link1Label,
      link2_label: link2Label,
      is_permanent: isPermanent
    }, true);
    throttledSync();
    setEditingCard(null);
    showToast("Profile updated.");
  };

  const logout = () => {
    saveSession(null);
    setCurrentUser(null);
    setActiveParty(null);
    setFolders([]);
    setCards([]);
    window.location.hash = '';
  };

  const contextValue: AppContextType = {
    currentUser, setCurrentUser, activeParty, isAdmin: currentUser?.role === UserRole.ADMIN,
    isDev: currentUser?.role === UserRole.DEV, logout, folders, setFolders, cards, setCards,
    follows, toggleFollow, notifications, instructions, markNotificationRead,
    selectedFolderId, setSelectedFolderId, deleteCard, updateCard, searchQuery, setSearchQuery,
    theme, setTheme, isPoweredUp, setIsPoweredUp, showToast, isWorkflowMode, setIsWorkflowMode,
    socketStatus
  };

  if (!currentUser) {
    return (
      <AppContext.Provider value={contextValue}>
        <Gate onAuth={(user) => setCurrentUser(user)} />
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Layout onOpenCreateProfile={() => {
        if (!selectedFolderId) {
          showToast("Please select a community folder first.", "error");
          return;
        }
        setIsCreateModalOpen(true);
      }}>
        {selectedFolderId === 'authority-table' && currentUser.role === UserRole.DEV ? (
          <AuthorityTable />
        ) : (isWorkflowMode && currentUser.role === UserRole.DEV) ? (
          <DevWorkflow folderId={selectedFolderId} />
        ) : (
          <CardGrid folderId={selectedFolderId} onEditCard={(card) => setEditingCard(card)} />
        )}
      </Layout>

      {isCreateModalOpen && (
        <CreateProfileModal onClose={() => setIsCreateModalOpen(false)} onSubmit={async (name, link1, link2, l1l, l2l, isP) => {
          if (!currentUser || !selectedFolderId) return;
          const folder = folders.find(f => f.id === selectedFolderId);
          const isSystemFolder = folder?.party_id === SYSTEM_PARTY_ID;
          if (isSystemFolder && currentUser.role !== UserRole.DEV) {
            showToast("Restricted folder.", "error");
            return;
          }
          
          const newCard: Card = { 
            id: Math.random().toString(36).substr(2, 9), 
            user_id: currentUser.id, 
            creator_role: currentUser.role,
            folder_id: selectedFolderId, 
            party_id: isSystemFolder ? SYSTEM_PARTY_ID : activeParty?.id || SYSTEM_PARTY_ID, 
            display_name: name, 
            external_link: link1, 
            external_link2: link2,
            link1_label: l1l,
            link2_label: l2l,
            is_permanent: isP,
            timestamp: Date.now()
          };
          try {
            await upsertCard(newCard);
            throttledSync();
            setIsCreateModalOpen(false);
            showToast("Profile added!");
          } catch (err: any) { showToast(err, "error"); }
        }} />
      )}

      {editingCard && <EditProfileModal card={editingCard} onClose={() => setEditingCard(null)} onUpdate={updateCard} onDelete={deleteCard} />}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </AppContext.Provider>
  );
};

export default App;
