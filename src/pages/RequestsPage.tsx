import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ChevronLeft, Plus, AlertCircle, MessageSquare, Search, Filter, X, SortAsc, SortDesc, ChevronRight, CheckCircle, Tag, ShieldQuestion, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, query, where, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Swal from 'sweetalert2';

interface Request {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: Date;
  userId: string;
  response?: string;
  responseDate?: Date;
}

const requestCategories = ['Kitap Önerisi', 'Teknik Sorun', 'Üyelik Bilgileri', 'Genel Geri Bildirim'];

const RequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState(requestCategories[3]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 3;

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    try {
      const requestsRef = collection(db, 'requests');
      const q = query(requestsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const loadedRequests: Request[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedRequests.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          responseDate: data.responseDate?.toDate()
        } as Request);
      });
      
      setRequests(loadedRequests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error loading requests:', error);
      Swal.fire('Hata!', 'Talepler yüklenirken bir hata oluştu.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const requestsRef = collection(db, 'requests');
      await addDoc(requestsRef, {
        title,
        content,
        priority,
        category,
        status: 'pending',
        createdAt: Timestamp.now(),
        userId: user.uid
      });

      setTitle('');
      setContent('');
      setPriority('medium');
      setCategory(requestCategories[3]);
      setIsModalOpen(false);
      loadRequests();
      Swal.fire('Başarılı!', 'Talebiniz başarıyla oluşturuldu!', 'success');
    } catch (error) {
      console.error('Error creating request:', error);
      Swal.fire('Hata!', 'Talep oluşturulurken bir hata oluştu.', 'error');
    }
  };

  const handleDeleteRequest = async (requestId: string, requestTitle: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: `"${requestTitle}" başlıklı talebinizi geri çekmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, geri çek!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, 'requests', requestId));
          setRequests(prev => prev.filter(req => req.id !== requestId));
          Swal.fire('Başarılı!', 'Talebiniz başarıyla geri çekildi.', 'success');
        } catch (error) {
          console.error('Error deleting request:', error);
          Swal.fire('Hata!', 'Talep geri çekilirken bir hata oluştu.', 'error');
        }
      }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Yüksek';
      case 'medium':
        return 'Orta';
      case 'low':
        return 'Düşük';
      default:
        return priority;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'in-progress':
        return 'İşleniyor';
      case 'pending':
        return 'Bekliyor';
      default:
        return status;
    }
  };

  const filteredRequests = requests
    .filter(request => {
      const matchesSearch = 
        request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || request.status === statusFilter;
      
      const matchesPriority = 
        priorityFilter === 'all' || request.priority === priorityFilter;

      const matchesCategory = 
        categoryFilter === 'all' || request.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'createdAt') {
        return sortOrder === 'asc' 
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime();
      } else {
        const priorityValues = { high: 3, medium: 2, low: 1 };
        const priorityA = priorityValues[a.priority];
        const priorityB = priorityValues[b.priority];
        return sortOrder === 'asc'
          ? priorityA - priorityB
          : priorityB - priorityA;
      }
    });

  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);
  const startIndex = (currentPage - 1) * requestsPerPage;
  const endIndex = startIndex + requestsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy, sortOrder]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Geri Dön
          </button>
        </div>

        <div className="flex justify-center">
          <DotLottieReact
            src="https://lottie.host/3458fdec-366c-432e-b0c1-b4e009eaf9a9/Bwlk7tjRCe.json"
            loop
            autoplay
            style={{ width: '300px', height: '300px' }}
          />
        </div>

        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Taleplerim</h1>
            <p className="mt-2 text-gray-600">
              Kütüphane yönetimine iletmek istediğiniz talepleri buradan yönetebilirsiniz.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Talep
          </button>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 w-fit mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">Toplam Talep</p>
              <p className="text-4xl font-bold text-white">{requests.length}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 w-fit mb-4">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">Bekleyen</p>
              <p className="text-4xl font-bold text-white">{requests.filter(r => r.status === 'pending').length}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 w-fit mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">Tamamlandı</p>
              <p className="text-4xl font-bold text-white">{requests.filter(r => r.status === 'completed').length}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 w-fit mb-4">
                <ShieldQuestion className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">İşleniyor</p>
              <p className="text-4xl font-bold text-white">{requests.filter(r => r.status === 'in-progress').length}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Talep başlığı veya içeriği ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white/80 transition-all shadow-lg"
                />
                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 flex items-center justify-center transition-all shadow-lg font-medium"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filtrele
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durum
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'in-progress' | 'completed')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">Tümü</option>
                    <option value="pending">Bekleyen</option>
                    <option value="in-progress">İşlenen</option>
                    <option value="completed">Tamamlanan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Öncelik
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'low' | 'medium' | 'high')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">Tümü</option>
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">Tümü</option>
                    {requestCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sıralama
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'priority')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="createdAt">Tarih</option>
                    <option value="priority">Öncelik</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sıralama Yönü
                  </label>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                  >
                    {sortOrder === 'asc' ? (
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

        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-8 text-center flex flex-col items-center justify-center min-h-[200px] border border-white/20">
              {requests.length === 0 ? (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Henüz Talebiniz Yok</h3>
                  <p className="text-gray-600 mb-6">Kütüphanemizde görmek istediğiniz bir kitap veya başka bir talebiniz mi var? Bize bildirin!</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Talep Oluştur
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Sonuç Bulunamadı</h3>
                  <p className="text-gray-600">Arama veya filtreleme kriterlerinize uygun bir talep bulunamadı.</p>
                </>
              )}
            </div>
          ) : (
            currentRequests.map((request, index) => (
              <div 
                key={request.id} 
                className="group bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 p-6 border border-white/20"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                    <div className="mt-1 flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                      <span>{request.createdAt.toLocaleDateString()}</span>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md ${
                        request.priority === 'high'
                          ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
                          : request.priority === 'medium'
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white'
                          : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                      }`}>
                        {getPriorityText(request.priority)} Öncelik
                      </span>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md ${
                        request.status === 'completed'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          : request.status === 'in-progress'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                          : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                      }`}>
                        {getStatusText(request.status)}
                      </span>
                      {request.category && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md">
                          <Tag className="w-3 h-3 mr-1.5" />
                          {request.category}
                        </span>
                      )}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <button 
                      onClick={() => handleDeleteRequest(request.id, request.title)}
                      className="flex items-center px-3 py-2 text-sm bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Geri Çek
                    </button>
                  )}
                </div>
                
                <div className="mt-4 text-gray-700">{request.content}</div>
                
                {request.response && (
                  <div className="mt-4 bg-white/50 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-indigo-500 shadow-md">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text">Kütüphane Yönetimi Yanıtı:</div>
                        <div className="mt-1 text-gray-700">{request.response}</div>
                        {request.responseDate && (
                          <div className="mt-2 text-xs text-gray-500">
                            Yanıt Tarihi: {request.responseDate.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/20 text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all shadow-lg font-medium"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Önceki
              </button>

              {generatePageNumbers().map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-3 py-2 text-gray-500">...</span>
                  ) : (
                    <button
                      onClick={() => handlePageChange(page as number)}
                      className={`px-4 py-2.5 rounded-xl border transition-all shadow-lg font-medium ${
                        currentPage === page
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent'
                          : 'bg-white/60 backdrop-blur-xl border-white/20 text-gray-700 hover:bg-white/80'
                      }`}
                    >
                      {page}
                    </button>
                  )}
                </React.Fragment>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/20 text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all shadow-lg font-medium"
              >
                Sonraki
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full border border-white/20">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Yeni Talep Oluştur</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {requestCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Başlık
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İçerik
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={4}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Öncelik
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white/50 border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 transition-all font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
                >
                  Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
