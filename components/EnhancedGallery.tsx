import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Play, Pause, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

const EnhancedGallery = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const scrollRef = useRef(null);
  const autoPlayRef = useRef(null);

// Updated gallery items with more diverse content
  const galleryItems = [
    { 
      id: 1,
      src: "/images/hero/mat1.jpg", 
      title: "Yoga & Flow Sessions", 
      desc: "Where ancient practice meets timeless architecture",
      category: "space"
    },
    { 
      id: 2,
      src: "/images/hero/mat2.jpg", 
      title: "Sound Healing", 
      desc: "Sacred acoustics amplify transformation",
      category: "space"
    },
    { 
      id: 4,
      src: "/images/events/2.JPEG", 
      title: "Dynamic Movement", 
      desc: "Expressive arts in sacred spaces",
      category: "yoga"
    },
    { 
      id: 5,
      src: "/images/events/katrina/1.jpg", 
      title: "Workshop Series", 
      desc: "Learning and growing together",
      category: "yoga",
      photographer: "Katrina_born_"
    },
    { 
      id: 6,
      src: "/images/events/katrina/2.jpg", 
      title: "Mindful Practice", 
      desc: "Finding peace in motion",
      category: "yoga",
      photographer: "Katrina_born_"
    },
    { 
      id: 7,
      src: "/images/events/katrina/3.jpg", 
      title: "Group Sessions", 
      desc: "Strength in community",
      category: "yoga",
      photographer: "Katrina_born_"
    },
    { 
      id: 8,
      src: "/images/events/katrina/4.jpg", 
      title: "Personal Journey", 
      desc: "Individual paths to wellness",
      category: "yoga",
      photographer: "Katrina_born_"
    },
    { 
      id: 9,
      src: "/images/events/judo/1.JPG", 
      title: "Judo Training", 
      desc: "Martial arts discipline in our sacred space",
      category: "events"
    },
    { 
      id: 10,
      src: "/images/events/judo/2.JPG", 
      title: "Judo Practice", 
      desc: "Building strength and character through martial arts",
      category: "events"
    },
    { 
      id: 11,
      src: "/images/events/judo/3.JPG", 
      title: "Judo Techniques", 
      desc: "Precision and focus in every movement",
      category: "judo"
    },
    { 
      id: 12,
      src: "/images/events/judo/4.JPG", 
      title: "Judo Community", 
      desc: "Learning respect and discipline together",
      category: "events"
    },
    { 
      id: 13,
      src: "/images/events/judo/5.JPG", 
      title: "Judo Mastery", 
      desc: "The way of gentle force",
      category: "events"
    },
    { 
      id: 15,
      src: "/images/hero/nomats.jpg", 
      title: "Architectural Wonder", 
      desc: "Every corner tells a story of beauty",
      category: "space"
    },
    { 
      id: 16,
      src: "/images/hero/outside3.jpg", 
      title: "Historic Sanctuary", 
      desc: "1905 church transformed for modern wellness",
      category: "space"
    }
  ];

  const [filteredItems, setFilteredItems] = useState(galleryItems);
  const [activeFilter, setActiveFilter] = useState('all');

  const categories = [
    { id: 'all', name: 'All', count: galleryItems.length },
    { id: 'yoga', name: 'Yoga', count: galleryItems.filter(item => item.category === 'yoga').length },
    { id: 'events', name: 'Events', count: galleryItems.filter(item => item.category === 'events').length },
    { id: 'space', name: 'Space', count: galleryItems.filter(item => item.category === 'space' || item.category === 'exterior').length }
  ];

  // Filter functionality
  const handleFilter = (categoryId) => {
    setActiveFilter(categoryId);
    if (categoryId === 'all') {
      setFilteredItems(galleryItems);
    } else if (categoryId === 'architecture') {
      setFilteredItems(galleryItems.filter(item => 
        item.category === 'architecture' || item.category === 'exterior'
      ));
    } else {
      setFilteredItems(galleryItems.filter(item => item.category === categoryId));
    }
    setCurrentIndex(0);
  };

  // Navigation functions
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // Auto-play functionality
  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(goToNext, 4000);
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, filteredItems.length]);

  // Touch/swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrev();
    }
  };

  // Modal functionality
  const openModal = (index) => {
    setCurrentIndex(index);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = '';
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isModalOpen) {
        if (e.key === 'ArrowLeft') goToPrev();
        if (e.key === 'ArrowRight') goToNext();
        if (e.key === 'Escape') closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isModalOpen]);

  return (
    <section className="py-20 bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-16 px-6">
          <span className="inline-flex items-center px-4 py-2 bg-white/10 text-gray-300 text-sm font-semibold rounded-full tracking-wide uppercase mb-6 backdrop-blur-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Our Sacred Space
          </span>
          <h2 className="text-4xl md:text-5xl font-light text-white mb-6">
            Experience the
            <span className="block font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Transformation</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            From intimate meditation circles to dynamic movement workshops, witness how our sacred space adapts to every vision
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12 px-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleFilter(category.id)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                activeFilter === category.id
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>

        {/* Main Gallery */}
        <div className="relative max-w-7xl mx-auto px-6">
          {/* Gallery Controls */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleAutoPlay}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isAutoPlaying
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                {isAutoPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isAutoPlaying ? 'Pause' : 'Auto Play'}
              </button>
              <span className="text-white/70 text-sm">
                {currentIndex + 1} of {filteredItems.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToPrev}
                className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-full backdrop-blur-sm transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToNext}
                className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-full backdrop-blur-sm transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Main Image Display */}
          <div 
            className="relative aspect-[16/9] mb-8 rounded-3xl overflow-hidden shadow-2xl cursor-pointer group"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={() => openModal(currentIndex)}
          >
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === currentIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={item.src}
                  alt={item.desc}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                {/* CAPTION OVERLAY - Hidden on mobile, visible on desktop hover */}
                <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <div className="absolute bottom-8 left-8 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-3xl font-bold mb-2">{item.title}</h3>
                    <p className="text-gray-200 text-lg">{item.desc}</p>
                    {item.photographer && (
                      <p className="text-gray-300 text-sm mt-2">
                        📸 Photo by{' '}
                        <a 
                          href={`https://instagram.com/${item.photographer}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-300 hover:text-blue-200 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          @{item.photographer}
                        </a>
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-2">
                      <ZoomIn size={16} />
                      <span className="text-sm">Click to enlarge</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Navigation Dots */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {filteredItems.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'bg-white w-8'
                      : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-6 scroll-smooth custom-scrollbar"
          >
            {filteredItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => goToSlide(index)}
                className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden transition-all duration-300 ${
                  index === currentIndex
                    ? 'ring-2 ring-white shadow-xl scale-110'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={item.src}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                {index === currentIndex && (
                  <div className="absolute inset-0 bg-white/20"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
            <div className="relative max-w-7xl max-h-full">
              {/* Modal Controls */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={goToPrev}
                  className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-full backdrop-blur-sm"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={goToNext}
                  className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-full backdrop-blur-sm"
                >
                  <ChevronRight size={24} />
                </button>
                <button
                  onClick={closeModal}
                  className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-full backdrop-blur-sm"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Image */}
              <div className="relative">
                <img
                  src={filteredItems[currentIndex]?.src}
                  alt={filteredItems[currentIndex]?.desc}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
                
                {/* Modal Info - Much smaller on mobile */}
                <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-auto bg-black/70 text-white p-2 md:p-4 rounded-lg backdrop-blur-sm md:max-w-md">
                  <h3 className="text-sm md:text-xl font-bold mb-0 md:mb-1 leading-tight">{filteredItems[currentIndex]?.title}</h3>
                  <p className="text-xs md:text-base text-gray-200 leading-snug md:leading-normal">{filteredItems[currentIndex]?.desc}</p>
                  {filteredItems[currentIndex]?.photographer && (
                    <p className="text-gray-300 text-[10px] md:text-sm mt-1 md:mt-2">
                      📸 <a 
                        href={`https://instagram.com/${filteredItems[currentIndex].photographer}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:text-blue-200 underline"
                      >
                        @{filteredItems[currentIndex].photographer}
                      </a>
                    </p>
                  )}
                  <p className="text-gray-400 text-[10px] md:text-sm mt-1 md:mt-2">
                    {currentIndex + 1} of {filteredItems.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.5) rgba(255, 255, 255, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </section>
  );
};

export default EnhancedGallery;