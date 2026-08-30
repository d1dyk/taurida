import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Plus, Check, Eye, X } from 'lucide-react';
import { FurnitureItem } from '../lib/db';
import { t, fmtPrice, getCategoryTitle } from '../lib/content';
import { useStore } from '../store/useStore';

interface CatalogPageProps {
  products: FurnitureItem[];
  initialCategory?: string;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ products, initialCategory = 'all' }) => {
  const { toggleProductInOrder, isProductSelected, openProductModal } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'priceAsc' | 'priceDesc'>('newest');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(500000);

  const categoriesList = [
    { key: 'all', label: t.common.allCategories },
    { key: 'Kuhni', label: t.categories.Kuhni },
    { key: 'Gostinaya', label: t.categories.Gostinaya },
    { key: 'Spalnya', label: t.categories.Spalnya },
    { key: 'Stoly', label: t.categories.Stoly },
    { key: 'Shkafy', label: t.categories.Shkafy },
    { key: 'Stulya', label: t.categories.Stulya },
    { key: 'Prihozhaya', label: t.categories.Prihozhaya },
    { key: 'Other', label: t.categories.Other }
  ];

  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          (item.material && item.material.toLowerCase().includes(query)) ||
          item.id.toString() === query;
        const matchesPrice = item.price <= maxPriceFilter;

        return matchesCategory && matchesSearch && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'priceAsc') return a.price - b.price;
        if (sortBy === 'priceDesc') return b.price - a.price;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [products, selectedCategory, searchQuery, sortBy, maxPriceFilter]);

  return (
    <div className="min-h-screen bg-[#0B0B0B] py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 space-y-10">
        {/* Page Header */}
        <div className="border-b border-[#2A2A2A] pb-8">
          <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.4em] mb-2 block">
            Авторские коллекции TAURIDA ATELIER
          </span>
          <h1 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light">
            Каталог мебели <span className="italic text-[#C5A059]">на заказ</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] mt-2 max-w-2xl font-light">
            Все изделия изготавливаются по индивидуальным размерам с подбором шпона, камня и австрийской фурнитуры.
          </p>
        </div>

        {/* Filters and Controls */}
        <div className="space-y-6">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {categoriesList.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`py-2 px-4 text-xs uppercase tracking-widest font-bold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'gold-gradient text-black shadow-md'
                      : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#C5A059]/40'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search, Sort and Price Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.common.searchPlaceholder}
                className="w-full pl-10 pr-10 py-3 bg-[#111111] border border-[#2A2A2A] text-white text-xs placeholder-[#666666] focus:outline-none focus:border-[#C5A059] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="md:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full py-3 px-3 bg-[#111111] border border-[#2A2A2A] text-xs text-[#A0A0A0] focus:outline-none focus:border-[#C5A059] cursor-pointer"
              >
                <option value="newest">{t.common.sortNewest}</option>
                <option value="priceAsc">{t.common.sortPriceAsc}</option>
                <option value="priceDesc">{t.common.sortPriceDesc}</option>
              </select>
            </div>

            {/* Price Filter range */}
            <div className="md:col-span-3 flex items-center space-x-3 text-xs text-[#A0A0A0] bg-[#111111] px-4 py-2.5 border border-[#2A2A2A]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
              <span className="whitespace-nowrap font-mono text-[11px]">До {maxPriceFilter.toLocaleString('ru-RU')} ₽</span>
              <input
                type="range"
                min="50000"
                max="500000"
                step="10000"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="w-full accent-[#C5A059] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {filteredProducts.map((product) => {
              const inOrder = isProductSelected(product.id);
              const coverImage = product.images?.[0] || '/src/assets/images/hero_luxury_interior_1787434163465.jpg';

              return (
                <div
                  key={product.id}
                  className="bg-[#111111] border border-[#2A2A2A] hover:border-[#C5A059]/40 transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Media */}
                  <div
                    className="relative aspect-[4/3] bg-[#1A1A1A] overflow-hidden cursor-pointer"
                    onClick={() => openProductModal(product)}
                  >
                    <img
                      src={coverImage}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-90 group-hover:brightness-100"
                      loading="lazy"
                    />

                    {/* Article badge */}
                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/80 backdrop-blur-md border border-[#2A2A2A] text-[10px] font-mono text-[#A0A0A0]">
                      Арт. №{product.id}
                    </div>

                    {/* Quick view on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="py-2 px-4 bg-black/90 border border-[#C5A059]/40 text-xs text-[#F5F5F5] font-medium flex items-center space-x-2 backdrop-blur-sm">
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
                      {product.dimensions && (
                        <p className="text-[11px] text-[#666666] mt-1 truncate">
                          {product.dimensions}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#2A2A2A] space-y-3">
                      <div>
                        <span className="text-base font-semibold text-[#F5F5F5] tracking-tight tabular-nums block">
                          {fmtPrice(product.price)}
                        </span>
                        <span className="text-[10px] text-[#666666] uppercase tracking-wider block">
                          от 14 дней на заказ
                        </span>
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
        ) : (
          <div className="text-center py-20 bg-[#111111] border border-[#2A2A2A] p-12 space-y-4">
            <p className="text-sm text-[#A0A0A0]">{t.common.notFound}</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setMaxPriceFilter(500000);
              }}
              className="py-2.5 px-6 gold-gradient text-black text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              {t.common.resetFilters}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
