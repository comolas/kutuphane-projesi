import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthors } from '../../contexts/AuthorContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Cake, Cross, X } from 'lucide-react';

interface TimelineEvent {
  date: Date;
  day: number;
  authorName: string;
  authorId: string;
  authorImage: string;
  type: 'birth' | 'death';
  anniversary: number;
  year: number;
}

const AuthorTimeline: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { authors } = useAuthors();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    const monthEvents: TimelineEvent[] = [];
    const currentYear = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    authors.forEach(author => {
      // Birth events
      if (author.birthDate && typeof author.birthDate === 'string') {
        const [birthYear, birthMonth, birthDay] = author.birthDate.split('-').map(Number);
        if (birthMonth - 1 === month) {
          monthEvents.push({
            date: new Date(currentYear, month, birthDay),
            day: birthDay,
            authorName: author.name,
            authorId: author.id,
            authorImage: author.image,
            type: 'birth',
            anniversary: currentYear - birthYear,
            year: birthYear
          });
        }
      }

      // Death events
      if (author.deathDate && typeof author.deathDate === 'string') {
        const [deathYear, deathMonth, deathDay] = author.deathDate.split('-').map(Number);
        if (deathMonth - 1 === month) {
          monthEvents.push({
            date: new Date(currentYear, month, deathDay),
            day: deathDay,
            authorName: author.name,
            authorId: author.id,
            authorImage: author.image,
            type: 'death',
            anniversary: currentYear - deathYear,
            year: deathYear
          });
        }
      }
    });

    setEvents(monthEvents.sort((a, b) => a.day - b.day));
  }, [authors, currentMonth]);

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthName = currentMonth.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl shadow-xl p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          📅 {t('authors.calendar')}
        </h2>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => changeMonth('prev')}
            className="p-2 bg-white rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          </button>
          <span className="text-base sm:text-lg font-semibold text-gray-700 min-w-[160px] sm:min-w-[200px] text-center capitalize">
            {monthName}
          </span>
          <button
            onClick={() => changeMonth('next')}
            className="p-2 bg-white rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all touch-manipulation"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('authors.total')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{events.length}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('authors.birth')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{events.filter(e => e.type === 'birth').length}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('authors.death')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600">{events.filter(e => e.type === 'death').length}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-full -translate-y-1/2 z-0"></div>

        {/* Days Container */}
        <div className="relative overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-transparent touch-pan-x">
          <div className="flex gap-2 sm:gap-4 min-w-max px-2 sm:px-4 py-6 sm:py-8">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dayEvents = events.filter(e => e.day === day);
              const hasBirth = dayEvents.some(e => e.type === 'birth');
              const hasDeath = dayEvents.some(e => e.type === 'death');

              return (
                <div key={day} className="flex flex-col items-center gap-2 relative">
                  {/* Day Number */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm z-10 transition-all ${
                    dayEvents.length > 0
                      ? 'bg-white shadow-lg scale-110'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {day}
                  </div>

                  {/* Events */}
                  {dayEvents.length > 0 && (
                    <div className="flex flex-col gap-1 sm:gap-2 mt-2">
                      {dayEvents.map((event, idx) => (
                        <div
                          key={idx}
                          className="relative group"
                          onMouseEnter={() => setHoveredEvent(event)}
                          onMouseLeave={() => setHoveredEvent(null)}
                          onTouchStart={() => setHoveredEvent(event)}
                        >
                          <button
                            onClick={() => navigate(`/author/${event.authorId}`)}
                            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 overflow-hidden transition-all duration-300 active:scale-95 sm:hover:scale-125 hover:shadow-2xl touch-manipulation ${
                              event.type === 'birth'
                                ? 'border-green-400 hover:border-green-500'
                                : 'border-red-400 hover:border-red-500'
                            }`}
                          >
                            <img
                              src={event.authorImage}
                              alt={event.authorName}
                              className="w-full h-full object-cover"
                            />
                          </button>

                          {/* Hover Card */}
                          {hoveredEvent?.authorId === event.authorId && hoveredEvent?.day === event.day && (
                            <div className="fixed sm:absolute bottom-4 left-4 right-4 sm:bottom-full sm:left-1/2 sm:-translate-x-1/2 sm:mb-2 w-auto sm:w-64 bg-white rounded-xl shadow-2xl p-4 z-50 animate-fadeIn">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHoveredEvent(null);
                                }}
                                className="absolute top-2 right-2 sm:hidden p-1 bg-gray-100 rounded-full"
                              >
                                <X className="w-4 h-4 text-gray-600" />
                              </button>
                              <div className="flex items-start gap-3">
                                <img
                                  src={event.authorImage}
                                  alt={event.authorName}
                                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                  <h3 className="font-bold text-gray-900 mb-1 text-sm sm:text-base">{event.authorName}</h3>
                                  <div className={`flex items-center gap-1 text-xs sm:text-sm ${
                                    event.type === 'birth' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {event.type === 'birth' ? <Cake className="w-3 h-3 sm:w-4 sm:h-4" /> : <Cross className="w-3 h-3 sm:w-4 sm:h-4" />}
                                    <span>{event.type === 'birth' ? t('authors.birth') : t('authors.death')}</span>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {t('authors.year', { year: event.year, anniversary: event.anniversary })}
                                  </p>
                                  {[25, 50, 75, 100, 125, 150].includes(event.anniversary) && (
                                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                                      ⭐ {t('authors.important')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Arrow - Desktop only */}
                              <div className="hidden sm:block absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-400"></div>
          <span className="text-xs sm:text-sm text-gray-600">{t('authors.birth')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-400"></div>
          <span className="text-xs sm:text-sm text-gray-600">{t('authors.death')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-500 text-sm sm:text-base">⭐</span>
          <span className="text-xs sm:text-sm text-gray-600">{t('authors.important')}</span>
        </div>
      </div>
    </div>
  );
};

export default AuthorTimeline;
