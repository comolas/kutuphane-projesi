import SurveyFormModal from '../components/admin/SurveyFormModal';
import ParticipantsModal from '../components/admin/ParticipantsModal';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import AnnouncementModal from '../components/admin/AnnouncementModal';
import LendBookModal from '../components/admin/LendBookModal';
import EditUserModal from '../components/admin/EditUserModal';
import EditBookModal from '../components/admin/EditBookModal';
import RequestsTab from '../components/admin/RequestsTab';
import { RequestProvider } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { useBooks } from '../contexts/BookContext';
import { Navigate } from 'react-router-dom';
import { Book, Users, Library, LogOut, Search, Menu, X, MessageSquare, Send, DollarSign, Mail, Calendar, FileText, PieChart, BarChart, TrendingUp, ChevronUp, Filter, SortAsc, SortDesc, UserX, UserCheck, AlertTriangle, BookOpen, Plus, Bell, Download, Edit, Trash2, PiggyBank } from 'lucide-react';
import { auth, db } from '../firebase/config';
import { Event, useEvents } from '../contexts/EventContext';
import { Bar, Pie } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, writeBatch, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';


ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Request {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: Date;
  userId: string;
  response?: string;
  responseDate?: Date;
  userData?: {
    displayName: string;
    studentClass: string;
    studentNumber: string;
  };
}

interface BorrowedBook {
  id: string;
  title: string;
  borrowedBy: string;
  borrowedAt: Date;
  dueDate: Date;
  fineStatus?: 'paid' | 'unpaid';
  fineAmount?: number;
  returnStatus?: 'returned' | 'borrowed';
  userData?: {
    displayName: string;
    studentClass: string;
    studentNumber: string;
  };
}

interface ReturnMessage {
  id: string;
  userId: string;
  bookId: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  userData: {
    displayName: string;
    studentClass: string;
    studentNumber: string;
  };
  bookData: {
    title: string;
    author?: string;
    publisher?: string;
    borrowedAt: Date;
    dueDate: Date;
  };
}

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  studentClass: string;
  studentNumber: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLogin: Date;
}





const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const { allItems, fetchAllItems, setAllItems, addAnnouncement, updateAnnouncement } = useEvents();
  const { 
    lendBookToUser, 
    approveReturn, 
    markFineAsPaid, 
    markBookAsLost, 
    markBookAsFound, 
    refetchAllBooks, 
    allBorrowedBooks, 
    approveBorrow, 
    rejectBorrow, 
    borrowMessages,
    getBookStatus 
  } = useBooks();
  const [activeEventSubTab, setActiveEventSubTab] = useState<'events' | 'surveys' | 'announcements'>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [returnMessages, setReturnMessages] = useState<ReturnMessage[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'borrowed-books' | 'requests' | 'fines' | 'messages' | 'users' | 'catalog' | 'collection-distribution' | 'reports' | 'user-events' | 'announcements'>('borrowed-books');
  const [statusFilter, setStatusFilter] = useState<'all' | 'borrowed' | 'returned'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'borrowedAt'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 10;
  const [finesSearchQuery, setFinesSearchQuery] = useState('');
  const [showFinesFilters, setShowFinesFilters] = useState(false);
  const [finesStatusFilter, setFinesStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [finesSortBy, setFinesSortBy] = useState<'dueDate' | 'amount'>('dueDate');
  const [finesSortOrder, setFinesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [finesCurrentPage, setFinesCurrentPage] = useState(1);
  const finesPerPage = 10;
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');

  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const usersPerPage = 10;
  
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<'all' | 'available' | 'borrowed' | 'lost'>('all');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showLendBookModal, setShowLendBookModal] = useState(false);
  const [selectedBookToLend, setSelectedBookToLend] = useState<Book | null>(null);
  
  const [showEditUserModal, setShowEditUserModal] = useState(false); // New state for edit user modal
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<UserData | null>(null); // New state for user being edited
  const [showEditBookModal, setShowEditBookModal] = useState(false);
  const [selectedBookToEdit, setSelectedBookToEdit] = useState<Book | null>(null);
  const [requestSortBy, setRequestSortBy] = useState<'createdAt' | 'priority'>('createdAt');
  const [requestSortOrder, setRequestSortOrder] = useState<'asc' | 'desc'>('desc');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [requestPriorityFilter, setRequestPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [messagesSearchQuery, setMessagesSearchQuery] = useState('');
  const [messageTypeFilter, setMessageTypeFilter] = useState<'all' | 'borrow' | 'return'>('all');
  const [messagesCurrentPage, setMessagesCurrentPage] = useState(1);
  const [messagesPerPage, setMessagesPerPage] = useState(10);
  const [distributionCriterion, setDistributionCriterion] = useState<'category' | 'publisher' | 'status' | 'tags'>('category');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [newBook, setNewBook] = useState({
    author: '',
    category: '',
    coverImage: '',
    location: '',
    publisher: '',
    status: 'available',
    tags: '',
    title: '',
    backCover: '',
    pageCount: 0,
    dimensions: '',
    weight: '',
    binding: '',
  });
  const [reportData, setReportData] = useState({
    totalUsers: 0,
    totalBooks: 0,
    borrowedBooks: 0,
    overdueBooks: 0,
    totalFines: 0,
    monthlyBorrows: [],
    categoryDistribution: [],
    userActivity: [],
    mostReadAuthors: [],
    lostBooks: [],
    popularCategories: [],
    classReads: { most: [], least: [] },
  });
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const reportContentRef = useRef(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Event | null>(null);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Event | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedEventForParticipants, setSelectedEventForParticipants] = useState<Event | null>(null);

  const totalPaidFines = React.useMemo(() => {
    if (!allBorrowedBooks) return 0;
    return allBorrowedBooks
      .filter(book => book.fineStatus === 'paid' && book.fineAmount)
      .reduce((sum, book) => sum + (book.fineAmount || 0), 0);
  }, [allBorrowedBooks]);

  const fetchReturnMessages = useCallback(async () => {
    try {
      const messagesRef = collection(db, 'returnMessages');
      const q = query(messagesRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const messages: ReturnMessage[] = [];
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          bookData: {
            ...data.bookData,
            borrowedAt: data.bookData.borrowedAt.toDate(),
            dueDate: data.bookData.dueDate.toDate()
          }
        } as ReturnMessage);
      });
      
      setReturnMessages(messages);
    } catch (error) {
      console.error('Error fetching return messages:', error);
    }
  }, [setReturnMessages]);


  const [catalogBooks, setCatalogBooks] = useState<Book[]>([]);

  // Get unique categories from Firestore books
  const categories = Array.from(new Set(catalogBooks.map(book => book.category)));

  // Collection data for distribution chart from Firestore books
  const collections = categories.map(category => {
    const booksInCategory = catalogBooks.filter(book => book.category === category);
    return { name: category, data: booksInCategory };
  });

  const colors = [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(255, 99, 255, 0.8)',
    'rgba(54, 162, 64, 0.8)',
    'rgba(255, 206, 192, 0.8)'
  ];

  const chartData = {
    labels: collections.map(c => c.name),
    datasets: [
      {
        label: 'Kitap Sayısı',
        data: collections.map(c => c.data.length),
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const
      },
      title: {
        display: true,
        text: 'Koleksiyon Dağılımı'
      }
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    setFinesCurrentPage(1);
  }, [finesSearchQuery, finesStatusFilter, finesSortBy, finesSortOrder]);

  useEffect(() => {
    setUsersCurrentPage(1);
  }, [usersSearchQuery]);

  useEffect(() => {
    setMessagesCurrentPage(1);
  }, [messagesSearchQuery, messageTypeFilter]);

  

  useEffect(() => {
    if (activeTab === 'user-events') {
      fetchAllItems();
    }
  }, [activeTab, fetchAllItems]);

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchReturnMessages();
    }
  }, [activeTab, fetchReturnMessages]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const booksCollectionRef = collection(db, "books");
        const querySnapshot = await getDocs(booksCollectionRef);
        const booksData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];
        setCatalogBooks(booksData);
      } catch (error) {
        console.error("Error fetching books from Firestore:", error);
      }
    };

    fetchUsers();
    fetchBooks();
  }, [fetchAllItems]);

  const fetchReportData = async (month: string) => {
    try {
      const [usersSnapshot, borrowedBooksSnapshot, booksSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'borrowedBooks')),
        getDocs(collection(db, 'books'))
      ]);

      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserData[];
      const booksData = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Book[];
      
      const [year, m] = month.split('-').map(Number);
      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 0, 23, 59, 59);

      const filteredBorrowedBooks = borrowedBooksSnapshot.docs
        .map(doc => doc.data())
        .filter(borrow => {
            const borrowedAt = (borrow.borrowedAt as Timestamp).toDate();
            return borrowedAt >= startDate && borrowedAt <= endDate;
        });

      const totalUsers = usersSnapshot.size;
      const totalBooks = booksSnapshot.size;
      const borrowedBooksCount = filteredBorrowedBooks.length;

      let overdueCount = 0;
      let totalFinesAmount = 0;
      const today = new Date();
      
      borrowedBooksSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.returnStatus === 'borrowed') {
          const dueDate = data.dueDate.toDate();
          if (today > dueDate) {
            overdueCount++;
            const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            totalFinesAmount += daysOverdue * 5; // 5 TL per day
          }
        }
      });

      const monthlyBorrows = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('tr-TR', { month: 'long' });
        
        let count = 0;
        borrowedBooksSnapshot.forEach(doc => {
          const data = doc.data();
          const borrowDate = data.borrowedAt.toDate();
          if (borrowDate.getMonth() === date.getMonth() && borrowDate.getFullYear() === date.getFullYear()) {
            count++;
          }
        });
        
        monthlyBorrows.push({ month: monthName, count });
      }

      const categoryCount = {};
      filteredBorrowedBooks.forEach(borrow => {
        const book = booksData.find(b => b.id === borrow.bookId);
        if (book) {
            const category = book.category || 'Diğer';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        }
      });

      const categoryDistribution = Object.entries(categoryCount).map(([category, count]) => ({
        category,
        count
      }));

      const userBorrowCount = {};
      filteredBorrowedBooks.forEach(borrow => {
        const userId = borrow.userId;
        userBorrowCount[userId] = (userBorrowCount[userId] || 0) + 1;
      });

      const userActivity = [];
      for (const [userId, count] of Object.entries(userBorrowCount)) {
        const user = usersData.find(u => u.uid === userId);
        if (user) {
          userActivity.push({
            name: user.displayName || 'Bilinmeyen',
            count: count
          });
        }
      }
      userActivity.sort((a, b) => b.count - a.count).splice(10);

      const authorReadCounts = {};
      filteredBorrowedBooks.forEach(borrow => {
          const book = booksData.find(b => b.id === borrow.bookId);
          if (book && book.author) {
              authorReadCounts[book.author] = (authorReadCounts[book.author] || 0) + 1;
          }
      });
      const mostReadAuthors = Object.entries(authorReadCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

      const lostBooks = booksData.filter(book => book.status === 'lost');

      const popularCategories = Object.entries(categoryCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

      const classReadsCount = {};
      filteredBorrowedBooks.forEach(borrow => {
          const user = usersData.find(u => u.uid === borrow.userId);
          if (user && user.studentClass) {
              classReadsCount[user.studentClass] = (classReadsCount[user.studentClass] || 0) + 1;
          }
      });
      const classReadsArray = Object.entries(classReadsCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      
      const classReads = {
          most: classReadsArray.slice(0, 5),
          least: classReadsArray.slice(-5).reverse(),
      };

      setReportData({
        totalUsers,
        totalBooks,
        borrowedBooks: borrowedBooksCount,
        overdueBooks: overdueCount,
        totalFines: totalFinesAmount,
        monthlyBorrows,
        categoryDistribution,
        userActivity,
        mostReadAuthors,
        lostBooks,
        popularCategories,
        classReads,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  const exportToPDF = () => {
    const input = reportContentRef.current;
    if (input) {
      html2canvas(input).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const width = pdfWidth;
        const height = width / ratio;
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save(`rapor-${reportMonth}.pdf`);
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const usersData: UserData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role !== 'admin') { // Don't show admin users
          usersData.push({
            uid: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLogin: data.lastLogin?.toDate() || new Date(),
          } as UserData);
        }
      });
      
      setUsers(usersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  

  

  

  const handleEditUser = (user: UserData) => {
    setSelectedUserToEdit(user);
    setShowEditUserModal(true);
  };

  const handleSaveUser = async (updatedUser: UserData) => {
    if (!updatedUser) return;

    try {
      const userRef = doc(db, 'users', updatedUser.uid);
      await updateDoc(userRef, {
        displayName: updatedUser.displayName,
        studentClass: updatedUser.studentClass,
        studentNumber: updatedUser.studentNumber,
        role: updatedUser.role,
      });

      setUsers(prev => prev.map(user => user.uid === updatedUser.uid ? updatedUser : user));
      setShowEditUserModal(false);
      setSelectedUserToEdit(null);
      alert('Kullanıcı bilgileri başarıyla güncellendi.');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Kullanıcı güncellenirken bir hata oluştu.');
    }
  };

  const handleEditBook = (book: Book) => {
    setSelectedBookToEdit(book);
    setShowEditBookModal(true);
  };

  const handleSaveBook = async (updatedBook: Book) => {
    if (!updatedBook) return;

    try {
      const { id, ...bookData } = updatedBook;
      const bookRef = doc(db, 'books', id);
      await updateDoc(bookRef, {
        ...bookData,
        tags: Array.isArray(bookData.tags) ? bookData.tags : (bookData.tags as any).split(',').map((tag:string) => tag.trim()).filter((tag:string) => tag !== ''),
      });

      setCatalogBooks(prev => prev.map(book => book.id === updatedBook.id ? updatedBook : book));
      setShowEditBookModal(false);
      setSelectedBookToEdit(null);
      refetchAllBooks();
      alert('Kitap bilgileri başarıyla güncellendi.');
    } catch (error) {
      console.error('Error updating book:', error);
      alert('Kitap güncellenirken bir hata oluştu.');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!window.confirm('Bu kitabı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      const bookRef = doc(db, 'books', bookId);
      await deleteDoc(bookRef);

      setCatalogBooks(prev => prev.filter(book => book.id !== bookId));
      refetchAllBooks();
      alert('Kitap başarıyla silindi.');
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Kitap silinirken bir hata oluştu.');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      const batch = writeBatch(db);

      // Delete user document
      const userRef = doc(db, 'users', userId);
      batch.delete(userRef);

      // Delete user's borrowed books
      const borrowedBooksRef = collection(db, 'borrowedBooks');
      const borrowedBooksQuery = query(borrowedBooksRef, where('userId', '==', userId));
      const borrowedBooksSnapshot = await getDocs(borrowedBooksQuery);
      borrowedBooksSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      

      // Delete user's requests
      const requestsRef = collection(db, 'requests');
      const requestsQuery = query(requestsRef, where('userId', '==', userId));
      const requestsSnapshot = await getDocs(requestsQuery);
      requestsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete user's tasks
      const tasksRef = collection(db, 'userTasks');
      const tasksQuery = query(tasksRef, where('userId', '==', userId));
      const tasksSnapshot = await getDocs(tasksQuery);
      tasksSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete user's achievements
      const achievementsRef = collection(db, 'userAchievements');
      const achievementsQuery = query(achievementsRef, where('userId', '==', userId));
      const achievementsSnapshot = await getDocs(achievementsQuery);
      achievementsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete user's borrow messages
      const borrowMessagesRef = collection(db, 'borrowMessages');
      const borrowMessagesQuery = query(borrowMessagesRef, where('userId', '==', userId));
      const borrowMessagesSnapshot = await getDocs(borrowMessagesQuery);
      borrowMessagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete user's return messages
      const returnMessagesRef = collection(db, 'returnMessages');
      const returnMessagesQuery = query(returnMessagesRef, where('userId', '==', userId));
      const returnMessagesSnapshot = await getDocs(returnMessagesQuery);
      returnMessagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Update local state
      setUsers(prev => prev.filter(user => user.uid !== userId));
      
      alert('Kullanıcı başarıyla silindi.');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Kullanıcı silinirken bir hata oluştu.');
    }
  };

  

  const handleApproveReturn = async (message: ReturnMessage) => {
    try {
      await approveReturn(message.bookId, message.userId);
      // setReturnMessages(prev => prev.filter(m => m.id !== message.id)); // This state is no longer managed here
    } catch (error) {
      console.error('Error approving return:', error);
    }
  };

  const handlePaymentReceived = async (bookId: string, userId: string) => {
    try {
      await markFineAsPaid(bookId, userId);
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  const handleMarkAsLost = async (bookId: string) => {
    try {
      await markBookAsLost(bookId);
    } catch (error) {
      console.error('Error marking book as lost:', error);
    }
  };

  const handleMarkAsFound = async (bookId: string) => {
    try {
      await markBookAsFound(bookId);
    } catch (error) {
      console.error('Error marking book as found:', error);
    }
  };

  const handleLendBook = async (userId: string) => {
    if (selectedBookToLend) {
      try {
        await lendBookToUser(selectedBookToLend.id, userId); 
        setShowLendBookModal(false);
        setSelectedBookToLend(null);
        refetchAllBooks();
        alert('Kitap başarıyla ödünç verildi.');
      } catch (error) {
        console.error('Error lending book:', error);
        alert('Kitap ödünç verilirken bir hata oluştu.');
      }
    }
  };

  const distributionData = React.useMemo(() => {
    const counts = new Map<string, number>();
    if (distributionCriterion === 'tags') {
      catalogBooks.forEach(book => {
        if (book.tags) {
          const tags = Array.isArray(book.tags) 
            ? book.tags 
            : String(book.tags).split(',').map(tag => tag.trim()).filter(tag => tag);
          
          tags.forEach(tag => {
            if(tag) counts.set(tag, (counts.get(tag) || 0) + 1);
          });
        }
      });
    } else {
      catalogBooks.forEach(book => {
        let key;
        if (distributionCriterion === 'publisher') {
          key = book.publisher || 'Bilinmeyen';
        } else if (distributionCriterion === 'status') {
          key = getBookStatus(book.id) || 'Bilinmeyen';
        } else { // 'category'
          key = book.category || 'Bilinmeyen';
        }
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [catalogBooks, distributionCriterion, getBookStatus]);

  const distributionChartData = {
    labels: distributionData.map(d => d.name),
    datasets: [
      {
        label: 'Kitap Sayısı',
        data: distributionData.map(d => d.count),
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 1
      }
    ]
  };

  const distributionChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const
      },
      title: {
        display: true,
        text: `Eser Dağılımı - ${distributionCriterion.charAt(0).toUpperCase() + distributionCriterion.slice(1)}`
      }
    }
  };

  const allMessages = [
    ...borrowMessages.map(m => ({ ...m, type: 'borrow' as const })),
    ...returnMessages.map(m => ({ ...m, type: 'return' as const }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const filteredMessages = allMessages.filter(message => {
    const searchLower = messagesSearchQuery.toLowerCase();
    const matchesSearch = 
      (message.userData?.displayName?.toLowerCase().includes(searchLower) ||
      message.userData?.studentNumber?.toLowerCase().includes(searchLower) ||
      message.bookData?.title?.toLowerCase().includes(searchLower));

    const matchesType = messageTypeFilter === 'all' || message.type === messageTypeFilter;

    return matchesSearch && matchesType;
  });

  const messagesTotalPages = Math.ceil(filteredMessages.length / messagesPerPage);
  const paginatedMessages = filteredMessages.slice(
    (messagesCurrentPage - 1) * messagesPerPage,
    messagesCurrentPage * messagesPerPage
  );

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const filteredBooks = (allBorrowedBooks || [])
    .filter(book => {
      const matchesSearch = (book.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (book.id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (book.userData?.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (book.userData?.studentNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || book.returnStatus === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = sortBy === 'dueDate' ? a.dueDate.getTime() : a.borrowedAt.getTime();
      const dateB = sortBy === 'dueDate' ? b.dueDate.getTime() : b.borrowedAt.getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * booksPerPage,
    currentPage * booksPerPage
  );

  const overdueBooks = (allBorrowedBooks || []).filter(book => {
    const daysOverdue = Math.ceil(
      (new Date().getTime() - book.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysOverdue > 0;
  });

  const calculateFine = (book: BorrowedBook): number => {
    if (book.fineStatus === 'paid') {
      return book.fineAmount || 0;
    }

    const today = new Date();
    const diffTime = today.getTime() - book.dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * 5 : 0;
  };

  const filteredOverdueBooks = overdueBooks
    .filter(book => {
      const matchesSearch = 
        (book.title?.toLowerCase() || '').includes(finesSearchQuery.toLowerCase()) ||
        (book.userData?.displayName?.toLowerCase() || '').includes(finesSearchQuery.toLowerCase()) ||
        (book.userData?.studentNumber?.toLowerCase() || '').includes(finesSearchQuery.toLowerCase());

      const matchesStatus = 
        finesStatusFilter === 'all' ||
        (finesStatusFilter === 'paid' && book.fineStatus === 'paid') ||
        (finesStatusFilter === 'unpaid' && book.fineStatus !== 'paid');

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (finesSortBy === 'amount') {
        const fineA = calculateFine(a);
        const fineB = calculateFine(b);
        return finesSortOrder === 'asc' ? fineA - fineB : fineB - fineA;
      } else {
        return finesSortOrder === 'asc' 
          ? a.dueDate.getTime() - b.dueDate.getTime()
          : b.dueDate.getTime() - a.dueDate.getTime();
      }
    });

  const finesTotalPages = Math.ceil(filteredOverdueBooks.length / finesPerPage);
  const paginatedFines = filteredOverdueBooks.slice(
    (finesCurrentPage - 1) * finesPerPage,
    finesCurrentPage * finesPerPage
  );

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.displayName?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase()) ||
      (user.studentClass?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase()) ||
      (user.studentNumber?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase());

    return matchesSearch;
  });

  const usersTotalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (usersCurrentPage - 1) * usersPerPage,
    usersCurrentPage * usersPerPage
  );

  const filteredCatalogBooks = catalogBooks.filter(book => {
    const matchesSearch =
      (book.title || '').toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
      (book.author || '').toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
      (book.id || '').toLowerCase().includes(catalogSearchQuery.toLowerCase());

    const bookStatus = getBookStatus(book.id);
    const matchesStatus = 
      catalogStatusFilter === 'all' || bookStatus === catalogStatusFilter;

    const matchesCategory = 
      catalogCategoryFilter === 'all' || book.category === catalogCategoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  const handleEventFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedEvent(prev => {
      if (prev) {
        return { ...prev, [name]: value };
      }
      return prev;
    });
  };

  const handleSurveyFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedSurvey(prev => {
      if (prev) {
        return { ...prev, [name]: value };
      }
      return prev;
    });
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    try {
      const { id, ...eventData } = selectedEvent;

      const eventToSave = {
        ...eventData,
        date: new Date(eventData.date),
        name: eventData.title, // Map title to name
        description: eventData.content, // Map content to description
      };

      if (id) {
        // Update existing event
        const eventRef = doc(db, 'events', id);
        await updateDoc(eventRef, eventToSave);
        fetchAllItems();
        alert('Etkinlik başarıyla güncellendi!');
      } else {
        // Add new event
        await addDoc(collection(db, 'events'), { ...eventToSave, type: 'event' });
        fetchAllItems();
        alert('Etkinlik başarıyla eklendi!');
      }
      setShowEventModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Etkinlik kaydedilirken bir hata oluştu.');
    }
  };

  const handleSurveySubmit = async (survey: Event) => {
    if (!survey) return;

    try {
      const { id, ...surveyData } = survey;

      if (id) {
        // Update existing survey
        const surveyRef = doc(db, 'events', id);
        await updateDoc(surveyRef, {
          name: survey.title, // Map title to name
          content: survey.description, // Map description to content
          coverImage: survey.coverImage,
          date: survey.date,
          status: survey.status,
          surveyUrl: survey.surveyUrl,
          type: 'survey',
        });
        fetchAllItems();
        alert('Anket başarıyla güncellendi!');
      } else {
        // Add new survey
        const surveyRef = await addDoc(collection(db, 'events'), {
          name: survey.title, // Map title to name
          content: survey.description, // Map description to content
          coverImage: survey.coverImage,
          date: survey.date,
          status: survey.status,
          surveyUrl: survey.surveyUrl,
          type: 'survey',
        });
        setAllItems(prev => [...prev, { ...survey, name: survey.title, content: survey.description, type: 'survey', id: surveyRef.id }]);
        alert('Anket başarıyla eklendi!');
      }
      setShowSurveyModal(false);
      setSelectedSurvey(null);
    } catch (error) {
      console.error('Error saving survey:', error);
      alert('Anket kaydedilirken bir hata oluştu.');
    }
  };

  const handleAnnouncementFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedAnnouncement(prev => {
      if (prev) {
        return { ...prev, [name]: value };
      }
      return prev;
    });
  };

  const handleAnnouncementSubmit = async (announcementData: Announcement) => {
    if (!announcementData) return;

    try {
      const { id, ...dataToSave } = announcementData;

      if (id) {
        // Update existing announcement
        await updateAnnouncement(announcementData);
        
        setAllItems(prev => prev.map(ann => 
          ann.id === id 
            ? { ...ann, ...announcementData } 
            : ann
        ));
        alert('Duyuru başarıyla güncellendi!');
      } else {
        // Add new announcement
        const newAnn = await addAnnouncement({ ...announcementData, type: 'announcement' });
        setAllItems(prev => [...prev, newAnn]);
        alert('Duyuru başarıyla eklendi!');
      }
      setShowAnnouncementModal(false);
      setSelectedAnnouncement(null);
    } catch (error) {
      console.error('Error saving announcement:', error);
      alert('Duyuru kaydedilirken bir hata oluştu.');
    }
  };

  

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) return;

    try {
      await deleteDoc(doc(db, 'events', eventId));
      setAllItems(prev => prev.filter(event => event.id !== eventId));
      alert('Etkinlik başarıyla silindi.');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Etkinlik silinirken bir hata oluştu.');
    }
  };

  const handleNewBookChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    setNewBook(prev => ({ ...prev, [name]: isNumber ? Number(value) : value }));
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const booksCollectionRef = collection(db, "books");
      await addDoc(booksCollectionRef, {
        ...newBook,
        tags: newBook.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        addedDate: serverTimestamp(),
      });
      setShowAddBookModal(false);
      setNewBook({
        author: '',
        category: '',
        coverImage: '',
        location: '',
        publisher: '',
        status: 'available',
        tags: '',
        title: '',
        backCover: '',
        pageCount: 0,
        dimensions: '',
        weight: '',
        binding: '',
      });
      // Refresh catalog books after adding a new one
      const booksCollectionRefFresh = collection(db, "books");
      const querySnapshot = await getDocs(booksCollectionRefFresh);
      const booksData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];
      setCatalogBooks(booksData);
      refetchAllBooks();
      alert('Kitap başarıyla eklendi!');
    } catch (error) {
      console.error('Error adding book:', error);
      alert('Kitap eklenirken bir hata oluştu.');
    }
  };

  

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out z-50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Book className="w-8 h-8 mr-2" />
              <span className="text-xl font-bold">Admin Panel</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-indigo-800 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="space-y-1">
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ana Panel</h3>
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('borrowed-books');
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'borrowed-books' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Library className="w-5 h-5" />
                  <span>Ödünç Verilen Kitaplar</span>
                </button>
                
                <button
                  onClick={() => {
                    setActiveTab('messages');
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'messages' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span>Mesajlar</span>
                  {borrowMessages.length > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {borrowMessages.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTab('requests');
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'requests' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Gönderilen Talepler</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('fines');
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'fines' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                  <span>Kullanıcı Cezaları</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Yönetim</h3>
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('users');
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'users' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Kullanıcılar</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('user-events');
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'user-events' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>Etkinlik Yönetimi</span>
                </button>

                

                <button
                  onClick={() => {
                    setActiveTab('catalog');
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'catalog' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Book className="w-5 h-5" />
                  <span>Katalog</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Raporlama</h3>
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('reports');
                    setSidebarOpen(false);
                    fetchReportData(reportMonth);
                  }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'reports' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <BarChart className="w-5 h-5" />
                  <span>Raporlar</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('collection-distribution');
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'collection-distribution' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <PieChart className="w-5 h-5" />
                  <span>Eser Dağılımı</span>
                </button>
              </div>
            </div>
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 w-full rounded-lg hover:bg-indigo-800 transition-colors text-red-300 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Header */}
      <div className="bg-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-indigo-800 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold ml-4">Admin Paneli</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-indigo-800 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'borrowed-books' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Library className="w-6 h-6 mr-2 text-indigo-600" />
                  Ödünç Verilen Kitaplar
                </h2>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Kitap adı, kodu veya öğrenci..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'borrowed' | 'returned')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="borrowed">Ödünç Verilmiş</option>
                    <option value="returned">İade Edilmiş</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'borrowedAt')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="dueDate">İade Tarihine Göre</option>
                    <option value="borrowedAt">Ödünç Alma Tarihine Göre</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                  >
                    {sortOrder === 'asc' ? 'Artan' : 'Azalan'}
                    <ChevronUp className={`w-4 h-4 ml-2 transform transition-transform ${
                      sortOrder === 'desc' ? 'rotate-180' : ''
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kitap Kodu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kitap Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kullanıcı Bilgileri
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ödünç Tarihi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İade Tarihi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teslim
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedBooks.map((book) => {
                    const daysRemaining = Math.ceil(
                      (book.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const isOverdue = daysRemaining < 0;

                    return (
                      <tr key={`${book.id}-${book.borrowedBy}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {book.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {book.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {book.userData?.displayName || 'İsimsiz Kullanıcı'}
                              </div>
                              <div className="text-gray-500">
                                {book.userData?.studentClass} - {book.userData?.studentNumber}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {book.borrowedAt.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {book.dueDate.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isOverdue
                              ? 'bg-red-100 text-red-800'
                              : daysRemaining <= 3
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isOverdue
                              ? `${Math.abs(daysRemaining)} gün gecikmiş`
                              : `${daysRemaining} gün kaldı`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            book.returnStatus === 'returned'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {book.returnStatus === 'returned' ? 'İade Edildi' : 'Ödünç Verildi'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Sayfa {currentPage} / {totalPages} ({filteredBooks.length} sonuç)
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Mail className="w-6 h-6 mr-2 text-indigo-600" />
                    Mesajlar
                  </h2>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Kullanıcı, kitap adı..."
                        value={messagesSearchQuery}
                        onChange={(e) => setMessagesSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
                      />
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                    </div>
                    <select
                      value={messageTypeFilter}
                      onChange={(e) => setMessageTypeFilter(e.target.value as 'all' | 'borrow' | 'return')}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="all">Tüm Talepler</option>
                      <option value="borrow">Ödünç Alma</option>
                      <option value="return">İade</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Bilgileri</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep Türü</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Bilgileri</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep Tarihi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedMessages.length > 0 ? (
                      paginatedMessages.map(message => (
                        <tr key={`${message.type}-${message.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{message.userData.displayName}</div>
                            <div className="text-sm text-gray-500">{message.userData.studentClass} - {message.userData.studentNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {message.type === 'borrow' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                Ödünç Alma Talebi
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                İade Talebi
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{message.bookData.title}</div>
                            <div className="text-sm text-gray-500">Kod: {message.bookId}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {message.createdAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {message.type === 'borrow' ? (
                              <>
                                <button
                                  onClick={() => approveBorrow(message.bookId, message.userId)}
                                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                                >
                                  Onayla
                                </button>
                                <button
                                  onClick={() => rejectBorrow(message.bookId, message.userId)}
                                  className="px-3 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-xs"
                                >
                                  Reddet
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleApproveReturn(message)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-xs"
                              >
                                İade Al
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          Aranan kriterlere uygun mesaj bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {messagesTotalPages > 1 && (
                <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Sayfa {messagesCurrentPage} / {messagesTotalPages} ({filteredMessages.length} sonuç)
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setMessagesCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={messagesCurrentPage === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => setMessagesCurrentPage(p => Math.min(p + 1, messagesTotalPages))}
                      disabled={messagesCurrentPage === messagesTotalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </div>
        )}

        {activeTab === 'requests' && (
          <RequestProvider>
            <RequestsTab />
          </RequestProvider>
        )}

        {activeTab === 'reports' && (
          <div ref={reportContentRef} className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <BarChart className="w-6 h-6 mr-2 text-indigo-600" />
                Kütüphane Raporları
              </h2>
              <div className="flex items-center space-x-4">
                <input 
                    type="month" 
                    value={reportMonth} 
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={() => fetchReportData(reportMonth)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                >
                  Filtrele
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  PDF Olarak Dışa Aktar
                </button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <BookOpen className="w-8 h-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Toplam Kitap</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totalBooks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <Book className="w-8 h-8 text-yellow-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ödünç Verilen</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.borrowedBooks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Gecikmiş Kitap</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.overdueBooks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-purple-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Toplam Ceza</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totalFines} ₺</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <PiggyBank className="w-8 h-8 text-pink-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Kumbara</p>
                    <p className="text-2xl font-bold text-gray-900">{totalPaidFines} ₺</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Borrows Chart */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Ödünç Alma Trendi</h3>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: reportData.monthlyBorrows.map(item => item.month),
                      datasets: [
                        {
                          label: 'Ödünç Alınan Kitap Sayısı',
                          data: reportData.monthlyBorrows.map(item => item.count),
                          backgroundColor: 'rgba(99, 102, 241, 0.8)',
                          borderColor: 'rgba(99, 102, 241, 1)',
                          borderWidth: 1
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Category Distribution Chart */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Popüler Kategoriler</h3>
                <div className="h-64">
                  <Pie
                    data={{
                      labels: reportData.popularCategories.map(item => item.name),
                      datasets: [
                        {
                          data: reportData.popularCategories.map(item => item.count),
                          backgroundColor: colors,
                          borderWidth: 1
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* New Reports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Okunan Yazarlar</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yazar</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Okunma Sayısı</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportData.mostReadAuthors.map((author, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{author.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{author.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Kayıp Kitaplar</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Adı</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yazar</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportData.lostBooks.map((book, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.author}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Kitap Okuyan Sınıflar</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Okunan Kitap Sayısı</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportData.classReads.most.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">En Az Kitap Okuyan Sınıflar</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Okunan Kitap Sayısı</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportData.classReads.least.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'fines' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <DollarSign className="w-6 h-6 mr-2 text-indigo-600" />
                Kullanıcı Cezaları
              </h2>
            </div>

            <div className="p-6">
              {/* Search and Filter Section */}
              <div className="mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Kullanıcı adı, öğrenci no veya kitap adı..."
                        value={finesSearchQuery}
                        onChange={(e) => setFinesSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFinesFilters(!showFinesFilters)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                  >
                    <Filter className="w-5 h-5 mr-2" />
                    Filtrele
                  </button>
                </div>

                {showFinesFilters && (
                  <div className="mt-4 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ödeme Durumu
                        </label>
                        <select
                          value={finesStatusFilter}
                          onChange={(e) => setFinesStatusFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="all">Tümü</option>
                          <option value="paid">Ödenmiş</option>
                          <option value="unpaid">Ödenmemiş</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sıralama
                        </label>
                        <select
                          value={finesSortBy}
                          onChange={(e) => setFinesSortBy(e.target.value as 'dueDate' | 'amount')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="dueDate">İade Tarihine Göre</option>
                          <option value="amount">Ceza Tutarına Göre</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sıralama Yönü
                        </label>
                        <button
                          onClick={() => setFinesSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                        >
                          {finesSortOrder === 'asc' ? (
                            <>
                              <SortAsc className="w-5 h-5 mr-2" />
                              Artan
                            </>
                          ) : (
                            <>
                              <SortDesc className="w-5 h-5 mr-2" />
                              Azalan
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kullanıcı Bilgileri
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kitap Kodu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kitap Adı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ödünç Tarihi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İade Tarihi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gecikme
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ceza Tutarı
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedFines.map((book) => {
                      const daysOverdue = Math.ceil(
                        (new Date().getTime() - book.dueDate.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      const fine = calculateFine(book);

                      return (
                        <tr key={`${book.id}-${book.borrowedBy}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {book.userData?.displayName || 'İsimsiz Kullanıcı'}
                                </div>
                                <div className="text-gray-500">
                                  {book.userData?.studentClass} - {book.userData?.studentNumber}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {book.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {book.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {book.borrowedAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {book.dueDate.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {daysOverdue} gün
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-red-600">
                                {fine} TL
                              </span>
                              {book.fineStatus === 'paid' ? (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  Ödeme Alındı
                                </span>
                              ) : (
                                <button
                                  onClick={() => handlePaymentReceived(book.id, book.borrowedBy)}
                                  className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                                >
                                  Ödeme Al
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {finesTotalPages > 1 && (
                <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Sayfa {finesCurrentPage} / {finesTotalPages} ({filteredOverdueBooks.length} sonuç)
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFinesCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={finesCurrentPage === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => setFinesCurrentPage(p => Math.min(p + 1, finesTotalPages))}
                      disabled={finesCurrentPage === finesTotalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Users className="w-6 h-6 mr-2 text-indigo-600" />
                Kullanıcı Yönetimi
              </h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Kullanıcı adı, email, sınıf veya numara..."
                    value={usersSearchQuery}
                    onChange={(e) => setUsersSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf & Numara</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kayıt Tarihi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Giriş</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedUsers.map(user => (
                      <tr key={user.uid}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.studentClass}</div>
                          <div className="text-sm text-gray-500">{user.studentNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.createdAt.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => deleteUser(user.uid)}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {usersTotalPages > 1 && (
                <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Sayfa {usersCurrentPage} / {usersTotalPages} ({filteredUsers.length} sonuç)
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setUsersCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={usersCurrentPage === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => setUsersCurrentPage(p => Math.min(p + 1, usersTotalPages))}
                      disabled={usersCurrentPage === usersTotalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Book className="w-6 h-6 mr-2 text-indigo-600" />
                  Katalog Yönetimi
                </h2>
                <button
                  onClick={() => setShowAddBookModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Yeni Kitap Ekle
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-1">
                  <input
                    type="text"
                    placeholder="Kitap adı, yazar veya ID..."
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                </div>
                <select
                  value={catalogStatusFilter}
                  onChange={(e) => setCatalogStatusFilter(e.target.value as 'all' | 'available' | 'borrowed' | 'lost')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="available">Müsait</option>
                  <option value="borrowed">Ödünç Verildi</option>
                  <option value="lost">Kayıp</option>
                </select>
                <select
                  value={catalogCategoryFilter}
                  onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Tüm Kategoriler</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCatalogBooks.map(book => {
            const bookStatus = getBookStatus(book.id);
            
            return (
              <div key={book.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative">
                <img src={book.coverImage} alt={book.title} className="w-full h-85 object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{book.title}</h3>
                  <p className="text-sm text-gray-600">{book.author}</p>
                  <p className="text-xs text-gray-500 mt-1">{book.publisher}</p>
                  
                  <div className="mt-3 flex justify-between items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bookStatus === 'lost'
                        ? 'bg-red-100 text-red-800'
                        : bookStatus === 'borrowed'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>{
                        bookStatus === 'lost' 
                        ? 'Kayıp' 
                        : bookStatus === 'borrowed' 
                        ? 'Ödünç Verildi' 
                        : 'Müsait'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Konum: {book.location}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedBookToLend(book);
                        setShowLendBookModal(true);
                      }}
                      disabled={bookStatus !== 'available'}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      Ödünç Ver
                    </button>
                    <button
                      onClick={() => handleEditBook(book)}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDeleteBook(book.id)}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Sil
                    </button>
                    {bookStatus === 'lost' ? (
                      <button
                        onClick={() => handleMarkAsFound(book.id)}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center"
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        Bulundu
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkAsLost(book.id)}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-colors flex items-center"
                      >
                        <UserX className="w-3 h-3 mr-1" />
                        Kayıp
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
            </div>
          </div>
        )}

        {activeTab === 'collection-distribution' && (
          <div>
            <header className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900">Eser Dağılım Analizi</h1>
              <p className="mt-2 text-lg text-gray-600">
                Koleksiyonun çeşitli kriterlere göre detaylı dökümünü inceleyin.
              </p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <h2 className="text-2xl font-semibold mb-2 sm:mb-0">Görselleştirme</h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={distributionCriterion}
                      onChange={(e) => setDistributionCriterion(e.target.value as 'category' | 'publisher' | 'status' | 'tags')}
                      className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="category">Kategoriye Göre</option>
                      <option value="publisher">Yayınevine Göre</option>
                      <option value="status">Duruma Göre</option>
                      <option value="tags">Etikete Göre</option>
                    </select>
                    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                      <button
                        onClick={() => setChartType('pie')}
                        className={`px-3 py-1 text-sm font-semibold rounded-md ${chartType === 'pie' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
                      >
                        <PieChart className="w-5 h-5 inline-block sm:mr-1" />
                        <span className="hidden sm:inline">Pasta</span>
                      </button>
                      <button
                        onClick={() => setChartType('bar')}
                        className={`px-3 py-1 text-sm font-semibold rounded-md ${chartType === 'bar' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
                      >
                        <BarChart className="w-5 h-5 inline-block sm:mr-1" />
                        <span className="hidden sm:inline">Çubuk</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="relative h-[32rem]">
                  {chartType === 'pie' ? (
                    <Pie data={distributionChartData} options={{...distributionChartOptions, plugins: {...distributionChartOptions.plugins, legend: {display: true}}}} />
                  ) : (
                    <Bar data={distributionChartData} options={{...distributionChartOptions, plugins: {...distributionChartOptions.plugins, legend: {display: false}}}} />
                  )}
                </div>
              </div>

              {/* Right Column: Details */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold capitalize">{distributionCriterion} Detayları</h2>
                  <span className="text-sm font-bold text-gray-500">{catalogBooks.length} Toplam Eser</span>
                </div>
                <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-2">
                  {distributionData.sort((a, b) => b.count - a.count).map((item, index) => {
                    const percentage = catalogBooks.length > 0 ? (item.count / catalogBooks.length) * 100 : 0;
                    const color = colors[index % colors.length];
                    return (
                      <div key={item.name} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-base truncate" title={item.name}>{item.name}</span>
                          <span className="font-bold text-base">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${percentage}%`, backgroundColor: color }}
                          ></div>
                        </div>
                        <div className="text-right text-xs font-medium text-gray-500 mt-1">
                          %{percentage.toFixed(1)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'user-events' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Etkinlik ve Anket Yönetimi</h2>
              <div className="mt-4 flex space-x-4 border-b">
                <button
                  onClick={() => setActiveEventSubTab('events')}
                  className={`py-2 px-4 text-sm font-medium ${activeEventSubTab === 'events' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Etkinlikler
                </button>
                <button
                  onClick={() => setActiveEventSubTab('surveys')}
                  className={`py-2 px-4 text-sm font-medium ${activeEventSubTab === 'surveys' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Anketler
                </button>
                <button
                  onClick={() => setActiveEventSubTab('announcements')}
                  className={`py-2 px-4 text-sm font-medium ${activeEventSubTab === 'announcements' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Duyurular
                </button>
              </div>
            </div>
            <div className="p-6">
              {activeEventSubTab === 'events' && (
                <div>
                  <button
                    onClick={() => {
                      setSelectedEvent({ id: '', title: '', content: '', date: new Date().toISOString().slice(0, 16), location: '', imageUrl: '', type: 'event' });
                      setShowEventModal(true);
                    }}
                    className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Yeni Etkinlik Ekle
                  </button>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etkinlik Adı</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allItems.filter(e => e.type === 'event').map(event => (
                          <tr key={event.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">{event.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setShowEventModal(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedEventForParticipants(event);
                                  setShowParticipantsModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                <Users className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => deleteEvent(event.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                  </table>
                  </div>
                </div>
              )}
              {activeEventSubTab === 'surveys' && (
                <div>
                  <button
                    onClick={() => {
                      setSelectedSurvey(null); // Clear previous selection
                      setShowSurveyModal(true);
                    }}
                    className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Yeni Anket Ekle
                  </button>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anket Adı</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allItems.filter(e => e.type === 'survey').map(survey => (
                          <tr key={survey.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{survey.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(survey.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">{survey.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  setSelectedSurvey(survey);
                                  setShowSurveyModal(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => deleteEvent(survey.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                  </table>
                  </div>
                </div>
              )}
              {activeEventSubTab === 'announcements' && (
                <div>
                  <button
                    onClick={() => {
                      console.log('Yeni Duyuru Ekle button clicked');
                      setSelectedAnnouncement(null); // Clear previous selection
                      setShowAnnouncementModal(true);
                    }}
                    className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Yeni Duyuru Ekle
                  </button>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duyuru Adı</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allItems.filter(e => e.type === 'announcement').map(announcement => (
                          <tr key={announcement.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{announcement.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(announcement.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">{announcement.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  setSelectedAnnouncement(announcement);
                                  setShowAnnouncementModal(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => deleteEvent(announcement.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Duyuru Yönetimi</h2>
            </div>
            <div className="p-6">
              <button
                onClick={() => {
                  console.log('Yeni Duyuru Ekle button clicked');
                  setSelectedAnnouncement(null); // Clear previous selection
                  setShowAnnouncementModal(true);
                }}
                className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Yeni Duyuru Ekle
              </button>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duyuru Adı</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allItems.filter(e => e.type === 'announcement').map(announcement => (
                          <tr key={announcement.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{announcement.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(announcement.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">{announcement.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  setSelectedAnnouncement(announcement);
                                  setShowAnnouncementModal(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => deleteEvent(announcement.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddBookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">Yeni Kitap Ekle</h2>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="title" value={newBook.title} onChange={handleNewBookChange} placeholder="Kitap Adı" className="w-full p-2 border rounded" required />
                <input type="text" name="author" value={newBook.author} onChange={handleNewBookChange} placeholder="Yazar" className="w-full p-2 border rounded" required />
                <input type="text" name="category" value={newBook.category} onChange={handleNewBookChange} placeholder="Kategori" className="w-full p-2 border rounded" required />
                <input type="text" name="publisher" value={newBook.publisher} onChange={handleNewBookChange} placeholder="Yayıncı" className="w-full p-2 border rounded" />
                <input type="text" name="coverImage" value={newBook.coverImage} onChange={handleNewBookChange} placeholder="Kapak Resmi URL" className="w-full p-2 border rounded" />
                <input type="text" name="location" value={newBook.location} onChange={handleNewBookChange} placeholder="Konum" className="w-full p-2 border rounded" />
                <input type="number" name="pageCount" value={newBook.pageCount} onChange={handleNewBookChange} placeholder="Sayfa Sayısı" className="w-full p-2 border rounded" />
                <select name="status" value={newBook.status} onChange={handleNewBookChange} className="w-full p-2 border rounded">
                  <option value="available">Müsait</option>
                  <option value="borrowed">Ödünç Verildi</option>
                  <option value="lost">Kayıp</option>
                </select>
                <input type="text" name="dimensions" value={newBook.dimensions} onChange={handleNewBookChange} placeholder="Boyut" className="w-full p-2 border rounded" />
                <input type="text" name="binding" value={newBook.binding} onChange={handleNewBookChange} placeholder="Cilt" className="w-full p-2 border rounded" />
                <input type="text" name="weight" value={newBook.weight} onChange={handleNewBookChange} placeholder="Ağırlık" className="w-full p-2 border rounded" />
                <textarea name="backCover" value={newBook.backCover} onChange={handleNewBookChange} placeholder="Arka Kapak Yazısı" className="md:col-span-2 w-full p-2 border rounded"></textarea>
                <input type="text" name="tags" value={newBook.tags} onChange={handleNewBookChange} placeholder="Etiketler (virgülle ayırın)" className="md:col-span-2 w-full p-2 border rounded" />
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setShowAddBookModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">İptal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLendBookModal && selectedBookToLend && (
        <LendBookModal
          isOpen={showLendBookModal}
          book={selectedBookToLend}
          users={users}
          onClose={() => setShowLendBookModal(false)}
          onLend={handleLendBook}
        />
      )}

      {showEditUserModal && selectedUserToEdit && (
        <EditUserModal
          isOpen={showEditUserModal}
          user={selectedUserToEdit}
          onClose={() => setShowEditUserModal(false)}
          onSave={handleSaveUser}
        />
      )}

      {showEditBookModal && selectedBookToEdit && (
        <EditBookModal
          isOpen={showEditBookModal}
          book={selectedBookToEdit}
          onClose={() => setShowEditBookModal(false)}
          onSave={handleSaveBook}
        />
      )}

      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">{selectedEvent.id ? 'Etkinliği Düzenle' : 'Yeni Etkinlik Ekle'}</h2>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <input type="text" name="title" value={selectedEvent.title} onChange={handleEventFormChange} placeholder="Etkinlik Başlığı" className="w-full p-2 border rounded" />
              <textarea name="content" value={selectedEvent.content} onChange={handleEventFormChange} placeholder="Etkinlik Açıklaması" className="w-full p-2 border rounded"></textarea>
              <input type="datetime-local" name="date" value={selectedEvent.date} onChange={handleEventFormChange} className="w-full p-2 border rounded" />
              <input type="text" name="location" value={selectedEvent.location} onChange={handleEventFormChange} placeholder="Etkinlik Yeri" className="w-full p-2 border rounded" />
              <input type="text" name="imageUrl" value={selectedEvent.imageUrl} onChange={handleEventFormChange} placeholder="Görsel URL" className="w-full p-2 border rounded" />
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setShowEventModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">İptal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSurveyModal && (
        <SurveyFormModal
          isOpen={showSurveyModal}
          survey={selectedSurvey}
          onClose={() => setShowSurveyModal(false)}
          onSubmit={handleSurveySubmit}
        />
      )}

      {showAnnouncementModal && (
        <AnnouncementModal
          isOpen={showAnnouncementModal}
          announcement={selectedAnnouncement}
          onClose={() => setShowAnnouncementModal(false)}
          onSubmit={handleAnnouncementSubmit}
        />
      )}

      {showParticipantsModal && selectedEventForParticipants && (
        <ParticipantsModal
          isOpen={showParticipantsModal}
          onClose={() => setShowParticipantsModal(false)}
          event={selectedEventForParticipants}
        />
      )}
    </div>
  );
};

export default AdminDashboard;