import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, ShieldAlert, Info } from 'lucide-react';
import { useAuth } from '../App';
import { backend } from '../services/mockBackend';
import { Notification, UserRole } from '../types';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const previousIdsRef = useRef<Set<string>>(new Set());

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await backend.fetchUserNotifications(user.id, user.role);
      
      // Check for new notifications to show toasts
      if (previousIdsRef.current.size > 0) {
        const newNotifications = data.filter(n => !previousIdsRef.current.has(n.id) && !n.isRead);
        
        if (newNotifications.length > 0 && !isOpen) {
           toast.dismiss(); // Clear old toasts to not clutter
           newNotifications.slice(0, 3).forEach(n => {
             toast((t) => (
               <div 
                 className="flex flex-col gap-1 cursor-pointer w-full" 
                 onClick={() => { setIsOpen(true); toast.dismiss(t.id); }}
               >
                 <div className="font-bold text-sm flex items-center gap-2">
                   <Bell size={14} className="text-primary-500" /> 
                   {n.title}
                 </div>
                 <p className="text-xs text-gray-200 line-clamp-1 pr-6">{n.message}</p>
               </div>
             ), { 
               duration: 6000, 
               id: `notif_${n.id}`,
               position: 'top-center'
             });
           });
        }
      }

      previousIdsRef.current = new Set(data.map(n => n.id));
      setNotifications(data);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;
    await backend.markNotificationRead(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleApproveReset = async (notifItem: Notification) => {
    if (!notifItem.actionData?.requesterId) return;
    await backend.approvePasswordReset(notifItem.id, notifItem.actionData.requesterId);
    // Optimistic UI updates
    setNotifications(notifications.map(n => n.id === notifItem.id ? { 
      ...n, 
      isRead: true, 
      actionData: { ...n.actionData, status: 'approved' } 
    } : n));
  };

  const handleRejectReset = async (notifItem: Notification) => {
    if (!notifItem.actionData?.requesterId) return;
    await backend.rejectPasswordReset(notifItem.id, notifItem.actionData.requesterId);
    setNotifications(notifications.map(n => n.id === notifItem.id ? { 
      ...n, 
      isRead: true, 
      actionData: { ...n.actionData, status: 'rejected' } 
    } : n));
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            toast.dismiss();
            fetchNotifications();
          }
        }}
        className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 transition"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
           <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
           </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              الإشعارات
            </h3>
            {unreadCount > 0 && (
              <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 text-xs px-2 py-1 rounded-md font-bold">
                {unreadCount} جديد
              </span>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-gray-400">
                <Bell size={32} className="opacity-20 mb-3" />
                <p className="text-sm">لا توجد إشعارات حالياً</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800/50">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={`p-4 transition-colors ${!n.isRead ? 'bg-primary-50/30 dark:bg-primary-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                    onClick={() => handleMarkRead(n.id, n.isRead)}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-1">
                        {n.type === 'password_reset' ? (
                          <div className={`p-2 rounded-full ${n.isRead ? 'bg-gray-200 text-gray-500' : 'bg-red-100 text-red-600'}`}>
                             <ShieldAlert size={16} />
                          </div>
                        ) : (
                          <div className={`p-2 rounded-full ${n.isRead ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                             <Info size={16} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                           <h4 className={`text-sm truncate ${!n.isRead ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
                             {n.title}
                           </h4>
                           <span className="text-[10px] text-gray-400 whitespace-nowrap mr-2">
                              {new Date(n.createdAt).toLocaleDateString()}
                           </span>
                        </div>
                        <p className={`text-xs ${!n.isRead ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'} line-clamp-2`}>
                          {n.message}
                        </p>
                        
                        {/* Dynamic Actions for Password Reset */}
                        {n.type === 'password_reset' && n.actionData?.status === 'pending' && user.role === UserRole.ADMIN && (
                          <div className="mt-3 flex gap-2">
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleApproveReset(n); }}
                               className="flex-1 flex justify-center items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold py-1.5 px-2 rounded-lg transition"
                             >
                                <Check size={14} /> موافقة
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleRejectReset(n); }}
                               className="flex-1 flex justify-center items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-1.5 px-2 rounded-lg transition"
                             >
                                <X size={14} /> رفض
                             </button>
                          </div>
                        )}
                        {n.type === 'password_reset' && n.actionData?.status && n.actionData.status !== 'pending' && (
                           <div className="mt-2 text-xs font-bold">
                             {n.actionData.status === 'approved' ? (
                               <span className="text-green-600 flex items-center gap-1"><Check size={12}/> تمت الموافقة</span>
                             ) : (
                               <span className="text-red-500 flex items-center gap-1"><X size={12}/> تم الرفض</span>
                             )}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-center">
             <button 
               className="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline"
               onClick={() => {
                 notifications.filter(n => !n.isRead).forEach(n => handleMarkRead(n.id, false));
               }}
             >
               تحديد الكل كمقروء
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
