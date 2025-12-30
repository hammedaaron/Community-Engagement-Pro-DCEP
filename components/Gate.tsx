
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { getParties, validateAdminPassword, validateDevPassword, registerParty, loginUser, registerUser, checkUserExists, findPartyByName, ensureDevUser } from '../db';
import LandingPage from './LandingPage';
import AdminDocs from './AdminDocs';
import UserDocs from './UserDocs';

// Helper to get all standard timezones
const ALL_TIMEZONES = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver', 
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 
  'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland'
];

interface GateProps {
  onAuth: (user: User) => void;
}

const Gate: React.FC<GateProps> = ({ onAuth }) => {
  const [mode, setMode] = useState<'land' | 'admin-signup' | 'login' | 'success'>('land');
  const [partyName, setPartyName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [error, setError] = useState('');
  const [dbParties, setDbParties] = useState<{id: string, name: string}[]>([]);
  const [showAdminDocs, setShowAdminDocs] = useState(false);
  const [showUserDocs, setShowUserDocs] = useState(false);
  const [showAdminTips, setShowAdminTips] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const parties = await getParties();
        setDbParties(parties || []);
      } catch (err) {
        console.error("Supabase Connectivity Error:", err);
      }
    };
    fetchParties();

    const match = window.location.hash.match(/#\/party\/([1-9]{2})(?:\/([^\/]+))?/);
    if (match && match[2]) {
      setPartyName(decodeURIComponent(match[2].replace(/-/g, ' ')));
      setMode('login');
    }
  }, []);

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (username !== 'Admin') throw new Error("Admin username must be 'Admin'.");
      await registerParty(partyName, password, timezone);
      setMode('success');
      const parties = await getParties();
      setDbParties(parties);
    } catch (err: any) {
      setError(err.message || "Failed to create community.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (cleanUsername === 'Dev' && validateDevPassword(cleanPassword)) {
      try {
        const devUser = await ensureDevUser();
        onAuth(devUser);
        return;
      } catch (err) {
        setError("Failed to initialize System Architect node.");
        return;
      }
    }

    const cleanPartyName = partyName.trim();
    if (!cleanPartyName) {
      setError("Please enter a Membership name.");
      return;
    }

    try {
      const activeParty = await findPartyByName(cleanPartyName);
      if (!activeParty) {
        setError(`Membership "${cleanPartyName}" not found.`);
        return;
      }

      const user = await loginUser(cleanUsername, cleanPassword, activeParty.id);

      if (user) {
        onAuth(user);
      } else {
        const adminInfo = validateAdminPassword(cleanPassword);
        
        if (adminInfo && cleanUsername === 'Admin') {
          if (adminInfo.partyId === activeParty.id) {
            const adminId = `admin-${adminInfo.partyId}-${adminInfo.adminId}`;
            const newAdmin: User = {
              id: adminId,
              name: 'Admin',
              admin_code: cleanPassword,
              role: UserRole.ADMIN,
              party_id: activeParty.id
            };

            try {
              await registerUser(newAdmin);
              onAuth(newAdmin);
            } catch (regErr: any) {
              const retryUser = await loginUser(cleanUsername, cleanPassword, activeParty.id);
              if (retryUser) onAuth(retryUser);
              else setError("Admin key mismatch for this account.");
            }
            return;
          } else {
            setError(`Admin key ${adminInfo.partyId} does not match community ${activeParty.id}.`);
            return;
          }
        }

        const exists = await checkUserExists(cleanUsername, activeParty.id);
        if (exists) {
          setError("Invalid credentials.");
        } else {
          const newUser: User = {
            id: Math.random().toString(36).substr(2, 9),
            name: cleanUsername,
            password: cleanPassword,
            role: UserRole.REGULAR,
            party_id: activeParty.id
          };
          await registerUser(newUser);
          onAuth(newUser);
        }
      }
    } catch (err: any) {
      setError("Authentication failed.");
    }
  };

  const takenIds = dbParties.map(p => p.id);
  const availableCount = 89 - takenIds.length;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 overflow-y-auto custom-scrollbar">
      {showAdminDocs && <AdminDocs onClose={() => setShowAdminDocs(false)} />}
      {showUserDocs && <UserDocs onClose={() => setShowUserDocs(false)} />}
      
      <div className="fixed inset-0 opacity-40 pointer-events-none overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-full bg-violet-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-start py-10">
        {mode === 'land' ? (
          <LandingPage 
            onCreate={() => { setMode('admin-signup'); setPartyName(''); setError(''); }}
            onJoin={() => { setMode('login'); setError(''); }}
          />
        ) : (
          <div className="w-full max-w-xl px-4 animate-in fade-in zoom-in-95 duration-500">
            {(mode === 'admin-signup' || mode === 'login') && (
              <form onSubmit={mode === 'admin-signup' ? handleAdminSignup : handleLogin} className="bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl space-y-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col flex-1">
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {mode === 'admin-signup' ? 'Setup Your Hub' : 'Identity Membership'}
                    </h2>
                    <p className="text-slate-400 text-xs font-bold mt-1">
                      {mode === 'admin-signup' ? 'Create a unique name for your community.' : 'Enter the name of the community you want to join.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {mode === 'admin-signup' && (
                      <button 
                        type="button" 
                        onClick={() => setShowAdminDocs(true)}
                        className="flex flex-col items-center gap-1 group"
                        title="Admin Blueprint"
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">Admin</span>
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => setShowUserDocs(true)}
                      className="flex flex-col items-center gap-1 group"
                      title="Member Handbook"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      </div>
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">Guide</span>
                    </button>
                  </div>
                </div>

                {mode === 'admin-signup' && (
                  <div className="animate-in slide-in-from-top-4 duration-500 space-y-4">
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setShowAdminTips(!showAdminTips)}
                        className="flex-1 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between text-indigo-400"
                      >
                        <div className="flex items-center gap-3">
                          <div className="animate-bounce">💡</div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Admin Tips</span>
                        </div>
                        <svg className={`w-4 h-4 transition-transform ${showAdminTips ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowAvailability(!showAvailability)}
                        className={`px-4 py-2 rounded-2xl border transition-all flex flex-col items-center justify-center min-w-[100px] ${showAvailability ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-tighter">{availableCount} Left</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest">Free IDs</span>
                      </button>
                    </div>

                    {showAdminTips && (
                      <div className="p-5 bg-slate-950/50 rounded-2xl border border-slate-800 text-[11px] font-medium text-slate-400 leading-relaxed space-y-2 animate-in fade-in zoom-in-95">
                        <p>1. Set your <strong className="text-white">Username</strong> to exactly <code className="text-indigo-400 font-bold">Admin</code>.</p>
                        <p>2. Set a <strong className="text-white">Password</strong> following the <code className="text-indigo-400 font-bold">Hamstar[XX][Y]</code> rule.</p>
                        <p>3. <strong className="text-white">Authoritative Timezone</strong>: All calendar rules derive from this setting.</p>
                      </div>
                    )}

                    {showAvailability && (
                      <div className="p-6 bg-slate-950/80 rounded-[2rem] border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                          Available Party IDs (11-99)
                          <span className="text-emerald-500">Pick any GREEN number</span>
                        </h4>
                        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                          {Array.from({ length: 89 }, (_, i) => {
                            const id = (i + 11).toString();
                            const isTaken = takenIds.includes(id);
                            return (
                              <div 
                                key={id} 
                                className={`text-[10px] font-black p-2 rounded-lg text-center transition-all border ${
                                  isTaken 
                                    ? 'bg-red-500/10 border-red-500/20 text-red-500/40 cursor-not-allowed' 
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white cursor-help'
                                }`}
                                title={isTaken ? `ID ${id} is Taken` : `ID ${id} is Available`}
                              >
                                {id}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      Membership Name
                    </label>
                    <div className="relative">
                      <input placeholder="e.g. Volt" value={partyName} onChange={e => setPartyName(e.target.value)}
                        className="w-full bg-slate-800 border-slate-700 text-white rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-indigo-500 outline-none border transition-all" />
                      {mode === 'login' && dbParties.length > 0 && !partyName && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 z-50 shadow-xl max-h-32 overflow-y-auto custom-scrollbar">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Registered Communities:</p>
                           <div className="flex flex-wrap gap-2">
                             {dbParties.map(p => (
                               <button key={p.id} type="button" onClick={() => setPartyName(p.name)} className="text-[10px] font-bold bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white px-2 py-1 rounded-md transition-colors">
                                 {p.name}
                               </button>
                             ))}
                           </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {mode === 'admin-signup' && (
                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Authoritative Timezone</label>
                      <div className="relative group">
                        <select 
                          value={timezone} 
                          onChange={e => setTimezone(e.target.value)}
                          className="w-full bg-slate-800 border-slate-700 text-white rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-indigo-500 outline-none border transition-all appearance-none cursor-pointer pr-12"
                        >
                          {ALL_TIMEZONES.map((tz: string) => (
                            <option key={tz} value={tz} className="bg-slate-900 text-white font-bold">{tz}</option>
                          ))}
                        </select>
                        <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Username</label>
                      <input required placeholder={mode === 'admin-signup' ? "Admin" : "Your name"} value={username} onChange={e => setUsername(e.target.value)}
                        className="w-full bg-slate-800 border-slate-700 text-white rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-indigo-500 outline-none border transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Password</label>
                      <input type="password" required placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-800 border-slate-700 text-white rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-indigo-500 outline-none border transition-all" />
                    </div>
                  </div>
                </div>
                
                {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-center leading-relaxed">{error}</p>}
                
                <button className={`w-full py-5 text-white font-black rounded-2xl transition-all shadow-xl uppercase tracking-widest ${mode === 'admin-signup' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}>
                  {mode === 'admin-signup' ? 'Establish Membership' : 'Verify & Enter'}
                </button>
                <button type="button" onClick={() => { setMode('land'); setError(''); }} className="w-full text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:text-white transition-colors">Abort Access</button>
              </form>
            )}

            {mode === 'success' && (
              <div className="bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/20">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white">Membership Active</h2>
                  <p className="text-slate-400 font-medium">Hub "{partyName}" is registered globally.</p>
                </div>
                
                <div className="p-6 bg-slate-800/50 rounded-[2rem] border border-slate-700 space-y-4">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Required Access Credentials</p>
                  <div className="flex flex-col gap-2 bg-slate-950 px-5 py-3 rounded-xl border border-indigo-500/10">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Membership:</span>
                      <span className="text-sm font-black text-indigo-400">{partyName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Timezone:</span>
                      <span className="text-sm font-black text-emerald-400">{timezone}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <button 
                    onClick={() => { setMode('login'); }}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 uppercase tracking-widest"
                  >
                    Proceed to Login
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gate;
