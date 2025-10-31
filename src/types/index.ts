import { Timestamp } from "firebase/firestore";

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
  birthDate?: string;
  deathDate?: string;
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

export interface StoryCollectionBook {
  bookId: string;
  blurb: string;
}

export interface StoryCollection {
  id?: string;
  title: string;
  coverImage: string;
  order: number;
  isActive: boolean;
  books: StoryCollectionBook[];
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: any; // Firestore Timestamp
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  relatedFineId?: string; // To link with a specific fine
}

export interface BudgetSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalBudget: number;
  remainingBudget: number;
}

export interface UserData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  studentClass?: string; // Assuming studentClass is an optional string
  role: 'student' | 'teacher' | 'admin';
  createdAt: any; // Firestore Timestamp
  // Add other user-related fields as needed
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  coverImageURL: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  tags: string[];
  sources?: string | string[]; // Can be string (HTML) or array (legacy)
  areCommentsEnabled: boolean;
  likes: string[]; // Array of user IDs
  commentCount?: number;
}

export interface Comment {
  id: string;
  postId: string; // Add postId to link comment to its post
  text: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  createdAt: any; // Firestore Timestamp
  status: 'visible' | 'reported' | 'hidden';
}

export interface AppliedDiscount {
  couponId: string;
  discountPercent: number;
  discountAmount: number;
  appliedBy: string;
  appliedAt: any; // Firestore Timestamp
}

export interface Penalty {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  bookCategory: string;
  daysLate: number;
  originalAmount: number;
  isPaid: boolean;
  paidAt?: any; // Firestore Timestamp
  paidAmount?: number;
  appliedDiscount?: AppliedDiscount;
  receiptNumber?: string;
  paymentMethod?: 'cash' | 'card' | 'other';
  collectedBy?: string;
  createdAt: any; // Firestore Timestamp
}

export interface Borrow {
  bookId: string;
  userId: string;
  borrowedAt: Timestamp;
  dueDate: Timestamp;
  returnedAt?: Timestamp;
  fineStatus?: 'paid' | 'unpaid';
  paymentDate?: Timestamp;
  fineAmount?: number;
  returnStatus: 'borrowed' | 'returned';
}

export interface BorrowedBook extends Book {
    borrowedAt: Timestamp;
    dueDate: Timestamp;
    returnedAt?: Timestamp;
    fineStatus?: 'paid' | 'unpaid';
    paymentDate?: Timestamp;
    fineAmount?: number;
    returnStatus: 'borrowed' | 'returned';
    userId: string;
}


export interface Product {
  id: string;
  name: string;
  category: 'aksesuar' | 'kiyafet' | 'kirtasiye';
  price: number;
  stock: number;
  image: string; // Ana görsel (geriye dönük uyumluluk için)
  images?: string[]; // Çoklu görseller
  description: string;
  createdAt: any;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentMethod: 'eft' | 'havale' | 'iyzico' | 'cash';
  paymentStatus: 'waiting' | 'paid';
  createdAt: any;
  notes?: string;
  paymentProof?: string;
  couponId?: string;
  discountAmount?: number;
}

export interface LibraryCard {
  userId: string;
  qrCode: string;
  generatedAt: any;
  cardDelivered?: boolean;
  deliveredAt?: any;
}

export interface AllowedUser {
  id?: string;
  firstName: string;
  lastName: string;
  studentClass: string;
  studentNumber: string;
  campusName: string;
  campusId: string;
  addedAt?: any;
}

export type ChallengeType = 'book-count' | 'category-books' | 'page-count' | 'reviews' | 'blog-posts';
export type ChallengeDuration = 'week' | '2weeks' | 'month';
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'rejected';

export interface Challenge {
  id?: string;
  creatorId: string;
  creatorName: string;
  opponentId: string;
  opponentName: string;
  type: ChallengeType;
  category?: string;
  duration: ChallengeDuration;
  startDate: any;
  endDate: any;
  status: ChallengeStatus;
  creatorScore: number;
  opponentScore: number;
  winnerId?: string;
  campusId: string;
  studentClass: string;
  createdAt: any;
}

export type RewardCategory = 'experience' | 'gift-card' | 'food' | 'item';

export interface PhysicalReward {
  id?: string;
  name: string;
  category: RewardCategory;
  description: string;
  image: string;
  requiredCoupons: number;
  stock: number;
  campusId: string;
  isActive: boolean;
  lowStockThreshold?: number;
  createdAt: any;
}

export interface RewardCoupon {
  id?: string;
  userId: string;
  challengeId: string;
  earnedAt: any;
  isUsed: boolean;
  usedAt?: any;
  usedForRewardId?: string;
}

export type RewardClaimStatus = 'pending' | 'approved' | 'delivered' | 'rejected';

export interface RewardClaim {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userClass: string;
  rewardId: string;
  rewardName: string;
  couponsUsed: number;
  claimedAt: any;
  status: RewardClaimStatus;
  campusId: string;
  approvedBy?: string;
  approvedAt?: any;
  deliveredAt?: any;
  rejectedReason?: string;
  notes?: string;
}
