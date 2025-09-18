import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Plus, Search, Edit, Trash2, Star, Upload } from 'lucide-react';
import AuthorModal from '../AuthorModal';
import BulkAddAuthorModal from '../BulkAddAuthorModal';

interface Author {
  id: string;
  name: string;
  biography: string;
  image: string;
  featured?: boolean;
}

const AuthorManagementTab: React.FC = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [authorToEdit, setAuthorToEdit] = useState<Author | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const filteredAuthors = useMemo(() => {
    return authors.filter(author => 
      author.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [authors, searchTerm]);

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
      } else {
        await addDoc(collection(db, 'authors'), { ...authorData, featured: false });
      }
      handleCloseModal();
      fetchAuthors();
    } catch (error) {
      console.error("Yazar kaydedilirken hata:", error);
      alert("Hata: Yazar kaydedilemedi.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bu yazarı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      try {
        await deleteDoc(doc(db, 'authors', id));
        fetchAuthors();
      } catch (error) {
        console.error("Yazar silinirken hata:", error);
        alert("Hata: Yazar silinemedi.");
      }
    }
  };

  const handleSetFeatured = async (authorId: string) => {
    const batch = writeBatch(db);
    let currentFeaturedId: string | null = null;

    authors.forEach(author => {
      if (author.featured) {
        currentFeaturedId = author.id;
      }
    });

    if (currentFeaturedId) {
      if (currentFeaturedId === authorId) {
        alert("Bu yazar zaten ayın yazarı olarak ayarlı.");
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
      alert("Ayın yazarı başarıyla güncellendi.");
    } catch (error) {
      console.error("Ayın yazarı ayarlanırken hata:", error);
      alert("Hata: Ayın yazarı ayarlanamadı.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Yazar Yönetimi
        </h2>
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsBulkModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Toplu Yazar Ekle
          </button>
          <button onClick={() => handleOpenModal(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Yeni Yazar Ekle
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Yazar adıyla ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Görsel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yazar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biyografi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Yükleniyor...</td></tr>
            ) : (paginatedAuthors.map(author => (
              <tr key={author.id} className={`${author.featured ? 'bg-yellow-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <img src={author.image} alt={author.name} className="w-12 h-12 rounded-full object-cover" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                  {author.featured && <Star className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />}
                  {author.name}
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-700 line-clamp-2">{author.biography}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button onClick={() => handleSetFeatured(author.id)} className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed" title="Ayın Yazarı Yap" disabled={author.featured}>
                    <Star className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleOpenModal(author)} className="text-indigo-600 hover:text-indigo-900" title="Düzenle">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(author.id)} className="text-red-600 hover:text-red-900" title="Sil">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

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
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Önceki
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sonraki
          </button>
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