
import React, { useMemo } from 'react';
import { useApp } from '../App';
import { UserRole } from '../types';

const LeaderboardTable: React.FC = () => {
  const { cards, follows, theme, currentUser } = useApp();
  const isDark = theme === 'dark';

  const { displayStats, myStats, myRank } = useMemo(() => {
    const statsMap = new Map<string, { userId: string, name: string, engagement: number, followsReceived: number, followsGiven: number, role: UserRole }>();

    // Calculate stats for EVERYONE who has a card
    cards.forEach(card => {
      if (!statsMap.has(card.user_id)) {
        statsMap.set(card.user_id, { 
          userId: card.user_id, 
          name: card.display_name, 
          engagement: 0, 
          followsReceived: 0, 
          followsGiven: 0,
          role: card.creator_role
        });
      }
    });

    follows.forEach(follow => {
      // Follow Given
      const giver = statsMap.get(follow.follower_id);
      if (giver) {
        giver.followsGiven++;
        giver.engagement++;
      }

      // Follow Received
      const targetCard = cards.find(c => c.id === follow.target_card_id);
      if (targetCard) {
        const receiver = statsMap.get(targetCard.user_id);
        if (receiver) {
          receiver.followsReceived++;
          receiver.engagement++;
        }
      }
    });

    // Full global ranking (everyone included for rank calculation)
    const allSorted = Array.from(statsMap.values())
      .sort((a, b) => b.engagement - a.engagement);

    // Find current user's global rank and stats
    const myRankIdx = allSorted.findIndex(s => s.userId === currentUser?.id);
    const myStats = currentUser ? statsMap.get(currentUser.id) : null;

    // Filtered list for the table (Regular Users only, as per previous requirement)
    const displayStats = allSorted.filter(stat => stat.role === UserRole.REGULAR);

    return { 
      displayStats, 
      myStats, 
      myRank: myRankIdx !== -1 ? myRankIdx + 1 : null 
    };
  }, [cards, follows, currentUser]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* PERSONAL RANKING SUMMARY */}
      {myStats && (
        <div className={`p-6 lg:p-8 rounded-[2.5rem] border-2 shadow-2xl relative overflow-hidden transition-all ${isDark ? 'bg-slate-900/50 border-indigo-500/30' : 'bg-white border-indigo-100'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-10 relative z-10">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Global Rank</span>
              <div className={`text-5xl lg:text-6xl font-black tracking-tighter ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                #{myRank || '--'}
              </div>
            </div>
            
            <div className="h-px w-full md:h-16 md:w-px bg-slate-200 dark:bg-slate-800" />
            
            <div className="flex-1 text-center md:text-left space-y-1">
              <h4 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {myStats.name} <span className="text-slate-500 text-xs font-bold uppercase ml-2 opacity-50">(You)</span>
              </h4>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                Current Performance Data
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 lg:gap-8">
              <div className="text-center">
                <p className="text-xl font-black text-indigo-500">{myStats.engagement}</p>
                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Total</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-emerald-500">{myStats.followsReceived}</p>
                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Inbound</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-indigo-400">{myStats.followsGiven}</p>
                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Outbound</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TABLE */}
      <div className={`rounded-[2.5rem] border overflow-hidden shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="p-6 lg:p-8 border-b border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div>
              <h3 className={`text-xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Member Standings</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Live competitive ranking of POD members</p>
           </div>
           <div className="bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
             Top Performers
           </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`text-[10px] font-black uppercase tracking-widest border-b ${isDark ? 'bg-slate-950 text-slate-500 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
              <tr>
                <th className="p-6">Rank</th>
                <th className="p-6">Member</th>
                <th className="p-6">Engagement</th>
                <th className="p-6">Inbound</th>
                <th className="p-6">Outbound</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
              {displayStats.length > 0 ? displayStats.map((stat, index) => {
                const isMe = stat.userId === currentUser?.id;
                return (
                  <tr key={stat.userId} className={`group transition-all ${isMe ? 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/20' : 'hover:bg-indigo-500/5'}`}>
                    <td className="p-6">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                        index === 0 ? 'bg-amber-500 text-white' : 
                        index === 1 ? 'bg-slate-300 text-slate-900' : 
                        index === 2 ? 'bg-orange-400 text-white' : 
                        isMe ? 'bg-indigo-600 text-white' :
                        isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.name}</div>
                        {isMe && <span className="bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">You</span>}
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500">
                          MEMBER
                        </span>
                      </div>
                    </td>
                    <td className="p-6 font-black text-indigo-500 text-lg">{stat.engagement}</td>
                    <td className="p-6">
                       <div className="flex items-center gap-2">
                         <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                         <span className="font-bold text-slate-500">{stat.followsReceived}</span>
                       </div>
                    </td>
                    <td className="p-6">
                       <div className="flex items-center gap-2">
                         <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                         <span className="font-bold text-slate-500">{stat.followsGiven}</span>
                       </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                    No engagement data recorded in this cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardTable;
