export interface Rating {
  userId: string;
  rating: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  location: string;
  status: 'available' | 'borrowed' | 'lost';
  coverImage: string;
  tags: string[];
  addedDate: string;
  ratings?: Rating[];
  backCover?: string;
  pageCount?: number;
  dimensions?: string;
  weight?: string;
  binding?: string;
  theme?: string[];
  mood?: string;
}

export interface Event {
  id: string;
  coverImage: string;
  name: string;
  date: string;
  location: string;
  description: string;
  participants: string[]; // Array of user IDs
  type: 'event';
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  surveyUrl: string;
  status: 'active' | 'completed';
  type: 'survey';
  coverImage?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  type: 'announcement';
  coverImage?: string;
}