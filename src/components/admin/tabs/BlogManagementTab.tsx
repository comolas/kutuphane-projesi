import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { CheckCircle, XCircle, Trash2, Eye, FileText, Clock, ThumbsUp, X, Search, Filter, Calendar, User, Tag, ArrowUpDown, ChevronLeft, ChevronRight, BarChart3, TrendingUp, CheckSquare, Square, Edit2, Save, Heart, EyeIcon } from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  coverImageURL: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  tags: string[];
  createdAt: any;
  likes?: string[];
  views?: number;
}

const BlogManagementTab: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [authorFilter, setAuthorFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isStatusOpen, setIsStatusOpen] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modalTab, setModalTab] = useState<'preview' | 'edit'>('preview');
  const [editedPost, setEditedPost] = useState<Partial<Post>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const postsSnapshot = await getDocs(collection(db, 'posts'));
      const postsData = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (postId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'posts', postId), { status });
      setPosts(posts.map(post => post.id === postId ? { ...post, status } : post));
    } catch (error) {
      console.error('Error updating post status:', error);
    }
  };

  const handleModalStatusUpdate = async (status: 'approved' | 'rejected') => {
    if (!viewingPost) return;
    await handleStatusUpdate(viewingPost.id, status);
    setViewingPost({ ...viewingPost, status });
  };

  const handleSaveEdit = async () => {
    if (!viewingPost || !editedPost.title || !editedPost.category) {
      alert('Başlık ve kategori zorunludur.');
      return;
    }
    try {
      await updateDoc(doc(db, 'posts', viewingPost.id), editedPost);
      const updatedPost = { ...viewingPost, ...editedPost };
      setPosts(posts.map(p => p.id === viewingPost.id ? updatedPost : p));
      setViewingPost(updatedPost);
      setModalTab('preview');
      alert('Değişiklikler kaydedildi.');
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Kaydetme sırasında hata oluştu.');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Bu yazıyı silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const toggleSelectPost = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const toggleSelectAll = () => {
    const currentPageIds = paginatedPosts.map(p => p.id);
    const allSelected = currentPageIds.every(id => selectedPosts.includes(id));
    
    if (allSelected) {
      setSelectedPosts(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedPosts(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedPosts.length === 0) {
      alert('Lütfen en az bir yazı seçin.');
      return;
    }

    const confirmMsg = action === 'delete' 
      ? `${selectedPosts.length} yazıyı silmek istediğinizden emin misiniz?`
      : `${selectedPosts.length} yazıyı ${action === 'approve' ? 'onaylamak' : 'reddetmek'} istediğinizden emin misiniz?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      if (action === 'delete') {
        await Promise.all(selectedPosts.map(id => deleteDoc(doc(db, 'posts', id))));
        setPosts(posts.filter(p => !selectedPosts.includes(p.id)));
      } else {
        const status = action === 'approve' ? 'approved' : 'rejected';
        await Promise.all(selectedPosts.map(id => updateDoc(doc(db, 'posts', id), { status })));
        setPosts(posts.map(p => selectedPosts.includes(p.id) ? { ...p, status } : p));
      }
      setSelectedPosts([]);
      alert('İşlem başarıyla tamamlandı.');
    } catch (error) {
      console.error('Bulk action error:', error);
      alert('İşlem sırasında bir hata oluştu.');
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(posts.map(p => p.category));
    return Array.from(cats);
  }, [posts]);

  const authors = useMemo(() => {
    const auths = new Set(posts.map(p => p.authorName));
    return Array.from(auths);
  }, [posts]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    posts.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [posts]);

  const filteredAndSortedPosts = useMemo(() => {
    let filtered = [...posts];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(term) ||
        p.authorName.toLowerCase().includes(term) ||
        p.excerpt?.toLowerCase().includes(term) ||
        p.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (authorFilter !== 'all') {
      filtered = filtered.filter(p => p.authorName === authorFilter);
    }

    if (dateRange.start) {
      filtered = filtered.filter(p => {
        const postDate = new Date(p.createdAt?.toMillis());
        return postDate >= new Date(dateRange.start);
      });
    }

    if (dateRange.end) {
      filtered = filtered.filter(p => {
        const postDate = new Date(p.createdAt?.toMillis());
        return postDate <= new Date(dateRange.end);
      });
    }


    
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const diff = (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        return sortOrder === 'desc' ? diff : -diff;
      } else {
        const comp = a.title.localeCompare(b.title);
        return sortOrder === 'desc' ? -comp : comp;
      }
    });
    
    return filtered;
  }, [posts, searchTerm, statusFilter, categoryFilter, authorFilter, dateRange, selectedTags, sortBy, sortOrder]);

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedPosts.slice(start, start + itemsPerPage);
  }, [filteredAndSortedPosts, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedPosts.length / itemsPerPage);

  const stats = useMemo(() => ({
    total: posts.length,
    pending: posts.filter(p => p.status === 'pending').length,
    approved: posts.filter(p => p.status === 'approved').length,
    rejected: posts.filter(p => p.status === 'rejected').length
  }), [posts]);

  const analyticsData = useMemo(() => {
    const now = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: date.toLocaleDateString('tr-TR', { month: 'short' }),
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      });
    }

    const monthlyData = last6Months.map(({ monthIndex, year }) => {
      const count = posts.filter(p => {
        const postDate = new Date(p.createdAt?.toMillis());
        return postDate.getMonth() === monthIndex && postDate.getFullYear() === year;
      }).length;
      return count;
    });

    const categoryData = posts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const authorData = posts.reduce((acc, p) => {
      acc[p.authorName] = (acc[p.authorName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topAuthors = Object.entries(authorData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: last6Months.map(m => m.month),
      monthlyData,
      topCategories,
      topAuthors,
      avgApprovalRate: posts.length > 0 ? ((stats.approved / posts.length) * 100).toFixed(1) : '0'
    };
  }, [posts, stats]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setAuthorFilter('all');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl mr-3">
              <FileText className="w-7 h-7 text-white" />
            </div>
            Blog Yazıları Yönetimi
          </h2>
          <p className="text-gray-600 text-lg">Blog yazılarını onaylayın, düzenleyin ve yönetin.</p>
        </div>
      </div>

      {/* Analytics Toggle */}
      <div className="mb-8 animate-fadeIn">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="w-full bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-900">Gelişmiş Analiz ve İstatistikler</h3>
              <p className="text-sm text-gray-600">Detaylı grafikler, kategori dağılımı ve yazar istatistikleri</p>
            </div>
          </div>
          <div className={`transform transition-transform ${showAnalytics ? 'rotate-180' : ''}`}>
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <div className="space-y-6 mb-8 animate-fadeIn">
          {/* Monthly Trend */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Aylık Yazı Trendi (Son 6 Ay)
            </h3>
            <div className="h-80">
              <Line
                data={{
                  labels: analyticsData.labels,
                  datasets: [{
                    label: 'Yazı Sayısı',
                    data: analyticsData.monthlyData,
                    borderColor: 'rgba(147, 51, 234, 1)',
                    backgroundColor: 'rgba(147, 51, 234, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      cornerRadius: 8,
                      titleFont: { size: 14, weight: 'bold' },
                      bodyFont: { size: 13 }
                    }
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                  }
                }}
              />
            </div>
          </div>

          {/* Category & Author Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Kategori Dağılımı</h3>
              <div className="h-80">
                <Pie
                  data={{
                    labels: analyticsData.topCategories.map(c => c[0]),
                    datasets: [{
                      data: analyticsData.topCategories.map(c => c[1]),
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(234, 179, 8, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(59, 130, 246, 0.8)'
                      ],
                      borderWidth: 2,
                      borderColor: '#fff'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Top Authors */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">En Aktif Yazarlar</h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: analyticsData.topAuthors.map(a => a[0]),
                    datasets: [{
                      label: 'Yazı Sayısı',
                      data: analyticsData.topAuthors.map(a => a[1]),
                      backgroundColor: 'rgba(147, 51, 234, 0.8)',
                      borderRadius: 8,
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8
                      }
                    },
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Approval Rate */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Onay Oranı</h3>
                <p className="text-white/90">Toplam yazıların onaylanma yüzdesi</p>
              </div>
              <div className="text-right">
                <p className="text-6xl font-bold">{analyticsData.avgApprovalRate}%</p>
                <p className="text-sm text-white/90 mt-2">{stats.approved} / {stats.total} yazı</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 animate-fadeIn">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Yazı</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.total}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <FileText className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Bekleyen</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Clock className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Onaylanan</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.approved}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <ThumbsUp className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Reddedilen</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.rejected}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <XCircle className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <Filter className="w-6 h-6" />
        </button>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Filters */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-full lg:w-80 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6 z-50 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } lg:top-6`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">Filtreler</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Temizle
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Search */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Arama</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 sm:w-4 h-3 sm:h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Başlık, yazar, etiket ara..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <button
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-700 mb-3 hover:text-indigo-600 transition-colors"
                >
                  <span>Durum</span>
                  <svg className={`w-4 h-4 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isStatusOpen && (
                  <div className="space-y-2 animate-fadeIn">
                    {[{ value: 'all', label: 'Tümü', count: stats.total }, 
                      { value: 'pending', label: 'Bekleyen', count: stats.pending },
                      { value: 'approved', label: 'Onaylanan', count: stats.approved },
                      { value: 'rejected', label: 'Reddedilen', count: stats.rejected }].map(status => (
                      <label key={status.value} className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="status"
                            value={status.value}
                            checked={statusFilter === status.value}
                            onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                            className="w-4 h-4 text-indigo-600"
                          />
                          <span className="text-sm font-medium text-gray-700">{status.label}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-500">{status.count}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">Kategori</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value="all">Tüm Kategoriler</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              {/* Author Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">Yazar</label>
                <select
                  value={authorFilter}
                  onChange={(e) => { setAuthorFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value="all">Tüm Yazarlar</option>
                  {authors.map(author => <option key={author} value={author}>{author}</option>)}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">Tarih Aralığı</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setCurrentPage(1); }}
                    className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Başlangıç"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setCurrentPage(1); }}
                    className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Bitiş"
                  />
                </div>
              </div>



              {/* Sort */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">Sıralama</label>
                <div className="space-y-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                  >
                    <option value="date">Tarihe Göre</option>
                    <option value="title">Başlığa Göre</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="w-full px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-sm"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    {sortOrder === 'asc' ? 'Artan' : 'Azalan'}
                  </button>
                </div>
              </div>

              {/* Items Per Page */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">Sayfa Başına</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value={5}>5 yazı</option>
                  <option value={10}>10 yazı</option>
                  <option value={20}>20 yazı</option>
                  <option value={50}>50 yazı</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      
      {/* Enhanced Modal */}
      {viewingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => { setViewingPost(null); setModalTab('preview'); }}>
          <div className="bg-gradient-to-br from-white to-indigo-50 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden transform transition-all duration-300 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Yazı Detayları</h3>
                    <p className="text-sm text-white/80">Görüntüle, düzenle ve yönet</p>
                  </div>
                </div>
                <button onClick={() => { setViewingPost(null); setModalTab('preview'); }} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Tabs & Stats */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalTab('preview')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      modalTab === 'preview' ? 'bg-white text-indigo-600' : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline mr-2" />
                    Önizleme
                  </button>
                  <button
                    onClick={() => { setModalTab('edit'); setEditedPost({ title: viewingPost.title, category: viewingPost.category, excerpt: viewingPost.excerpt }); }}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      modalTab === 'edit' ? 'bg-white text-indigo-600' : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Edit2 className="w-4 h-4 inline mr-2" />
                    Düzenle
                  </button>
                </div>
                
                <div className="flex items-center gap-4 text-white">
                  {viewingPost.likes && viewingPost.likes.length > 0 && (
                    <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm font-semibold">{viewingPost.likes.length}</span>
                    </div>
                  )}
                  {viewingPost.views && viewingPost.views > 0 && (
                    <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                      <EyeIcon className="w-4 h-4" />
                      <span className="text-sm font-semibold">{viewingPost.views}</span>
                    </div>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    viewingPost.status === 'approved' ? 'bg-green-500' : 
                    viewingPost.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}>
                    {viewingPost.status === 'approved' ? 'Onaylanmış' : viewingPost.status === 'rejected' ? 'Reddedilmiş' : 'Bekliyor'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(95vh-220px)] p-6 custom-scrollbar">
              {modalTab === 'preview' ? (
                <>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">{viewingPost.title}</h1>
                  
                  <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-200">
                    {viewingPost.authorPhotoURL && (
                      <img src={viewingPost.authorPhotoURL} alt={viewingPost.authorName} className="w-12 h-12 rounded-full object-cover" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-semibold text-gray-700">{viewingPost.authorName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm text-gray-600">{new Date(viewingPost.createdAt?.toMillis()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-semibold text-indigo-600">{viewingPost.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {viewingPost.excerpt && (
                    <div className="mb-6 p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg">
                      <p className="text-lg text-gray-700 italic">{viewingPost.excerpt}</p>
                    </div>
                  )}
                  
                  <img src={viewingPost.coverImageURL} alt={viewingPost.title} className="w-full h-96 object-cover rounded-2xl mb-6 shadow-lg" />
                  
                  <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: viewingPost.content }}></div>
                  
                  {viewingPost.tags && viewingPost.tags.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-indigo-600" />
                        Etiketler
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {viewingPost.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Başlık</label>
                    <input
                      type="text"
                      value={editedPost.title || ''}
                      onChange={(e) => setEditedPost({ ...editedPost, title: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Kategori</label>
                    <input
                      type="text"
                      value={editedPost.category || ''}
                      onChange={(e) => setEditedPost({ ...editedPost, category: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Özet</label>
                    <textarea
                      value={editedPost.excerpt || ''}
                      onChange={(e) => setEditedPost({ ...editedPost, excerpt: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                    />
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Not:</strong> İçerik düzenleme şu anda desteklenmiyor. Sadece başlık, kategori ve özet düzenlenebilir.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {viewingPost.status !== 'approved' && (
                    <button
                      onClick={() => handleModalStatusUpdate('approved')}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2 font-semibold"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Onayla
                    </button>
                  )}
                  {viewingPost.status !== 'rejected' && (
                    <button
                      onClick={() => handleModalStatusUpdate('rejected')}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2 font-semibold"
                    >
                      <XCircle className="w-4 h-4" />
                      Reddet
                    </button>
                  )}
                  <button
                    onClick={() => { handleDelete(viewingPost.id); setViewingPost(null); }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Sil
                  </button>
                </div>
                
                {modalTab === 'edit' && (
                  <button
                    onClick={handleSaveEdit}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2 font-semibold"
                  >
                    <Save className="w-4 h-4" />
                    Değişiklikleri Kaydet
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Posts List */}
        <div className="flex-1">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Yazılar ({filteredAndSortedPosts.length})
            </h3>
            {selectedPosts.length > 0 && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                {selectedPosts.length} seçili
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Sayfa {currentPage} / {totalPages || 1}
          </p>
        </div>

        {/* Bulk Actions */}
        {paginatedPosts.length > 0 && (
          <div className="mb-6 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-indigo-300 rounded-lg hover:bg-indigo-50 transition-all font-semibold text-xs sm:text-sm text-gray-700 min-h-[40px] touch-manipulation"
                >
                  {selectedPosts.length === paginatedPosts.length ? (
                    <CheckSquare className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-600" />
                  ) : (
                    <Square className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
                  )}
                  <span className="hidden sm:inline">{selectedPosts.length === paginatedPosts.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}</span>
                  <span className="sm:hidden">{selectedPosts.length === paginatedPosts.length ? 'Kaldır' : 'Seç'}</span>
                </button>
                <span className="text-xs sm:text-sm text-gray-600">
                  {selectedPosts.length} / {paginatedPosts.length} yazı seçildi
                </span>
              </div>
              
              {selectedPosts.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <button
                    onClick={() => handleBulkAction('approve')}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm min-h-[40px] touch-manipulation"
                  >
                    <CheckCircle className="w-3 sm:w-4 h-3 sm:h-4" />
                    <span className="hidden sm:inline">Toplu Onayla</span>
                    <span className="sm:hidden">Onayla</span>
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject')}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm min-h-[40px] touch-manipulation"
                  >
                    <XCircle className="w-3 sm:w-4 h-3 sm:h-4" />
                    <span className="hidden sm:inline">Toplu Reddet</span>
                    <span className="sm:hidden">Reddet</span>
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm min-h-[40px] touch-manipulation"
                  >
                    <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
                    <span className="hidden sm:inline">Toplu Sil</span>
                    <span className="sm:hidden">Sil</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {paginatedPosts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Filtre kriterlerine uygun yazı bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedPosts.map(post => (
              <div key={post.id} className={`bg-gradient-to-r from-white to-indigo-50/30 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-2 ${
                selectedPosts.includes(post.id) ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent hover:border-indigo-200'
              }`}>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                  <div className="flex sm:flex-col gap-3 sm:gap-0">
                    <button
                      onClick={() => toggleSelectPost(post.id)}
                      className="p-1 hover:bg-indigo-100 rounded transition-colors"
                    >
                      {selectedPosts.includes(post.id) ? (
                        <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                      ) : (
                        <Square className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                      )}
                    </button>
                    <img src={post.coverImageURL} alt={post.title} className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl shadow-md" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-3 gap-2">
                      <div className="flex-1 min-w-0 w-full">
                        <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-2 break-words">{post.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600 flex-shrink-0" />
                            <span className="font-medium truncate">{post.authorName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600 flex-shrink-0" />
                            <span className="whitespace-nowrap">{new Date(post.createdAt?.toMillis()).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600 flex-shrink-0" />
                            <span className="font-semibold text-indigo-600 truncate">{post.category}</span>
                          </div>
                        </div>
                      </div>
                      
                      <span className={`px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap flex-shrink-0 ${
                        post.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 
                        post.status === 'rejected' ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white' : 
                        'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
                      }`}>
                        {post.status === 'approved' ? 'Onaylanmış' : post.status === 'rejected' ? 'Reddedilmiş' : 'Bekliyor'}
                      </span>
                    </div>
                    
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{post.excerpt}</p>
                    
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                        {post.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-indigo-100 text-indigo-700 px-2 sm:px-3 py-1 rounded-full font-medium">{tag}</span>
                        ))}
                        {post.tags.length > 3 && <span className="text-xs text-gray-500">+{post.tags.length - 3}</span>}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <button
                        onClick={() => setViewingPost(post)}
                        className="flex-1 sm:flex-none px-2 sm:px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 font-semibold text-xs sm:text-sm"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Görüntüle</span>
                      </button>
                      {post.status !== 'approved' && (
                        <button
                          onClick={() => handleStatusUpdate(post.id, 'approved')}
                          className="flex-1 sm:flex-none px-2 sm:px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 font-semibold text-xs sm:text-sm"
                        >
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline">Onayla</span>
                        </button>
                      )}
                      {post.status !== 'rejected' && (
                        <button
                          onClick={() => handleStatusUpdate(post.id, 'rejected')}
                          className="flex-1 sm:flex-none px-2 sm:px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 font-semibold text-xs sm:text-sm"
                        >
                          <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline">Reddet</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="flex-1 sm:flex-none px-2 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 font-semibold text-xs sm:text-sm"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Sil</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{filteredAndSortedPosts.length}</span> sonuçtan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedPosts.length)}</span> arası gösteriliyor
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sayfa:</span>
                <select
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="px-3 py-1 bg-white border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <option key={page} value={page}>{page}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">/ {totalPages}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm"
              >
                «İlk
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                Önceki
              </button>
              
              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                          : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold"
              >
                Sonraki
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm"
              >
                Son»
              </button>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogManagementTab;
