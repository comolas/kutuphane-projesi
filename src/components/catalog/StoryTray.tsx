import React, { useState } from 'react';
import { useCollections } from '../../contexts/CollectionContext';
import { StoryCollection } from '../../types';
import StoryViewer from './StoryViewer'; // Artık import ediliyor

const StoryTray: React.FC = () => {
  const { collections, isLoading } = useCollections();
  const [selectedCollection, setSelectedCollection] = useState<StoryCollection | null>(null);

  const handleStoryClick = (collection: StoryCollection) => {
    setSelectedCollection(collection);
  };

  const handleCloseViewer = () => {
    setSelectedCollection(null);
  };

  if (isLoading) {
    // Yükleniyor İskeleti
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Koleksiyonlar</h2>
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center space-y-2 flex-shrink-0">
              <div className="w-20 h-20 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (collections.length === 0) {
    return null; // Koleksiyon yoksa hiçbir şey render etme
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Koleksiyonlar</h2>
        <div className="flex space-x-8 overflow-x-auto pb-4">
          {collections.map(collection => (
            <div key={collection.id} className="flex flex-col items-center space-y-2 flex-shrink-0 cursor-pointer group" onClick={() => handleStoryClick(collection)}>
              <div className="w-20 h-20 rounded-full bg-gray-300 p-1 ring-2 ring-offset-2 ring-indigo-500 group-hover:ring-indigo-700 transition-all duration-300 flex items-center justify-center">
                <img 
                  src={collection.coverImage} 
                  alt={collection.title} 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 max-w-[80px] text-center truncate">{collection.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gerçek StoryViewer bileşeni burada render ediliyor */}
      {selectedCollection && <StoryViewer collection={selectedCollection} onClose={handleCloseViewer} />}
    </>
  );
};

export default StoryTray;
