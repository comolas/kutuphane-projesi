import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Layers, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import CollectionModal, { StoryCollection } from '../CollectionModal';
import Swal from 'sweetalert2';

const CollectionManagementTab: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collections, setCollections] = useState<StoryCollection[]>([]);
  const [editingCollection, setEditingCollection] = useState<StoryCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'collections'), orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      const collectionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoryCollection));
      setCollections(collectionsData);
    } catch (error) {
      console.error("Error fetching collections: ", error);
      Swal.fire('Hata!', 'Koleksiyonlar getirilirken bir hata oluştu.', 'error');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleAddNew = () => {
    setEditingCollection(null);
    setIsModalOpen(true);
  };

  const handleEdit = (collection: StoryCollection) => {
    setEditingCollection(collection);
    setIsModalOpen(true);
  };

  const handleDelete = async (collectionId: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu koleksiyonu silmek istediğinizden emin misiniz?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'İptal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, 'collections', collectionId));
          setCollections(prev => prev.filter(c => c.id !== collectionId));
          Swal.fire(
            'Silindi!',
            'Koleksiyon başarıyla silindi.',
            'success'
          )
        } catch (error) {
          console.error("Error deleting collection: ", error);
          Swal.fire(
            'Hata!',
            'Koleksiyon silinirken bir hata oluştu.',
            'error'
          )
        }
      }
    });
  };

  const handleSave = (savedCollection: StoryCollection) => {
    if (editingCollection) {
      // Edit
      setCollections(prev => prev.map(c => c.id === savedCollection.id ? savedCollection : c));
    } else {
      // Add
      setCollections(prev => [...prev, savedCollection]);
    }
    // Re-sort the list based on order
    setCollections(prev => [...prev].sort((a, b) => a.order - b.order));
    Swal.fire('Başarılı!', 'Koleksiyon başarıyla kaydedildi.', 'success');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center">
          <Layers className="mr-3 text-indigo-600" />
          Koleksiyon Yönetimi
        </h2>
        <button
          onClick={handleAddNew}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Koleksiyon Ekle
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <p className="text-center p-8">Koleksiyonlar yükleniyor...</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sıra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlık</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Sayısı</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Eylemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {collections.map(collection => (
                <tr key={collection.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{collection.order}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{collection.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {collection.isActive ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        <Eye className="w-4 h-4 mr-1"/> Aktif
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        <EyeOff className="w-4 h-4 mr-1"/> Pasif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{collection.books.length}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(collection)} className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-100">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(collection.id!)} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <CollectionModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSave}
          collectionToEdit={editingCollection}
        />
      )}
    </div>
  );
};

export default CollectionManagementTab;