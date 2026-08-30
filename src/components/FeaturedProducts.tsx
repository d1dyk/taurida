import React from 'react';
import { Plus, Check, Eye, ArrowRight } from 'lucide-react';
import { FurnitureItem } from '../lib/db';
import { t, fmtPrice, getCategoryTitle } from '../lib/content';
import { useStore } from '../store/useStore';

interface FeaturedProductsProps {
  products: FurnitureItem[];
  onNavigate: (view: string) => void;
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({ products, onNavigate }) => {
  const { toggleProductInOrder, isProductSelected, openProductModal } = useStore();

  const featured = products.filter(p => p.isFeatured).slice(0, 4);

  return (
    <section className="py-20 sm:py-24 bg-[#0B0B0B] border-b border-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14">
          <div>
            <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.4em] mb-2 block">
              {t.featured.title}
            </span>
            <h2 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light">
              Флагманские <span className="italic text-[#C5A059]">проекты</span>
            </h2>
          </div>

          <button
            onClick={() => onNavigate('catalog')}
            className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-[#C5A059] hover:text-[#DFBE77] transition-colors mt-4 md:mt-0 font-bold group cursor-pointer"
          >
            <span>Весь каталог ({products.length})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {featured.map((product) => {
            const inOrder = isProductSelected(product.id);
            const coverImage = product.images?.[0] || '/src/assets/images/hero_luxury_interior_1787434163465.jpg';

            return (
              <div
                key={product.id}
                className="bg-[#111111] border border-[#2A2A2A] hover:border-[#C5A059]/40 transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Image & Quick Action */}
                <div
                  className="relative aspect-[4/3] bg-[#1A1A1A] overflow-hidden cursor-pointer"
                  onClick={() => openProductModal(product)}
                >
                  <img
                    src={coverImage}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-90 group-hover:brightness-100"
                    loading="lazy"
                  />

                  {/* Article Overlay */}
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-black/80 backdrop-blur-md border border-[#2A2A2A] text-[10px] font-mono text-[#A0A0A0]">
                      Арт. №{product.id}
                    </span>
                  </div>

                  {/* Hover Quick View Button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="py-2 px-4 rounded-sm bg-black/90 border border-[#C5A059]/40 text-xs text-[#F5F5F5] font-medium flex items-center space-x-2 backdrop-blur-sm">
                      <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>{t.common.quickView}</span>
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold block mb-1">
                      {getCategoryTitle(product.category)}
                    </span>
                    <h3
                      onClick={() => openProductModal(product)}
                      className="serif text-xl font-normal text-[#F5F5F5] hover:text-[#C5A059] transition-colors cursor-pointer line-clamp-2"
                    >
                      {product.name}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-[#2A2A2A] space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-base font-semibold text-[#F5F5F5] tracking-tight tabular-nums block">
                          {fmtPrice(product.price)}
                        </span>
                        <span className="text-[10px] text-[#666666] uppercase tracking-wider block">
                          от 14 дней на заказ
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProductInOrder(product);
                      }}
                      className={`w-full py-2.5 px-4 text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                        inOrder
                          ? 'gold-gradient text-black shadow-md'
                          : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F5] hover:border-[#C5A059]/50 hover:text-[#C5A059]'
                      }`}
                    >
                      {inOrder ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t.common.inOrder}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t.common.addToOrder}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
