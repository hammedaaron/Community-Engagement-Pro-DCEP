
import React, { useState } from 'react';
import { useApp } from '../App';
import { UserRole } from '../types';
import { optimizeIdentity } from '../services/gemini';

interface CreateProfileModalProps {
  onClose: () => void;
  onSubmit: (name: string, link1: string, link2: string, link1Label?: string, link2Label?: string, isPermanent?: boolean) => void;
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({ onClose, onSubmit }) => {
  const { currentUser, theme, cards, selectedFolderId, showToast } = useApp();
  const [name, setName] = useState(currentUser?.name || '');
  const [link1, setLink1] = useState('');
  const [link2, setLink2] = useState('');
  const [link1Label, setLink1Label] = useState('Post 1');
  const [link2Label, setLink2Label] = useState('Post 2');
  const [isPermanent, setIsPermanent] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const isDark = theme === 'dark';

  const alreadyHasProfile = cards.some(c => c.userId === currentUser?.id && c.folderId === selectedFolderId);
  const isDev = currentUser?.role === UserRole.DEV;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  
  // Expiration & Rate Limit Check
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const userRecentCards = cards.filter(c => c.userId === currentUser?.id && c.timestamp > now - DAY_MS);
  
  const isEnforced = alreadyHasProfile && !isDev && !isAdmin;
  const reachedRateLimit = !isDev && (
    (isAdmin && userRecentCards.length >= 2) || 
    (!isAdmin && userRecentCards.length >= 1)
  );

  const handlePost = () => {
    if (isEnforced) {
      showToast("Profile exists already in this community.", "error");
      return;
    }
    if (reachedRateLimit) {
      const limit = isAdmin ? "2 posts" : "1 post";
      showToast(`Rate Limit: Max ${limit} per 24 hours.`, "error");
      return;
    }

    if (!name.trim() || !link1.trim()) return;
    
    let cleanLink1 = link1.trim();
    if (!cleanLink1.startsWith('http://') && !cleanLink1.startsWith('https://')) cleanLink1 = `https://${cleanLink1}`;
    
    let cleanLink2 = link2.trim();
    if (cleanLink2 && !cleanLink2.startsWith('http://') && !cleanLink2.startsWith('https://')) cleanLink2 = `https://${cleanLink2}`;

    onSubmit(name.trim(), cleanLink1, cleanLink2, isDev ? link1Label : undefined, isDev ? link2Label : undefined, isDev ? isPermanent : false);
  };

  const handleOptimize = async () => {
    if (!link1.trim()) {
      showToast("Enter Link 1 first to optimize your identity.", "error");
      return;
    }
    setIsOptimizing(true);
    try {
      const bestName = await optimizeIdentity(name, link1);
      setName(bestName);
      showToast("Identity Enhanced with AI ✨");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`w-full max-w-lg overflow-hidden transform transition-all rounded-t-[3rem] sm:rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-full duration-500 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'}`}>
        <div className="px-10 py-8 flex items-center justify-between">
          <h3 className={`font-black text-2xl tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Establish Node</h3>
          <button onClick={onClose} className={`p-3 rounded-2xl transition-all ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="px-10 pb-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {(isEnforced || reachedRateLimit) ? (
            <div className={`p-8 rounded-[2rem] border text-center space-y-4 ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-amber-500/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-sm font-black text-slate-500 uppercase tracking-widest">
                {isEnforced ? 'One card per community limit reached.' : '24-Hour Rate Limit Reached.'}
              </p>
              <p className="text-xs font-medium text-slate-400">Wait for your previous cards to expire (48h) or until your 24h quota resets.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2 relative">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Display Identity</label>
                <div className="relative">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Vitalik B." className={`w-full rounded-2xl px-6 py-4 text-base font-bold transition-all focus:ring-4 focus:ring-indigo-500/10 outline-none border ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`} />
                  <button onClick={handleOptimize} disabled={isOptimizing} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white rounded-xl transition-all disabled:opacity-30" title="Optimize with AI">
                    {isOptimizing ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.586 15.586a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM16 11a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1z" /></svg>}
                  </button>
                </div>
              </div>

              {isDev && (
                <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 space-y-4 animate-in fade-in slide-in-from-top-4">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Architect Priorities</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Enable Permanence</span>
                    <button 
                      onClick={() => setIsPermanent(!isPermanent)}
                      className={`w-12 h-6 rounded-full transition-all relative border ${isPermanent ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-700 border-slate-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPermanent ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Label 1</label>
                       <input type="text" value={link1Label} onChange={(e) => setLink1Label(e.target.value)} className={`w-full bg-slate-800 border-slate-700 text-white rounded-xl px-4 py-2 text-xs font-bold outline-none border focus:border-emerald-500`} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Label 2</label>
                       <input type="text" value={link2Label} onChange={(e) => setLink2Label(e.target.value)} className={`w-full bg-slate-800 border-slate-700 text-white rounded-xl px-4 py-2 text-xs font-bold outline-none border focus:border-emerald-500`} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Post Link 1 (Primary)</label>
                <input type="text" value={link1} onChange={(e) => setLink1(e.target.value)} placeholder="x.com/post/..." className={`w-full rounded-2xl px-6 py-4 text-base font-bold transition-all focus:ring-4 focus:ring-indigo-500/10 outline-none border ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Post Link 2 (Optional)</label>
                <input type="text" value={link2} onChange={(e) => setLink2(e.target.value)} placeholder="x.com/other-post/..." className={`w-full rounded-2xl px-6 py-4 text-base font-bold transition-all focus:ring-4 focus:ring-indigo-500/10 outline-none border ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`} />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button onClick={onClose} className={`flex-1 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-500'}`}>Cancel</button>
            {(!isEnforced && !reachedRateLimit) && (
              <button onClick={handlePost} disabled={!name.trim() || !link1.trim() || isOptimizing} className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all text-sm uppercase tracking-widest disabled:opacity-30">
                Establish Node
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProfileModal;
