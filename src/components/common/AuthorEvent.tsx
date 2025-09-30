
import React from 'react';
import { Gift } from 'lucide-react';
import { EventProps } from 'react-big-calendar';
import { AuthorEvent as CustomAuthorEvent } from './AuthorCalendar'; // Renaming to avoid conflict

// A simple component to represent a person who died
const SkullIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-skull mr-1">
        <path d="M8 18V15a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v3"/>
        <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
        <path d="M12 12a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6Z"/>
        <path d="M4.5 8.5a2 2 0 1 0 0-3 2 2 0 0 0 0 3Z"/>
        <path d="M19.5 8.5a2 2 0 1 0 0-3 2 2 0 0 0 0 3Z"/>
    </svg>
);


const AuthorEvent: React.FC<EventProps<CustomAuthorEvent>> = ({ event }) => {
  const { type, authorName } = event.resource;

  const isBirth = type === 'birth';

  // We get the title from the event itself, which is pre-formatted
  const title = event.title;

  return (
    <div className="flex items-center text-xs">
      {isBirth ? <Gift size={14} className="mr-1" /> : <SkullIcon />}
      <span>{authorName}</span>
    </div>
  );
};

export default AuthorEvent;
