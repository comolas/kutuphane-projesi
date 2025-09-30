
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ToolbarProps } from 'react-big-calendar';

const AuthorCalendarToolbar: React.FC<ToolbarProps> = ({ label, onNavigate }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-t rounded-t-lg">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => onNavigate('TODAY')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Bugün
        </button>
      </div>
      <div className="text-xl font-semibold text-gray-800">
        {label}
      </div>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => onNavigate('PREV')}
          className="p-2 text-gray-600 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Önceki Ay"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('NEXT')}
          className="p-2 text-gray-600 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Sonraki Ay"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AuthorCalendarToolbar;
