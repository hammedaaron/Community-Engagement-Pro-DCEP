
import React, { useMemo } from 'react';
import { useApp } from '../App';
import UserCard from './UserCard';
import { Card, UserRole } from '../types';
import { SYSTEM_PARTY_ID } from '../db';

interface CardGridProps {
  folderId: string | null;
  onEditCard: (card: Card) => void;
}

const CardGrid: React.FC<CardGridProps> = ({ folderId, onEditCard }) => {
  const { cards, searchQuery, currentUser, instructions, theme, folders } = useApp();
  const isDark = theme === 'dark';

  const folderCards = useMemo(() => {
    if (!folderId) return [];
    const folder = folders.find(f => f.id === folderId);
    let rawCards = cards.filter(c => c.folder_id === folderId);

    // RULE: The developer cannot see the admin's user card or the users' user cards
    // but the admin and users can see the developer's user card.
    if (currentUser?.role === UserRole.DEV) {
      // Dev only sees cards where they are the creator, OR other Dev-level cards
      rawCards = rawCards.filter(c => c.creator_role === UserRole.DEV || c.user_id === currentUser.id);
    }

    // Universal folder strictly shows Dev infrastructure
    if (folder?.party_id === SYSTEM_PARTY_ID) {
      return rawCards.filter(c => c.creator_role === UserRole.DEV);
    }
    
    return rawCards;
  }, [cards, folderId, folders, currentUser]);

  const folderInstructions = useMemo(() => {
    if (!folderId) return [];
    return instructions.filter(i => i.folder_id === folderId);
  }, [instructions, folderId]);

  const filteredCards = useMemo(() => {
    const filtered = folderCards.filter(c => 
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.external_link.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      const isAOwn = a.user_id === currentUser?.id;
      const isBOwn = b.user_id === currentUser?.id;
      if (isAOwn && !isBOwn) return -1;
      if (!isAOwn && isBOwn) return 1;
      return b.timestamp - a.timestamp;
    });
  }, [folderCards, searchQuery, currentUser?.id]);

  const renderInstructionContent = (text: any) => {
    let contentStr = "";
    if (typeof text === 'string') {
      contentStr = text;
    } else if (text?.message) {
      contentStr = text.message;
    } else if (text) {
      try {
        contentStr = JSON.stringify(text);
      } catch {
        contentStr = String(text);
      }
    }

    const parts = contentStr.split('\n');
    const boldRegex = /\*\*(.*?)\*\*/g;

    return parts.map((line, i) => {
      if (line.trim().startsWith('## ')) {
        return <h2 key={i} className="text-[#00ff9d] text-xl font-black mb-3 mt-4 first:mt-0 tracking-tighter uppercase">{line.replace('## ', '').trim()}</h2>;
      }
      const segments = line.split(boldRegex);
      const formatted = segments.map((segment, index) => {
        if (index % 2 === 1) return <b key={index} className="text-[#2563eb] dark:text-[#60a5fa] font-black">{segment}</b>;
        return segment;
      });
      return <p key={i} className="text-sm leading-relaxed mb-1 opacity-90 font-medium">{formatted}</p>;
    });
  };

  if (!folderId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 dark:bg-slate-800">
          <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
        </div>
        <p className="text-lg font-bold text-slate-500">Select a community folder</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Pinned Instructions Section */}
      {folderInstructions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {folderInstructions.map(box => (
            <div 
              key={box.id}
              className={`p-8 rounded-[2.5rem] border shadow-lg relative overflow-hidden transition-all hover:shadow-xl ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'}`}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <div className="relative z-10">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 block">Pinned Information</span>
                {renderInstructionContent(box.content)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Grid - Always Side-by-Side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 lg:gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {filteredCards.length > 0 ? (
          filteredCards.map(card => (
            <UserCard key={card.id} card={card} onEdit={() => onEditCard(card)} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
             <div className="inline-flex p-6 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             </div>
             <p className="text-slate-500 font-bold">No profiles established in this community yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardGrid;
