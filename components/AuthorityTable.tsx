
import React, { useEffect, useState, useCallback } from 'react';
import { getAuthorityData, deleteParty, deleteUser, resetAllData, SYSTEM_PARTY_ID } from '../db';
import { Party, User, Folder, Card } from '../types';
import { useApp } from '../App';

const AuthorityTable: React.FC = () => {
  const { showToast, logout } = useApp();
  const [data, setData] = useState<{
    parties: Party[];
    users: User[];
    folders: Folder[];
    cards: Card[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuthorityData();
      setData(res);
    } catch (err) {
      console.error("Data Refresh Error:", err);
      showToast("Sync Error: Authority data could not be fully loaded.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleGlobalReset = async () => {
    if (!window.confirm("CRITICAL WARNING: You are about to initiate a TOTAL SYSTEM PURGE.\n\nOnly the System Architect node will survive. Continue?")) return;
    
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const entry = window.prompt(`FINAL SECURITY CHECK: To confirm, enter the verification code: ${code}`);
    
    if (entry !== code) {
      showToast("Code incorrect. Purge aborted.", "error");
      return;
    }

    try {
      setIsPurging(true);
      showToast("Wiping global database infrastructure...");
      await resetAllData();
      showToast("Infrastructure sanitized successfully.");
      setTimeout(() => {
        logout();
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error("Global Reset Error Detail:", err);
      showToast("Purge failed: " + (err.message || "Unknown DB Error"), "error");
      setIsPurging(false);
    }
  };

  const handleTerminateParty = async (party: Party) => {
    if (party.id === SYSTEM_PARTY_ID) {
      showToast("System Core (ID: SYSTEM) is protected.", "error");
      return;
    }

    // Fix: access party_id instead of partyId to match User type
    const memberCount = data?.users.filter(u => u.party_id === party.id).length || 0;
    if (!window.confirm(`Dissolve community "${party.name}" (ID: ${party.id})?\n\nThis will expel all ${memberCount} members and clear all community nodes.`)) return;

    try {
      setProcessingId(party.id);
      showToast(`Terminating hub ${party.id}...`);
      await deleteParty(party.id);
      showToast(`Hub dissolved. ID ${party.id} is now available.`);
      await refreshData();
    } catch (err: any) {
      console.error("Termination Error Detail:", err);
      showToast("Failed: " + (err.message || "Permission Denied"), "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveUser = async (user: User) => {
    if (user.id === 'dev-master-root') {
      showToast("Access Denied: Protected Node.", "error");
      return;
    }
    
    // Fix: access party_id instead of partyId to match User type
    if (!window.confirm(`Permanently expel member "${user.name}" from community ${user.party_id}?`)) return;
    
    try {
      setProcessingId(user.id);
      showToast(`Expelling member ${user.name}...`);
      await deleteUser(user.id);
      showToast("Member node removed.");
      await refreshData();
    } catch (err: any) {
      console.error("Expulsion Error Detail:", err);
      showToast("Failed: " + (err.message || "Permission Denied"), "error");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-emerald-500">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="font-black uppercase tracking-[0.3em] text-xs">Accessing Authority Records...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-12 pb-32 animate-in fade-in duration-700 ${isPurging ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-12">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[9px] font-black uppercase tracking-widest mb-2">
            Architect Access: Command Level
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase">Authority Console</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Global Management of Communities & Nodes</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            disabled={loading || isPurging}
            onClick={refreshData}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all border border-slate-700"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {loading ? 'Syncing...' : 'Sync Data'}
          </button>
          <button 
            disabled={isPurging}
            onClick={handleGlobalReset}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-red-500/30 text-xs uppercase tracking-widest flex items-center justify-center gap-3 transform transition-all active:scale-95 group"
          >
            <svg className={`w-5 h-5 ${isPurging ? 'animate-spin' : 'group-hover:animate-pulse'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {isPurging ? 'PURGING SYSTEM...' : 'Wipe Everything'}
          </button>
        </div>
      </header>

      {/* Resource Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Communities', value: data?.parties.length || 0, color: 'text-emerald-400' },
          { label: 'Total Members', value: data?.users.length || 0, color: 'text-indigo-400' },
          { label: 'Folders', value: data?.folders.length || 0, color: 'text-amber-400' },
          { label: 'Profile Cards', value: data?.cards.length || 0, color: 'text-violet-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</div>
            <div className={`text-2xl sm:text-3xl font-black ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
        {/* Parties Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col min-h-[400px]">
          <div className="p-8 bg-emerald-500/10 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <h3 className="text-white font-black uppercase tracking-widest text-sm">Active Communities</h3>
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Available IDs: {89 - (data?.parties.length || 0)}</span>
          </div>
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 text-slate-500 uppercase font-black border-b border-slate-800">
                <tr>
                  <th className="p-6">Code</th>
                  <th className="p-6">Name</th>
                  <th className="p-6 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data?.parties.map(p => (
                  <tr key={p.id} className="group hover:bg-white/5 transition-all">
                    <td className="p-6">
                      <span className="font-mono text-emerald-500 text-lg font-black bg-emerald-500/5 px-3 py-1 rounded-lg border border-emerald-500/10">{p.id}</span>
                    </td>
                    <td className="p-6">
                      <div className="font-black text-white text-base truncate max-w-[150px]">{p.name}</div>
                      <div className="text-[9px] text-slate-500 uppercase font-bold mt-1">Resource Managed</div>
                    </td>
                    <td className="p-6 text-right">
                      {p.id !== SYSTEM_PARTY_ID ? (
                        <button 
                          disabled={processingId === p.id}
                          onClick={() => handleTerminateParty(p)}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500 disabled:opacity-50 text-red-500 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg hover:shadow-red-500/20"
                        >
                          {processingId === p.id ? 'Terminating...' : 'Terminate'}
                        </button>
                      ) : (
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Users Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col min-h-[400px]">
          <div className="p-8 bg-indigo-500/10 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-white font-black uppercase tracking-widest text-sm">Registered Members</h3>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 text-slate-500 uppercase font-black border-b border-slate-800">
                <tr>
                  <th className="p-6">Member</th>
                  <th className="p-6">Role</th>
                  <th className="p-6 text-right">Expel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data?.users.map(u => (
                  <tr key={u.id} className="group hover:bg-white/5 transition-all">
                    <td className="p-6">
                      <div className="font-black text-white text-base">{u.name}</div>
                      {/* Fix: access party_id instead of partyId to match User type */}
                      <div className="text-[9px] text-slate-500 truncate max-w-[120px] font-mono">{u.party_id === SYSTEM_PARTY_ID ? 'SYSTEM' : `HUB ${u.party_id}`}</div>
                    </td>
                    <td className="p-6">
                      <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        u.role === 'ADMIN' ? 'bg-amber-500 text-white' : 
                        u.role === 'DEV' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      {u.id !== 'dev-master-root' ? (
                        <button 
                          disabled={processingId === u.id}
                          onClick={() => handleRemoveUser(u)}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500 disabled:opacity-50 text-red-500 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg hover:shadow-red-500/20"
                        >
                          {processingId === u.id ? 'Expelling...' : 'Expel'}
                        </button>
                      ) : (
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthorityTable;
