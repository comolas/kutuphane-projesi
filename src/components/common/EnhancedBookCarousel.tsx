import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs, Autoplay, EffectCoverflow } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Calendar, BookOpen, Star, Heart } from 'lucide-react';
import { Book } from '../../types';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import 'swiper/css/effect-coverflow';

interface EnhancedBookCarouselProps {
  books: Book[];
  onBorrowBook: (book: Book) => void;
  favoriteBookIds?: string[];
  onToggleFavorite?: (bookId: string) => void;
}

const EnhancedBookCarousel: React.FC<EnhancedBookCarouselProps> = ({ books, onBorrowBook, favoriteBookIds = [], onToggleFavorite }) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

  if (books.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-8 text-center border border-white/20">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Henüz Yeni Kitap Eklenmemiş</h3>
        <p className="text-gray-500">Bu hafta yeni eklenen bir kitap yok. Katalogdaki diğer harika eserlere göz atabilirsiniz.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Carousel */}
      <div className="relative">
        <Swiper
          modules={[Navigation, Pagination, Thumbs, Autoplay, EffectCoverflow]}
          effect="coverflow"
          grabCursor={true}
          centeredSlides={true}
          slidesPerView="auto"
          coverflowEffect={{
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          }}
          navigation={{
            nextEl: '.swiper-button-next-custom',
            prevEl: '.swiper-button-prev-custom',
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          loop={books.length > 1}
          className="enhanced-book-carousel"
        >
          {books.map((book) => (
            <SwiperSlide key={book.id} className="!w-auto">
              <div className="group relative bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500 hover:scale-105 mx-4">
                {/* Book Cover - Larger Size */}
                <div className="relative w-80 h-[480px] overflow-hidden">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Favorite Heart Icon */}
                  {onToggleFavorite && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(book.id);
                      }}
                      className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:scale-110 transition-all shadow-lg"
                    >
                      <Heart className={`w-5 h-5 ${favoriteBookIds.includes(book.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                    </button>
                  )}
                  
                  {/* New Badge */}
                  {!onToggleFavorite && (
                    <div className="absolute top-4 right-4 z-10">
                      <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-full shadow-lg animate-pulse">
                        ✨ Yeni
                      </div>
                    </div>
                  )}

                  {/* Rating Badge */}
                  {book.averageRating && book.averageRating > 0 && (
                    <div className="absolute top-4 left-4 z-10">
                      <div className="flex items-center gap-1 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-gray-900">{book.averageRating}</span>
                      </div>
                    </div>
                  )}

                  {/* Hover Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
                    <button
                      onClick={() => onBorrowBook(book)}
                      className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105"
                    >
                      Ödünç Al
                    </button>
                  </div>
                </div>

                {/* Book Info */}
                <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{book.title}</h3>
                  <p className="text-base text-gray-600 mb-3">{book.author}</p>
                  
                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {book.addedDate && new Date((book.addedDate as any).seconds * 1000).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    {book.reviewCount && book.reviewCount > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{book.reviewCount}</span>
                        <span>değerlendirme</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Buttons */}
        <button className="swiper-button-prev-custom absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-xl hover:bg-white hover:scale-110 transition-all duration-300 flex items-center justify-center group">
          <svg className="w-6 h-6 text-gray-800 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button className="swiper-button-next-custom absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-xl hover:bg-white hover:scale-110 transition-all duration-300 flex items-center justify-center group">
          <svg className="w-6 h-6 text-gray-800 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Thumbnail Preview */}
      <div className="relative px-12">
        <Swiper
          onSwiper={setThumbsSwiper}
          modules={[Thumbs]}
          spaceBetween={16}
          slidesPerView={4}
          freeMode={true}
          watchSlidesProgress={true}
          breakpoints={{
            320: {
              slidesPerView: 3,
              spaceBetween: 12,
            },
            640: {
              slidesPerView: 4,
              spaceBetween: 16,
            },
            768: {
              slidesPerView: 5,
              spaceBetween: 16,
            },
            1024: {
              slidesPerView: 6,
              spaceBetween: 20,
            },
          }}
          className="thumbnail-carousel"
        >
          {books.map((book) => (
            <SwiperSlide key={`thumb-${book.id}`}>
              <div className="cursor-pointer group">
                <div className="relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-transparent hover:border-indigo-500">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </div>
                <p className="text-xs text-gray-600 text-center mt-2 line-clamp-1">{book.title}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <style>{`
        .enhanced-book-carousel .swiper-pagination-bullet {
          width: 12px;
          height: 12px;
          background: #6366f1;
          opacity: 0.5;
          transition: all 0.3s;
        }
        
        .enhanced-book-carousel .swiper-pagination-bullet-active {
          opacity: 1;
          width: 32px;
          border-radius: 6px;
          background: linear-gradient(to right, #6366f1, #a855f7);
        }

        .enhanced-book-carousel .swiper-slide {
          transition: all 0.3s;
        }

        .enhanced-book-carousel .swiper-slide-active {
          z-index: 10;
        }

        .thumbnail-carousel .swiper-slide {
          opacity: 0.5;
          transition: opacity 0.3s;
        }

        .thumbnail-carousel .swiper-slide-thumb-active {
          opacity: 1;
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default EnhancedBookCarousel;
