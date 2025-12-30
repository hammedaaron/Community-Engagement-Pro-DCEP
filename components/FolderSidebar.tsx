
import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { UserRole, Folder } from '../types';
import { addFolder as dbAddFolder, updateFolderName as dbUpdateFolderName, deleteFolder as dbDeleteFolder, updatePartyTimezone, SYSTEM_PARTY_ID } from '../db';

interface FolderSidebarProps {
  onSelect?: () => void;
}

// Expanded validated timezone list helper
const ALL_TIMEZONES = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver', 
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 
  'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland'
];

const FolderSidebar: React.FC<FolderSidebarProps> = ({ onSelect }) => {
  const { 
    folders, setFolders, selectedFolderId, setSelectedFolderId, 
    currentUser, theme, isAdmin, isDev, logout, activeParty, showToast
  } = useApp();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isChangingTz, setIsChangingTz] = useState(false);
  const [tzSearch, setTzSearch] = useState('');

  const isDark = theme === 'dark';

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => {
      const aIsSystem = a.party_id === SYSTEM_PARTY_ID;
      const bIsSystem = b.party_id === SYSTEM_PARTY_ID;
      if (aIsSystem && !bIsSystem) return -1;
      if (!aIsSystem && bIsSystem) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [folders]);

  const filteredTimezones = useMemo(() => {
    if (!tzSearch) return ALL_TIMEZONES.slice(0, 15);
    return ALL_TIMEZONES.filter((tz: string) => 
      tz.toLowerCase().includes(tzSearch.toLowerCase())
    ).slice(0, 15);
  }, [tzSearch]);

  const handleSelect = (id: string) => {
    if (editingFolderId) return; 
    setSelectedFolderId(id);
    if (onSelect) onSelect();
  };

  const handleTzChange = async (tz: string) => {
    if (!activeParty) return;
    try {
      await updatePartyTimezone(activeParty.id, tz);
      setIsChangingTz(false);
      setTzSearch('');
      showToast(`Hub Boundary set to ${tz}`);
    } catch (err: any) {
      showToast(err.message || "Tz update failed", "error");
    }
  };

  const addFolder = async (name: string) => {
    if (!name.trim() || !activeParty) return;
    try {
      const folderPartyId = isDev ? SYSTEM_PARTY_ID : activeParty.id;
      const newFolder: Folder = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        icon: isDev ? 'Sparkles' : 'Folder',
        party_id: folderPartyId
      };
      await dbAddFolder(newFolder);
      setNewFolderName('');
      setIsAdding(false);
      showToast(isDev ? "Universal Community Established" : "Local Community Created");
    } catch (err) {
      showToast("Error adding community", "error");
    }
  };

  const copyInviteLink = () => {
    if (!activeParty) return;
    const nameSlug = activeParty.name.replace(/\s+/g, '-');
    const shareLink = `${window.location.origin}${window.location.pathname}#/party/${activeParty.id}/${nameSlug}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      showToast(`${activeParty.name} invite link copied!`);
    });
  };

  const renameFolder = async (id: string) => {
    if (!editingFolderName.trim() || !activeParty) {
      setEditingFolderId(null);
      return;
    }
    const folder = folders.find(f => f.id === id);
    if (folder?.party_id === SYSTEM_PARTY_ID && !isDev) {
      showToast("Only System Architect can rename Universal Folders.", "error");
      setEditingFolderId(null);
      return;
    }
    try {
      await dbUpdateFolderName(id, editingFolderName.trim());
      setEditingFolderId(null);
    } catch (err) {
      showToast("Error renaming community", "error");
    }
  };

  const removeFolder = async (id: string) => {
    const folder = folders.find(f => f.id === id);
    if (!folder) return;

    if (folder.party_id === SYSTEM_PARTY_ID && !isDev) {
      showToast("Universal Communities can only be terminated by the System Architect.", "error");
      return;
    }

    if (!window.confirm(`Delete ${folder.name}?`)) return;
    try {
      await dbDeleteFolder(id);
      if (selectedFolderId === id) setSelectedFolderId(null);
      showToast("Community Deleted");
    } catch (err) {
      showToast("Error deleting community", "error");
    }
  };

  return (
    <aside className={`w-full lg:w-72 flex flex-col h-full border-r transition-colors duration-500 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-xl z-20'}`}>
      <div className="p-8 pb-4">
        <h2 className={`font-black text-2xl tracking-tighter flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${isDev ? 'bg-emerald-500 shadow-emerald-500/20' : isAdmin ? 'bg-amber-500 shadow-amber-500/20' : 'bg-indigo-600 shadow-indigo-500/20'}`}>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <div className="truncate flex flex-col">
            <span className="truncate leading-none">{isDev ? 'Architect' : (activeParty?.name || 'Hub')}</span>
            {!isDev && activeParty && (
               <button onClick={() => (isAdmin || isDev) && setIsChangingTz(!isChangingTz)} className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1 flex items-center gap-1 hover:text-indigo-400 transition-colors">
                 {activeParty.timezone || 'UTC'}
                 {(isAdmin || isDev) && <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>}
               </button>
            )}
          </div>
        </h2>
        
        {isChangingTz && (
          <div className="mt-4 p-5 bg-slate-100 dark:bg-slate-800/80 rounded-[2rem] border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300 shadow-xl relative z-30">
             <div className="flex items-center justify-between mb-3">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hub Boundary</p>
               <button onClick={() => setIsChangingTz(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             <div className="relative mb-4">
               <input 
                 type="text" 
                 placeholder="Search Timezones..." 
                 value={tzSearch}
                 onChange={e => setTzSearch(e.target.value)}
                 className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'}`}
               />
               <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
             <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
               {filteredTimezones.map((tz: string) => (
                 <button 
                   key={tz} 
                   onClick={() => handleTzChange(tz)} 
                   className={`w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight text-left truncate transition-all border-2 ${activeParty?.timezone === tz ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : isDark ? 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}
                 >
                   {tz.replace(/_/g, ' ')}
                 </button>
               ))}
               {filteredTimezones.length === 0 && <p className="text-[10px] text-center text-slate-500 py-4 font-bold">No results found.</p>}
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
        {isDev && (
          <div className="mb-8 px-2">
            <button
              onClick={() => handleSelect('authority-table')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                selectedFolderId === 'authority-table'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold'
              }`}
            >
              <span className="text-xl">🕵️‍♂️</span>
              <span className="truncate">Global Authority</span>
            </button>
          </div>
        )}

        <div className="mb-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
          <span>{isDev ? 'Global Infrastructure' : 'Communities'}</span>
          {(isAdmin && !isDev) && (
            <button onClick={copyInviteLink} className="text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              INVITE
            </button>
          )}
        </div>
        
        <nav className="space-y-1.5">
          {sortedFolders.map(folder => (
            <div key={folder.id} className="group flex items-center gap-1">
              {editingFolderId === folder.id ? (
                <div className="flex-1 flex items-center gap-2 p-1.5 bg-indigo-50 dark:bg-slate-800 rounded-2xl border border-indigo-200 dark:border-slate-700">
                  <input 
                    autoFocus
                    className="flex-1 bg-transparent px-3 py-1.5 text-sm font-bold outline-none text-slate-900 dark:text-white"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && renameFolder(folder.id)}
                  />
                  <button onClick={() => renameFolder(folder.id)} className="p-2 bg-indigo-600 text-white rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleSelect(folder.id)}
                    className={`flex-1 flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                      selectedFolderId === folder.id 
                        ? (isDev ? 'bg-emerald-600' : isAdmin ? 'bg-amber-500' : 'bg-indigo-600') + ' text-white shadow-lg' 
                        : `hover:bg-slate-100 ${isDark ? 'hover:bg-slate-800 hover:text-white' : ''} font-semibold`
                    }`}
                  >
                    <span className="text-xl">
                      {folder.party_id === SYSTEM_PARTY_ID ? '⚡' : folder.icon === 'Sparkles' ? '✨' : '📁'}
                    </span>
                    <span className="truncate">{folder.name}</span>
                  </button>
                  {(isAdmin || isDev) && (
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); }} className="p-2 text-slate-400 hover:text-indigo-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => removeFolder(folder.id)} className="p-2 text-slate-400 hover:text-red-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>

        {(isAdmin || isDev) && (
          <div className="mt-8 px-2">
            {!isAdding ? (
              <button onClick={() => setIsAdding(true)} className={`w-full py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-dashed flex items-center justify-center gap-2 transition-all ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-emerald-500' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`}>
                + {isDev ? 'Establish Universal Community' : 'Launch New Community'}
              </button>
            ) : (
              <div className={`p-5 rounded-[2rem] border shadow-xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <input 
                  autoFocus type="text" placeholder="Community Name" 
                  value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm mb-4 outline-none border font-bold ${isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-slate-300'}`}
                />
                <div className="flex gap-2">
                  <button onClick={() => addFolder(newFolderName)} className={`flex-1 text-white text-[10px] font-black py-3 rounded-xl ${isDev ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-amber-500 shadow-lg shadow-amber-500/20'}`}>Add</button>
                  <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-200 dark:bg-slate-700 text-[10px] font-black py-3 rounded-xl">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`p-6 border-t ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'} space-y-4`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-xl ${isDev ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/20' : isAdmin ? 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/20' : 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-500/20'}`}>
            {currentUser?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser?.name}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDev ? 'text-emerald-400' : isAdmin ? 'text-amber-500' : 'text-slate-500'}`}>
              {isDev ? 'System Architect' : isAdmin ? 'Master Admin' : 'Active User'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={logout}
          className="w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default FolderSidebar;
