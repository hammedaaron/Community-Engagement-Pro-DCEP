
import React, { useMemo } from 'react';
import { useApp } from '../App';
import { NotificationType, AppNotification } from '../types';

interface NotificationPanelProps {
  onClose?: () => void;
}

interface AggregatedNotification extends AppNotification {
  count: number;
  allIds: string[];
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { currentUser, notifications, setSelectedFolderId, cards, theme } = useApp();

  const aggregatedNotifications = useMemo(() => {
    const groups = new Map<string, AggregatedNotification>();
    const sortedRaw = [...notifications]
      .filter(n => n.recipient_id === currentUser?.id)
      .sort((a, b) => b.timestamp - a.timestamp);

    sortedRaw.forEach(n => {
      const key = `${n.sender_id}_${n.type}`;
      if (!groups.has(key)) {
        groups.set(key, { ...n, count: 1, allIds: [n.id] });
      } else {
        const existing = groups.get(key)!;
        existing.count++;
        existing.allIds.push(n.id);
        if (!n.read) existing.read = false;
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.timestamp - a.timestamp;
    });
  }, [notifications, currentUser?.id]);

  const unreadCount = aggregatedNotifications.filter(n => !n.read).length;
  const isDark = theme === 'dark';

  const handleNotificationClick = async (notif: AggregatedNotification) => {
    const targetCard = cards.find(c => c.id === notif.related_card_id);
    if (targetCard) {
      if (onClose) onClose();
      setSelectedFolderId(targetCard.folder_id);
      let attempts = 0;
      const findAndHighlight = () => {
        const el = document.getElementById(`card-${targetCard.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const highlightClasses = ['ring-8', 'ring-emerald-500/50', 'ring-offset-4', 'scale-105', 'z-50', 'transition-all', 'duration-700', 'shadow-2xl'];
          el.classList.add(...highlightClasses);
          setTimeout(() => el.classList.remove(...highlightClasses), 3500);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(findAndHighlight, 100);
        }
      };
      setTimeout(findAndHighlight, 150);
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <h2 className={`font-black text-xl flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Activity Hub
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
              {unreadCount} NEW
            </span>
          )}
        </h2>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {aggregatedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-relaxed">No activity yet.</p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {aggregatedNotifications.map(notif => (
              <div
                key={`${notif.sender_id}_${notif.type}`}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full p-6 cursor-pointer transition-all flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${notif.read ? 'opacity-60' : 'bg-indigo-500/5'}`}
              >
                <div className="shrink-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm ${notif.type === NotificationType.FOLLOW_BACK ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                    {notif.type === NotificationType.FOLLOW_BACK ? '🤝' : '👋'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="font-black">{notif.sender_name}</span> 
                    {notif.count > 1 ? ` followed you in ${notif.count} communities.` : " just followed you."}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-black text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Trace to Connect</span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">• {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
