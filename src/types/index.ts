export interface Book {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  location: string;
  status: 'available' | 'borrowed' | 'lost';
  coverImage: string;
  tags: string[];
  addedDate: string;
  backCover?: string;
  pageCount?: number;
  dimensions?: string;
  weight?: string;
  binding?: string;
  theme?: string[];
  mood?: string;
  averageRating?: number;
  reviewCount?: number;
}

export interface Author {
  id: string;
  name: string;
  image: string;
  biography: string;
  tags: string[];
  featured: boolean;
  monthlyFeaturedDate?: Date;
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

export interface Review {
  id:string;
  bookId?: string;
  magazineId?: string;
  userId: string;
  userDisplayName: string;
  rating: number;
  reviewText: string;
  createdAt: any; // Firestore Timestamp
  status: 'pending' | 'approved' | 'rejected';
  helpfulVotes?: string[];
}

export interface Magazine {
  id: string;
  title: string;
  issue: string;
  publicationDate: any; // Firestore Timestamp
  coverImageUrl: string;
  pdfUrl: string;
  addedAt: any; // Firestore Timestamp
  averageRating?: number;
  reviewCount?: number;
  tags?: string[];
}
