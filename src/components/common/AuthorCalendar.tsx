
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import tr from 'date-fns/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuthors } from '../../contexts/AuthorContext';
import { Author } from '../../types';
import AuthorAnniversaryModal from './AuthorAnniversaryModal';
import { useNavigate } from 'react-router-dom';
import AuthorCalendarToolbar from './AuthorCalendarToolbar';
import AuthorEvent from './AuthorEvent';

// Setup the localizer
const locales = { 'tr': tr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Define the structure for our calendar events
export interface AuthorEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    type: 'birth' | 'death';
    authorName: string;
    authorId: string;
    anniversary?: number;
  };
}

const AuthorCalendar = () => {
  const { authors } = useAuthors();
  const navigate = useNavigate();
  const [events, setEvents] = useState<AuthorEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<AuthorEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (authors.length > 0) {
      const generatedEvents: AuthorEvent[] = [];
      const currentCalYear = currentDate.getFullYear();
      // Generate events for a 3-year window for smooth navigation
      const yearsToGenerate = [currentCalYear - 1, currentCalYear, currentCalYear + 1];

      authors.forEach((author: Author) => {
        yearsToGenerate.forEach(y => {
          // Handle Birth Date (string)
          if (author.birthDate && typeof author.birthDate === 'string') {
            const parts = author.birthDate.split('-').map(Number); // e.g., "1890-09-15" -> [1890, 9, 15]
            if (parts.length === 3) {
              const [birthYear, birthMonth, birthDay] = parts;
              const anniversary = y - birthYear;
              if (anniversary >= 0) {
                // Create date as local time to avoid timezone shifts by providing parts separately
                const eventDate = new Date(y, birthMonth - 1, birthDay);
                generatedEvents.push({
                  title: author.name,
                  start: eventDate,
                  end: eventDate,
                  allDay: true,
                  resource: { type: 'birth', authorName: author.name, authorId: author.id, anniversary },
                });
              }
            }
          }

          // Handle Death Date (string)
          if (author.deathDate && typeof author.deathDate === 'string') {
            const parts = author.deathDate.split('-').map(Number);
            if (parts.length === 3) {
              const [deathYear, deathMonth, deathDay] = parts;
              const anniversary = y - deathYear;
              if (anniversary >= 0) {
                const eventDate = new Date(y, deathMonth - 1, deathDay);
                generatedEvents.push({
                  title: author.name,
                  start: eventDate,
                  end: eventDate,
                  allDay: true,
                  resource: { type: 'death', authorName: author.name, authorId: author.id, anniversary },
                });
              }
            }
          }
        });
      });
      setEvents(generatedEvents);
    }
  }, [authors, currentDate]);


  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleSelectEvent = (event: AuthorEvent) => {
    navigate(`/author/${event.resource.authorId}`);
  };

  const handleSelectSlot = useCallback((slotInfo: { start: Date }) => {
    const clickedDate = slotInfo.start;
    const eventsOnDate = events.filter(event => 
        event.start.getDate() === clickedDate.getDate() &&
        event.start.getMonth() === clickedDate.getMonth() &&
        event.start.getFullYear() === clickedDate.getFullYear()
    );

    if (eventsOnDate.length > 0) {
      setSelectedDate(clickedDate);
      setSelectedEvents(eventsOnDate);
      setIsModalOpen(true);
    }
  }, [events]);

  const dayPropGetter = useCallback((date: Date) => {
    const eventsOnDate = events.filter(event =>
      event.start.getDate() === date.getDate() &&
      event.start.getMonth() === date.getMonth() &&
      event.start.getFullYear() === date.getFullYear()
    );

    let className = '';
    if (eventsOnDate.length > 0) {
      const hasDeath = eventsOnDate.some(e => e.resource.type === 'death');
      const hasBirth = eventsOnDate.some(e => e.resource.type === 'birth');
      
      if (hasDeath) {
        className = 'bg-red-50';
      } else if (hasBirth) {
        className = 'bg-green-50';
      }
    }
    
    return { className };
  }, [events]);

  const eventStyleGetter = (event: AuthorEvent) => {
    const isMajorAnniversary = event.resource.anniversary !== undefined && [25, 50, 75, 100, 125, 150, 175, 200].includes(event.resource.anniversary);
    const backgroundColor = event.resource.type === 'birth' ? '#28a745' : '#dc3545';
    
    const style = {
      backgroundColor,
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: isMajorAnniversary ? '2px solid #ffc107' : '0px',
      boxShadow: isMajorAnniversary ? '0 0 5px #ffc107' : 'none',
      display: 'block'
    };
    return { style };
  };

  return (
    <>
      <AuthorAnniversaryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        events={selectedEvents}
        selectedDate={selectedDate}
      />
      <div className="p-4 bg-white rounded-lg shadow-md border" style={{ height: 700 }}>
        <Calendar
          culture="tr"
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          dayPropGetter={dayPropGetter}
          onSelectSlot={handleSelectSlot}
          onNavigate={handleNavigate}
          onSelectEvent={handleSelectEvent}
          date={currentDate}
          selectable
          views={[Views.MONTH]}
          defaultView={Views.MONTH}
          components={{
            toolbar: AuthorCalendarToolbar,
            event: AuthorEvent,
          }}
          messages={{
              next: "İleri",
              previous: "Geri",
              today: "Bugün",
              month: "Ay",
              week: "Hafta",
              day: "Gün",
              agenda: "Ajanda",
              date: "Tarih",
              time: "Saat",
              event: "Olay",
              noEventsInRange: "Bu aralıkta gösterilecek bir olay yok.",
              showMore: total => `+${total} daha göster`
          }}
        />
      </div>
    </>
  );
};

export default AuthorCalendar;
