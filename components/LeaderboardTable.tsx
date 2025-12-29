
import React, { useMemo } from 'react';
import { useApp } from '../App';
import { UserRole } from '../types';

const LeaderboardTable: React.FC = () => {
  const { cards, follows, theme } = useApp();
  const isDark = theme === 'dark';

  const userStats = useMemo(() => {
    const statsMap = new Map<string, { userId: string, name: string, engagement: number, followsReceived: number, followsGiven: number, role: UserRole }>();

    // Calculate Engagement per User
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

    return Array.from(statsMap.values()).sort((a, b) => b.engagement - a.engagement);
  }, [cards, follows]);

  return (
    <div className={`rounded-[2.5rem] border overflow-hidden shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
      <div className="p-8 border-b border-slate-800/50 flex items-center justify-between">
         <div>
            <h3 className={`text-xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Engagement Leaderboard</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Ranking of Community Activity</p>
         </div>
         <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
           Live Feed
         </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead className={`text-[10px] font-black uppercase tracking-widest border-b ${isDark ? 'bg-slate-950 text-slate-500 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
            <tr>
              <th className="p-6">Rank</th>
              <th className="p-6">Member</th>
              <th className="p-6">Engagement Score</th>
              <th className="p-6">Inbound</th>
              <th className="p-6">Outbound</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
            {userStats.length > 0 ? userStats.map((stat, index) => (
              <tr key={stat.userId} className="group hover:bg-indigo-500/5 transition-all">
                <td className="p-6">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                    index === 0 ? 'bg-amber-500 text-white' : 
                    index === 1 ? 'bg-slate-300 text-slate-900' : 
                    index === 2 ? 'bg-orange-400 text-white' : 
                    isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="p-6">
                  <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.name}</div>
                  <div className="flex gap-1.5 mt-1">
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                      stat.role === UserRole.DEV ? 'bg-emerald-500/20 text-emerald-400' :
                      stat.role === UserRole.ADMIN ? 'bg-orange-500/20 text-orange-400' :
                      'bg-indigo-500/20 text-indigo-400'
                    }`}>
                      {stat.role}
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
            )) : (
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
  );
};

export default LeaderboardTable;
