import React, { useState } from 'react';
import { X, Plus, Check, Play, ArrowRight, ShieldCheck, Ruler, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { t, fmtPrice, getCategoryTitle } from '../lib/content';

interface ProductModalProps {
  onNavigate: (view: string, params?: any) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ onNavigate }) => {
  const { activeModalProduct, closeProductModal, isProductSelected, toggleProductInOrder, addToOrder } = useStore();
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  if (!activeModalProduct) return null;

  const inOrder = isProductSelected(activeModalProduct.id);
  const images = activeModalProduct.images && activeModalProduct.images.length > 0
    ? activeModalProduct.images
    : ['/src/assets/images/hero_luxury_interior_1787434163465.jpg'];

  const currentMediaUrl = images[activeMediaIndex] || images[0];
  const hasVideo = activeModalProduct.videos && activeModalProduct.videos.length > 0;

  const handleCheckoutDirect = () => {
    addToOrder(activeModalProduct);
    closeProductModal();
    onNavigate('order', { productIds: activeModalProduct.id.toString() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={closeProductModal}
    >
      <div
        className="relative w-full max-w-5xl bg-[#111111] border border-[#C5A059]/30 overflow-hidden shadow-2xl my-auto gold-glow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeProductModal}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/70 hover:bg-black text-[#A0A0A0] hover:text-white border border-[#2A2A2A] flex items-center justify-center transition-colors cursor-pointer"
          aria-label={t.common.close}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[85vh] overflow-y-auto">
          {/* Media Column (Gallery & Video) */}
          <div className="lg:col-span-7 bg-[#0B0B0B] flex flex-col justify-between p-4 sm:p-6 space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden bg-black border border-[#2A2A2A] flex items-center justify-center">
              {showVideo && hasVideo ? (
                <video
                  src={activeModalProduct.videos[0]}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={currentMediaUrl}
                  alt={activeModalProduct.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                />
              )}

              {/* Article Badge */}
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/90 backdrop-blur-md border border-[#2A2A2A] text-[10px] font-mono text-[#C5A059] uppercase tracking-wider">
                Арт. №{activeModalProduct.id}
              </div>
            </div>

            {/* Thumbnail selector */}
            <div className="flex items-center space-x-3 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setShowVideo(false);
                    setActiveMediaIndex(idx);
                  }}
                  className={`relative w-16 h-16 overflow-hidden shrink-0 border transition-all cursor-pointer ${
                    !showVideo && activeMediaIndex === idx
                      ? 'border-[#C5A059] scale-105'
                      : 'border-[#2A2A2A] opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}

              {hasVideo && (
                <button
                  onClick={() => setShowVideo(true)}
                  className={`w-16 h-16 bg-[#1A1A1A] shrink-0 border flex flex-col items-center justify-center text-xs transition-all cursor-pointer ${
                    showVideo
                      ? 'border-[#C5A059] text-[#C5A059] scale-105'
                      : 'border-[#2A2A2A] text-[#A0A0A0] hover:text-white'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span className="text-[9px] mt-1 uppercase tracking-wider">Видео</span>
                </button>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-[#111111]">
            <div className="space-y-4">
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-bold block mb-1">
                  {getCategoryTitle(activeModalProduct.category)}
                </span>
                <h2 className="serif text-2xl sm:text-3xl text-[#F5F5F5] font-light leading-snug">
                  {activeModalProduct.name}
                </h2>
              </div>

              <div className="py-4 border-y border-[#2A2A2A] flex items-baseline justify-between">
                <div>
                  <span className="text-2xl sm:text-3xl font-semibold text-[#F5F5F5] tabular-nums tracking-tight block">
                    {fmtPrice(activeModalProduct.price)}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[#666666]">
                    Индивидуальное изготовление от 14 дней
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest">
                  Описание и особенности
                </h4>
                <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
                  {activeModalProduct.description}
                </p>
              </div>

              {/* Specifications */}
              <div className="space-y-3 pt-2">
                {activeModalProduct.dimensions && (
                  <div className="flex items-start space-x-2.5 text-xs">
                    <Ruler className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[#666666] block text-[10px] uppercase tracking-wider">Габариты:</span>
                      <span className="text-[#F5F5F5]">{activeModalProduct.dimensions}</span>
                    </div>
                  </div>
                )}

                {activeModalProduct.material && (
                  <div className="flex items-start space-x-2.5 text-xs">
                    <Sparkles className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[#666666] block text-[10px] uppercase tracking-wider">Материалы:</span>
                      <span className="text-[#F5F5F5]">{activeModalProduct.material}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2.5 text-xs text-[#666666] pt-1">
                  <ShieldCheck className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>Австрия Blum / Hettich • Влагостойкая PUR-кромка • Эко-МДФ</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#2A2A2A] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => toggleProductInOrder(activeModalProduct)}
                  className={`py-3.5 px-4 text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    inOrder
                      ? 'gold-gradient text-black shadow-md'
                      : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F5] hover:border-[#C5A059]/40 hover:text-[#C5A059]'
                  }`}
                >
                  {inOrder ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t.common.inOrder}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{t.common.addToOrder}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCheckoutDirect}
                  className="py-3.5 px-4 gold-gradient hover:brightness-110 text-black font-bold text-xs uppercase tracking-widest transition-all duration-200 flex items-center justify-center space-x-1.5 shadow-md gold-glow cursor-pointer whitespace-nowrap"
                >
                  <span>Заказать проект</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
