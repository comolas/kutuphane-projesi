import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Plus, Search, Edit, Trash2, Star, Upload, Users, Award, Calendar, Grid, List } from 'lucide-react';
import AuthorModal from '../AuthorModal';
import BulkAddAuthorModal from '../BulkAddAuthorModal';
import { Author } from '../../../types';
import Swal from 'sweetalert2';

const AuthorManagementTab: React.FC = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [authorToEdit, setAuthorToEdit] = useState<Author | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'birthDate'>('name');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'regular'>('all');
  const itemsPerPage = 10;

  const fetchAuthors = async () => {
    setLoading(true);
    try {
      const authorsCollection = collection(db, 'authors');
      const authorSnapshot = await getDocs(authorsCollection);
      const authorsList = authorSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Author));
      setAuthors(authorsList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Yazarlar çekilirken hata:", error);
      Swal.fire('Hata!', 'Yazarlar çekilirken bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const thisMonthAuthors = authors.filter(author => {
      if (!author.monthlyFeaturedDate) return false;
      const date = author.monthlyFeaturedDate instanceof Date ? author.monthlyFeaturedDate : author.monthlyFeaturedDate.toDate();
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const featuredAuthor = authors.find(a => a.featured);

    return {
      total: authors.length,
      featured: featuredAuthor?.name || 'Seçilmedi',
      thisMonth: thisMonthAuthors.length
    };
  }, [authors]);

  useEffect(() => {
    fetchAuthors();
  }, []);

  const filteredAuthors = useMemo(() => {
    let filtered = authors.filter(author => 
      author.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (featuredFilter === 'featured') {
      filtered = filtered.filter(a => a.featured);
    } else if (featuredFilter === 'regular') {
      filtered = filtered.filter(a => !a.featured);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.birthDate.localeCompare(b.birthDate);
      }
    });

    return filtered;
  }, [authors, searchTerm, featuredFilter, sortBy]);

  const paginatedAuthors = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredAuthors.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredAuthors, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAuthors.length / itemsPerPage);

  const handleOpenModal = (author: Author | null) => {
    setAuthorToEdit(author);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setAuthorToEdit(null);
    setIsModalOpen(false);
  };

  const handleSaveAuthor = async (authorData: Omit<Author, 'id'> & { id?: string }) => {
    try {
      if (authorData.id) {
        const authorRef = doc(db, 'authors', authorData.id);
        const { id, ...dataToUpdate } = authorData;
        await updateDoc(authorRef, dataToUpdate);
        Swal.fire('Başarılı!', 'Yazar başarıyla güncellendi.', 'success');
      } else {
        await addDoc(collection(db, 'authors'), { ...authorData, featured: false });
        Swal.fire('Başarılı!', 'Yazar başarıyla eklendi.', 'success');
      }
      handleCloseModal();
      fetchAuthors();
    } catch (error) {
      console.error("Yazar kaydedilirken hata:", error);
      Swal.fire('Hata!', 'Yazar kaydedilemedi.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu yazarı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'İptal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, 'authors', id));
          fetchAuthors();
          Swal.fire(
            'Silindi!',
            'Yazar başarıyla silindi.',
            'success'
          )
        } catch (error) {
          console.error("Yazar silinirken hata:", error);
          Swal.fire(
            'Hata!',
            'Yazar silinemedi.',
            'error'
          )
        }
      }
    });
  };

  const handleSetFeatured = async (authorId: string) => {
    const author = authors.find(a => a.id === authorId);
    if (!author) return;

    Swal.fire({
      title: `Ayın Yazarı: ${author.name}`,
      text: `Bu yazarı ayın yazarı olarak ayarlamak istediğinizden emin misiniz?`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Evet, ayarla!',
      cancelButtonText: 'İptal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const batch = writeBatch(db);
        let currentFeaturedId: string | null = null;

        authors.forEach(author => {
          if (author.featured) {
            currentFeaturedId = author.id;
          }
        });

        if (currentFeaturedId) {
          if (currentFeaturedId === authorId) {
            Swal.fire('Uyarı', 'Bu yazar zaten ayın yazarı olarak ayarlı.', 'warning');
            return;
          }
          const oldFeaturedRef = doc(db, "authors", currentFeaturedId);
          batch.update(oldFeaturedRef, { featured: false });
        }

        const newFeaturedRef = doc(db, "authors", authorId);
        batch.update(newFeaturedRef, { featured: true, monthlyFeaturedDate: new Date() });

        try {
          await batch.commit();
          fetchAuthors();
          Swal.fire('Başarılı!', 'Ayın yazarı başarıyla güncellendi.', 'success');
        } catch (error) {
          console.error("Ayın yazarı ayarlanırken hata:", error);
          Swal.fire('Hata!', 'Ayın yazarı ayarlanamadı.', 'error');
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="bg-gray-200 p-3 rounded-xl w-14 h-14"></div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 border-l-4 border-l-indigo-500 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Toplam Yazar</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-xl">
                  <Users className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 border-l-4 border-l-yellow-500 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ayın Yazarı</p>
                  <p className="text-lg font-bold text-gray-900 truncate">{stats.featured}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-xl">
                  <Award className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 border-l-4 border-l-green-500 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Bu Ay Eklenen</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.thisMonth}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtreler</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Yazar ara..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/60 backdrop-blur-xl border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm text-sm"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sıralama</label>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={sortBy === 'name'}
                    onChange={() => setSortBy('name')}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">İsme Göre</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={sortBy === 'birthDate'}
                    onChange={() => setSortBy('birthDate')}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Doğum Tarihine Göre</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={featuredFilter === 'all'}
                    onChange={() => setFeaturedFilter('all')}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Tümü</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={featuredFilter === 'featured'}
                    onChange={() => setFeaturedFilter('featured')}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Ayın Yazarı</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={featuredFilter === 'regular'}
                    onChange={() => setFeaturedFilter('regular')}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Normal</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Yazar Yönetimi
          </h2>
          <div className="flex items-center space-x-2">
            <div className="flex bg-white/60 backdrop-blur-xl rounded-xl p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
            </div>
            <button onClick={() => setIsBulkModalOpen(true)} className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Toplu Yazar Ekle
            </button>
            <button onClick={() => handleOpenModal(null)} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Yeni Yazar Ekle
            </button>
            </div>
          </div>

          {viewMode === 'table' ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Görsel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yazar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doğum Tarihi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ölüm Tarihi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biyografi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-gray-200">
                {loading ? (
                  <>
                    {[1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <div className="w-5 h-5 bg-gray-200 rounded"></div>
                            <div className="w-5 h-5 bg-gray-200 rounded"></div>
                            <div className="w-5 h-5 bg-gray-200 rounded"></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (paginatedAuthors.map(author => (
                  <tr key={author.id} className={`hover:bg-white/80 transition-colors ${author.featured ? 'bg-gradient-to-r from-yellow-50 to-amber-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white shadow-md">
                        <img src={author.image} alt={author.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                        {author.featured && (
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 to-amber-500/30 flex items-center justify-center">
                            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500 drop-shadow-lg" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        {author.name}
                        {author.featured && (
                          <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-semibold rounded-full shadow-md">
                            Ayın Yazarı
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{author.birthDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{author.deathDate}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 line-clamp-2">{author.biography}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button onClick={() => handleSetFeatured(author.id)} className="text-yellow-600 hover:text-yellow-900 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed" title="Ayın Yazarı Yap" disabled={author.featured}>
                        <Star className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleOpenModal(author)} className="text-indigo-600 hover:text-indigo-900 hover:scale-110 transition-transform" title="Düzenle">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(author.id)} className="text-red-600 hover:text-red-900 hover:scale-110 transition-transform" title="Sil">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden animate-pulse">
                    <div className="h-64 bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                      <div className="flex justify-end space-x-2">
                        <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
                        <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
                        <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (paginatedAuthors.map(author => (
              <div key={author.id} className={`bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-300 ${author.featured ? 'ring-2 ring-yellow-500' : ''}`}>
                <div className="relative h-64 overflow-hidden">
                  <img src={author.image} alt={author.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                  {author.featured && (
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center shadow-lg animate-pulse">
                      <Star className="w-4 h-4 mr-1 fill-white" />
                      Ayın Yazarı
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{author.name}</h3>
                  <div className="text-sm text-gray-600 mb-3 space-y-1">
                    <p>🎂 {author.birthDate}</p>
                    {author.deathDate && <p>🕊️ {author.deathDate}</p>}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3 mb-4">{author.biography}</p>
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => handleSetFeatured(author.id)} className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 hover:scale-110 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Ayın Yazarı Yap" disabled={author.featured}>
                      <Star className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleOpenModal(author)} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 hover:scale-110 hover:shadow-md transition-all" title="Düzenle">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(author.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 hover:scale-110 hover:shadow-md transition-all" title="Sil">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )))}
          </div>
          )}

          <div className="mt-6 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-700">
                Toplam {filteredAuthors.length} yazar | Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white/60 backdrop-blur-xl border border-gray-200 rounded-xl hover:bg-white/80 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white/60 backdrop-blur-xl border border-gray-200 rounded-xl hover:bg-white/80 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      <AuthorModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveAuthor}
        authorToEdit={authorToEdit}
      />
      <BulkAddAuthorModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={fetchAuthors}
      />
    </div>
  );
};

export default AuthorManagementTab;