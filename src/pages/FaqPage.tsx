import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { FaqItem } from '../lib/db';
import { t } from '../lib/content';

interface FaqPageProps {
  faq: FaqItem[];
  onNavigate: (view: string) => void;
}

export const FaqPage: React.FC<FaqPageProps> = ({ faq, onNavigate }) => {
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openIds, setOpenIds] = useState<number[]>([1, 2]);

  const sectionsList = [
    { key: 'all', label: 'Все вопросы' },
    { key: 'general', label: t.faq.sections.general },
    { key: 'materials', label: t.faq.sections.materials },
    { key: 'delivery', label: t.faq.sections.delivery },
    { key: 'payment', label: t.faq.sections.payment }
  ];

  const filteredFaq = useMemo(() => {
    return faq.filter((item) => {
      const matchesSection = selectedSection === 'all' || item.section === selectedSection;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
      return matchesSection && matchesSearch;
    });
  }, [faq, selectedSection, searchQuery]);

  const toggleItem = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-[0.4em] text-[#C5A059] font-bold block">
            База знаний и консультации
          </span>
          <h1 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light">
            {t.faq.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] font-light">
            {t.faq.subtitle}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xl mx-auto">
          <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по вопросам (климат, замер, Blum, оплата)..."
            className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-[#2A2A2A] text-white text-xs placeholder-[#666666] focus:outline-none focus:border-[#C5A059] transition-colors"
          />
        </div>

        {/* Section Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {sectionsList.map((sec) => (
            <button
              key={sec.key}
              onClick={() => setSelectedSection(sec.key)}
              className={`py-2.5 px-4 sm:px-5 text-xs uppercase tracking-widest font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSection === sec.key
                  ? 'gold-gradient text-black shadow-md'
                  : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#C5A059]/40'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {filteredFaq.map((item) => {
            const isOpen = openIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="bg-[#111111] border border-[#2A2A2A] hover:border-[#C5A059]/30 transition-all duration-200"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full p-6 text-left flex items-center justify-between space-x-4 cursor-pointer"
                >
                  <span className="serif text-lg sm:text-xl text-[#F5F5F5] font-normal">
                    {item.question}
                  </span>
                  <span className="p-1.5 bg-[#1A1A1A] text-[#C5A059] border border-[#2A2A2A] shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-[#A0A0A0] leading-relaxed border-t border-[#2A2A2A] pt-4 font-light">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}

          {filteredFaq.length === 0 && (
            <div className="bg-[#111111] border border-[#2A2A2A] p-12 text-center text-xs text-[#666666]">
              По вашему запросу вопросов не найдено. Напишите нам для консультации.
            </div>
          )}
        </div>

        {/* Question Still Unanswered Box */}
        <div className="bg-[#111111] p-8 border border-[#2A2A2A] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="serif text-xl text-[#F5F5F5] font-light">
              Остались вопросы по проекту?
            </h4>
            <p className="text-xs text-[#666666] font-light">
              Мы ответим на любые вопросы по материалам, планировке, расчету сметы и замеру.
            </p>
          </div>
          <button
            onClick={() => onNavigate('order')}
            className="py-3 px-6 gold-gradient hover:brightness-110 text-black font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer"
          >
            Задать вопрос
          </button>
        </div>
      </div>
    </div>
  );
};
