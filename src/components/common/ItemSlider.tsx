import React, { useState, useEffect } from 'react';
import { Event, Survey, Announcement } from '../../types';
import { ChevronLeft, ChevronRight, Calendar, FileText, Megaphone } from 'lucide-react';

interface ItemSliderProps {
  items: (Event | Survey | Announcement)[];
  onOpenItemModal: (item: Event | Survey | Announcement) => void;
  joinedEvents: string[];
  onJoinEvent: (eventId: string) => Promise<void>;
}

const ItemSlider: React.FC<ItemSliderProps> = ({ items = [], onOpenItemModal, joinedEvents, onJoinEvent }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [chunkedItems, setChunkedItems] = useState<(Event | Survey | Announcement)[][]>([]);

  useEffect(() => {
    if (items.length > 0) {
      const chunks = [];
      for (let i = 0; i < items.length; i += 3) {
        chunks.push(items.slice(i, i + 3));
      }
      setChunkedItems(chunks);
    } else {
      setChunkedItems([]);
    }
  }, [items]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % chunkedItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + chunkedItems.length) % chunkedItems.length);
  };

  const handleButtonClick = (item: Event | Survey | Announcement) => {
    if (item.type === 'survey' && 'surveyUrl' in item && item.surveyUrl) {
      window.open(item.surveyUrl, '_blank', 'noopener,noreferrer');
    } else {
      onOpenItemModal(item);
    }
  };

  const getTypeAttributes = (type: 'event' | 'survey' | 'announcement') => {
    switch (type) {
      case 'event':
        return { icon: <Calendar className="w-4 h-4" />, color: 'bg-blue-500', label: 'Etkinlik' };
      case 'survey':
        return { icon: <FileText className="w-4 h-4" />, color: 'bg-green-500', label: 'Anket' };
      case 'announcement':
        return { icon: <Megaphone className="w-4 h-4" />, color: 'bg-yellow-500', label: 'Duyuru' };
    }
  };

  if (chunkedItems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center flex flex-col items-center justify-center h-full min-h-[280px]">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Henüz Etkinlik, Anket veya Duyuru Yok</h3>
        <p className="text-gray-500">Yeni bir etkinlik, anket veya duyuru eklendiğinde burada görünecektir.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {chunkedItems.map((slide, slideIndex) => (
            <div key={slideIndex} className="w-full flex-shrink-0 px-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {slide.map(item => {
                  const { icon, color, label } = getTypeAttributes(item.type);
                  const title = 'name' in item ? item.name : item.title;
                  const description = 'description' in item ? item.description : ('content' in item ? item.content : '');
                  const date = 'date' in item ? new Date(item.date).toLocaleDateString() : null;

                  return (
                    <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
                      <div className="relative">
                        <img
                          src={item.coverImage || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23e2e8f0'/%3E%3Ctext x='50%' y='50%' font-family='Arial' font-size='20' fill='%23a0aec0' dominant-baseline='middle' text-anchor='middle'%3E${title}%3C/text%3E%3C/svg%3E`}
                          alt={title}
                          className="w-full h-80 object-cover"
                        />
                        <div className={`absolute top-2 right-2 flex items-center px-2 py-1 ${color} text-white rounded-full text-xs font-semibold`}>
                          {icon}
                          <span className="ml-1">{label}</span>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col justify-between flex-grow">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{title}</h3>
                          {date && <p className="text-sm text-gray-600 mb-2">{date}</p>}
                          <p className="text-sm text-gray-700 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{description}</p>
                        </div>
                        {item.type === 'event' ? (
                          <button
                            onClick={() => onJoinEvent(item.id)}
                            className={`mt-4 w-full px-4 py-2 rounded-lg transition-colors ${
                              joinedEvents.includes(item.id)
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                            disabled={joinedEvents.includes(item.id)}
                          >
                            {joinedEvents.includes(item.id) ? 'Katıldın' : 'Katıl'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleButtonClick(item)}
                            className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            {item.type === 'survey' && 'Ankete Git'}
                            {item.type === 'announcement' && 'Oku'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {chunkedItems.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute top-1/2 -left-4 transform -translate-y-1/2 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute top-1/2 -right-4 transform -translate-y-1/2 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </>
      )}
    </div>
  );
};

export default ItemSlider;