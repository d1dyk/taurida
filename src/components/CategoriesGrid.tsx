import React from 'react';
import { ArrowRight } from 'lucide-react';
import { t } from '../lib/content';

interface CategoriesGridProps {
  onSelectCategory: (categoryKey: string) => void;
}

interface CategoryCard {
  key: string;
  name: string;
  desc: string;
  priceFrom: string;
  badge?: string;
  image: string;
}

export const CategoriesGrid: React.FC<CategoriesGridProps> = ({ onSelectCategory }) => {
  const categoryCards: CategoryCard[] = [
    {
      key: 'Kuhni',
      name: t.categories.Kuhni,
      desc: 'Влагостойкие PUR-фасады для приморского климата, кварц, Blum Servo-Drive',
      priceFrom: 'от 129 900 ₽',
      badge: 'Premium',
      image: '/src/assets/images/luxury_kitchen_island_1787434176143.jpg'
    },
    {
      key: 'Gostinaya',
      name: t.categories.Gostinaya,
      desc: 'Индивидуальный дизайн TV-зон, стеновые панели из шпона, консоли',
      priceFrom: 'от 89 000 ₽',
      image: '/src/assets/images/hero_luxury_interior_1787434163465.jpg'
    },
    {
      key: 'Spalnya',
      name: t.categories.Spalnya,
      desc: 'Кровати с мягким изголовьем в букле, парящие тумбы, травертин',
      priceFrom: 'от 94 500 ₽',
      badge: 'Exclusive',
      image: '/src/assets/images/luxury_dining_table_1787434199855.jpg'
    },
    {
      key: 'Shkafy',
      name: t.categories.Shkafy,
      desc: 'Гардеробные комнаты, тонированное стекло, встроенная подсветка 2700K',
      priceFrom: 'от 78 000 ₽',
      image: '/src/assets/images/luxury_walkin_closet_1787434187389.jpg'
    },
    {
      key: 'Stoly',
      name: t.categories.Stoly,
      desc: 'Слэбы кавказского ореха, брашированная латунь, гидрофобные масла',
      priceFrom: 'от 65 000 ₽',
      image: '/src/assets/images/luxury_dining_table_1787434199855.jpg'
    },
    {
      key: 'Stulya',
      name: t.categories.Stulya,
      desc: 'Полубарные и обеденные кресла с эргономичной поддержкой и премиум-тканями',
      priceFrom: 'от 28 500 ₽',
      image: '/src/assets/images/luxury_kitchen_island_1787434176143.jpg'
    },
    {
      key: 'Prihozhaya',
      name: t.categories.Prihozhaya,
      desc: 'Входные ансамбли, скрытые обувницы, кожа Nappa, интерьерные зеркала',
      priceFrom: 'от 55 000 ₽',
      image: '/src/assets/images/luxury_walkin_closet_1787434187389.jpg'
    },
    {
      key: 'Other',
      name: 'Все коллекции',
      desc: 'Кабинеты, винные комнаты, мебель для СПА и прибрежных террас',
      priceFrom: '12+ категорий',
      badge: 'Ателье',
      image: '/src/assets/images/hero_luxury_interior_1787434163465.jpg'
    }
  ];

  return (
    <section className="py-20 sm:py-24 bg-[#111111] border-b border-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14">
          <div>
            <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.3em] mb-2 block">
              Направления мануфактуры
            </span>
            <h2 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light">
              Коллекции мебели <span className="italic text-[#C5A059]">на заказ</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#A0A0A0] max-w-md mt-4 md:mt-0 font-light leading-relaxed">
            Каждое изделие проектируется под точные размеры вашего пространства с индивидуальным подбором шпона, камня и фурнитуры.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {categoryCards.map((cat) => (
            <div
              key={cat.key}
              onClick={() => onSelectCategory(cat.key === 'Other' ? 'all' : cat.key)}
              className="flex flex-col group cursor-pointer"
            >
              {/* Image Container */}
              <div className="h-56 bg-[#1A1A1A] border border-[#2A2A2A] group-hover:border-[#C5A059]/60 relative overflow-hidden flex items-center justify-center mb-4 transition-all duration-300">
                <img
                  src={cat.image}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-75 group-hover:brightness-90"
                  loading="lazy"
                />
                <div className="w-full h-full bg-[#0B0B0B]/40 absolute inset-0 group-hover:opacity-20 transition-opacity" />

                {cat.badge && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-[#C5A059] text-black text-[9px] font-bold uppercase tracking-wider shadow-sm">
                    {cat.badge}
                  </div>
                )}

                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 group-hover:text-black group-hover:bg-[#C5A059] transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="serif text-xl text-[#F5F5F5] group-hover:text-[#C5A059] transition-colors mb-1">
                {cat.name}
              </h3>
              <p className="text-[#666666] text-xs mb-2 italic line-clamp-2 leading-relaxed">
                {cat.desc}
              </p>
              <p className="text-[#C5A059] text-sm font-medium">
                {cat.priceFrom}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
