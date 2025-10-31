import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, Trash2, Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const recentNotifications = notifications.slice(0, 5);

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
    if (notification.actionUrl) {
      onClose();
    }
  };

  return (
    <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-auto sm:mt-2 w-auto sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] sm:max-h-[600px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          Bildirimler
          {unreadCount > 0 && (
            <span className="ml-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              ({unreadCount} okunmamış)
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 touch-manipulation"
          >
            <CheckCheck className="w-4 h-4" />
            Tümünü Oku
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1">
        {recentNotifications.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
            <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">Henüz bildiriminiz yok</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation ${
                  !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${getNotificationColor(notification.type)}`}>
                    {notification.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    {notification.actionUrl ? (
                      <Link
                        to={notification.actionUrl}
                        onClick={() => handleNotificationClick(notification)}
                        className="block"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: tr })}
                        </p>
                      </Link>
                    ) : (
                      <div onClick={() => handleNotificationClick(notification)}>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: tr })}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <Link
            to="/notifications"
            onClick={onClose}
            className="block text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Tümünü Gör
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
