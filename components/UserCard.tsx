
import React, { useMemo, useState } from 'react';
import { Card, UserRole } from '../types';
import { useApp } from '../App';

interface UserCardProps {
  card: Card;
  onEdit: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ card, onEdit }) => {
  const { currentUser, follows, toggleFollow, cards, isPoweredUp, theme, isAdmin, isDev, activeParty, showToast } = useApp();
  
  const [visited1, setVisited1] = useState(false);
  const [visited2, setVisited2] = useState(false);

  // Corrected to use snake_case properties from Follow interface
  const isFollowed = follows.some(f => f.follower_id === currentUser?.id && f.target_card_id === card.id);
  const isOwnCard = card.user_id === currentUser?.id;
  const isDark = theme === 'dark';
  
  const followsMe = follows.some(f => {
    const myCardIds = cards.filter(c => c.user_id === currentUser?.id).map(c => c.id);
    return f.follower_id === card.user_id && myCardIds.includes(f.target_card_id);
  });

  const isMutual = isFollowed && followsMe;
  const isDevOwned = card.creator_role === UserRole.DEV;
  const isAdminOwned = card.creator_role === UserRole.ADMIN;

  const canManage = useMemo(() => {
    if (isDev) return true;
    if (isAdmin) {
      if (isDevOwned) return false;
      return true;
    }
    return isOwnCard;
  }, [isDev, isAdmin, isDevOwned, isOwnCard]);

  const now = Date.now();
  const CARD_EXPIRY_MS = 48 * 60 * 60 * 1000;
  const timeLeftMs = Math.max(0, (card.timestamp + CARD_EXPIRY_MS) - now);
  const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));

  const hasLink2 = !!card.external_link2 && card.external_link2.trim().length > 0;
  const allLinksVisited = visited1 && (!hasLink2 || visited2);

  const absoluteLink1 = useMemo(() => {
    const url = card.external_link?.trim();
    if (!url) return '#';
    return url.startsWith('http') ? url : `https://${url}`;
  }, [card.external_link]);

  const absoluteLink2 = useMemo(() => {
    const url = card.external_link2?.trim();
    if (!url) return '#';
    return url.startsWith('http') ? url : `https://${url}`;
  }, [card.external_link2]);

  const stats = useMemo(() => {
    if (!activeParty) return { followers: 0, following: 0 };
    const targetUserCards = cards.filter(c => c.user_id === card.user_id).map(c => c.id);
    const uniqueFollowers = new Set(
      follows.filter(f => targetUserCards.includes(f.target_card_id) && f.party_id === activeParty.id).map(f => f.follower_id)
    ).size;
    const uniqueFollowing = new Set(
      follows.filter(f => f.follower_id === card.user_id && f.party_id === activeParty.id)
        .map(f => cards.find(c => c.id === f.target_card_id)?.user_id)
        .filter(id => id !== undefined)
    ).size;
    return { followers: uniqueFollowers, following: uniqueFollowing };
  }, [follows, card.user_id, activeParty, cards]);

  const handleEngageToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFollowed && !allLinksVisited) {
      const missing = !visited1 ? (card.link1_label || "Post 1") : (card.link2_label || "Post 2");
      showToast(`Verification required: Check ${missing} before engaging.`, "error");
      return;
    }
    if (isFollowed) {
      if (window.confirm(`Stop engaging with ${card.display_name}?`)) toggleFollow(card.id);
    } else {
      toggleFollow(card.id);
    }
  };
  
  const borderColor = isDevOwned ? 'border-emerald-500' : isAdminOwned ? 'border-orange-500' : isFollowed ? 'border-indigo-500/30' : 'border-slate-100 dark:border-slate-800';
  
  return (
    <div 
      id={`card-${card.id}`}
      className={`relative rounded-[2rem] p-6 transition-all duration-300 flex flex-col h-full border z-10 overflow-hidden ${
        isPoweredUp ? 'glass-card shimmer' : isDark ? 'bg-slate-900' : 'bg-white shadow-sm'
      } ${borderColor} ${isFollowed ? 'scale-[0.98]' : 'hover:-translate-y-1 hover:shadow-xl'}`}
    >
      {isDevOwned && <div className="star-dust"></div>}

      <div className="flex flex-col h-full relative z-20">
        <div className="flex items-start justify-between mb-4 overflow-hidden">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border-2 shrink-0 transition-all ${
              isDevOwned ? 'bg-emerald-500 text-white border-emerald-400' : 
              isAdminOwned ? 'bg-orange-500 text-white border-orange-400' :
              isMutual ? 'bg-emerald-500 text-white border-emerald-400' : 
              isDark ? 'bg-slate-800 border-slate-700 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
            }`}>
              {card.display_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`font-extrabold text-base leading-tight break-words whitespace-normal ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {card.display_name}
              </h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {isDevOwned ? (
                  <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">System Architect</span>
                ) : isAdminOwned ? (
                  <span className="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Master Admin</span>
                ) : null}
                {isMutual && <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Mutual</span>}
              </div>
            </div>
          </div>
          {canManage && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className={`p-1.5 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-500'}`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
            </button>
          )}
        </div>

        <div className={`grid grid-cols-2 gap-2 mb-4 p-3 rounded-2xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          <div className="text-center border-r border-slate-200 dark:border-slate-800">
            <p className={`text-[14px] font-black ${isDevOwned ? 'text-emerald-400' : isAdminOwned ? 'text-orange-500' : 'text-indigo-500'}`}>{stats.followers}</p>
            <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Followers</p>
          </div>
          <div className="text-center">
            <p className={`text-[14px] font-black ${isDevOwned ? 'text-emerald-400' : isAdminOwned ? 'text-orange-500' : 'text-indigo-500'}`}>{stats.following}</p>
            <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Following</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
           <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Node Stability</span>
           <span className={`text-[8px] font-black uppercase tracking-widest ${hoursLeft < 12 && !card.is_permanent ? 'text-red-500' : 'text-emerald-500'}`}>
             {card.is_permanent ? 'PERMANENT' : `${hoursLeft}H Left`}
           </span>
        </div>

        <div className="mt-auto space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <a href={absoluteLink1} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); setVisited1(true); }}
              className={`flex items-center justify-center gap-2 w-full py-3 px-4 text-xs font-black rounded-2xl transition-all border ${
                visited1 ? (isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                : (isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700')
              }`}
            >
              {visited1 && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
              <span>{card.link1_label || 'Post 1'}</span>
            </a>
            {hasLink2 && (
              <a href={absoluteLink2} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); setVisited2(true); }}
                className={`flex items-center justify-center gap-2 w-full py-3 px-4 text-xs font-black rounded-2xl transition-all border ${
                  visited2 ? (isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                : (isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700')
              }`}
            >
              {visited2 && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
              <span>{card.link2_label || 'Post 2'}</span>
            </a>
          )}
          </div>

          {!isOwnCard ? (
            <button onClick={handleEngageToggle}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition-all shadow-lg border-2 ${
                isFollowed ? 'bg-emerald-500 border-emerald-400 text-white' 
                : !allLinksVisited ? 'bg-slate-400 border-slate-300 opacity-60 cursor-not-allowed text-white'
                : (isDevOwned ? 'bg-emerald-600 border-emerald-500' : isAdminOwned ? 'bg-orange-600 border-orange-500' : 'bg-indigo-600 border-indigo-500') + ' text-white'
              }`}
            >
              {isFollowed ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                  <span>{isMutual ? 'Mutual Connected' : 'Engaged'}</span>
                </>
              ) : (
                <>
                  <span>{allLinksVisited ? (followsMe ? 'Engage Back' : 'Engage Now') : 'Visit Links to Unlock'}</span>
                </>
              )}
            </button>
          ) : (
            <div className={`w-full text-center py-3 px-4 text-[10px] font-black rounded-2xl uppercase tracking-widest border border-dashed ${isDark ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
              Your Identity
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
