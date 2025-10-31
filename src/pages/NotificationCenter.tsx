import React, { useState } from 'react';
import { Bell, CheckCheck, Trash2, Filter } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { tr } from 'date-fns/locale';

const NotificationCenter: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAllRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'book' | 'penalty' | 'achievement' | 'system' | 'social' | 'admin'>('all');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const groupNotificationsByDate = () => {
    const groups: { [key: string]: typeof notifications } = {
      'Bugün': [],
      'Dün': [],
      'Bu Hafta': [],
      'Daha Eski': [],
    };

    filteredNotifications.forEach(notification => {
      const date = notification.createdAt.toDate();
      if (isToday(date)) {
        groups['Bugün'].push(notification);
      } else if (isYesterday(date)) {
        groups['Dün'].push(notification);
      } else if (isThisWeek(date)) {
        groups['Bu Hafta'].push(notification);
      } else {
        groups['Daha Eski'].push(notification);
      }
    });

    return groups;
  };

  const groupedNotifications = groupNotificationsByDate();

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'book': return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300';
      case 'penalty': return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300';
      case 'achievement': return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300';
      case 'social': return 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300';
      case 'admin': return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bildirim Merkezi</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  Tümünü Oku
                </button>
              )}
              {notifications.some(n => n.isRead) && (
                <button
                  onClick={deleteAllRead}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Okunanları Sil
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500" />
            {[
              { value: 'all', label: 'Tümü' },
              { value: 'unread', label: 'Okunmamış' },
              { value: 'book', label: '📚 Kitaplar' },
              { value: 'penalty', label: '⚠️ Cezalar' },
              { value: 'achievement', label: '🎉 Başarılar' },
              { value: 'social', label: '💬 Sosyal' },
              { value: 'admin', label: '🔧 Sistem' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as any)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all' ? 'Henüz bildiriminiz yok' : 'Bu filtrede bildirim bulunamadı'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([group, notifs]) => {
              if (notifs.length === 0) return null;
              return (
                <div key={group}>
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-2">
                    {group}
                  </h2>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md divide-y divide-gray-200 dark:divide-gray-700">
                    {notifs.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${getNotificationColor(notification.type)}`}>
                            {notification.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            {notification.actionUrl ? (
                              <Link
                                to={notification.actionUrl}
                                onClick={() => handleNotificationClick(notification)}
                                className="block"
                              >
                                <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: tr })}
                                  {' • '}
                                  {format(notification.createdAt.toDate(), 'dd MMMM yyyy, HH:mm', { locale: tr })}
                                </p>
                              </Link>
                            ) : (
                              <div onClick={() => handleNotificationClick(notification)}>
                                <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: tr })}
                                  {' • '}
                                  {format(notification.createdAt.toDate(), 'dd MMMM yyyy, HH:mm', { locale: tr })}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Okundu olarak işaretle"
                              >
                                <CheckCheck className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Sil"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
