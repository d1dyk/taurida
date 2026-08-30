import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { t } from '../lib/content';

interface FloatingMiniCartProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const FloatingMiniCart: React.FC<FloatingMiniCartProps> = ({ currentView, onNavigate }) => {
  const { selectedProductIds, clearOrder } = useStore();

  if (selectedProductIds.length === 0 || currentView === 'order') {
    return null;
  }

  const articlesPreview = selectedProductIds.map(id => `№${id}`).join(', ');

  return (
    <div className="fixed bottom-8 right-4 sm:right-8 z-50 animate-fade-in pointer-events-auto">
      <div className="glass-card px-6 sm:px-8 py-4 flex items-center gap-4 sm:gap-6 shadow-2xl border gold-border gold-glow">
        <div className="flex flex-col">
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-widest font-bold">
            Выбранные изделия ({selectedProductIds.length})
          </p>
          <p className="text-xs sm:text-sm font-medium text-[#F5F5F5] truncate max-w-[180px] sm:max-w-[240px]">
            {articlesPreview}
          </p>
        </div>

        <div className="h-8 w-[1px] bg-[#2A2A2A]" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('order')}
            className="text-[#C5A059] text-xs uppercase tracking-widest font-bold flex items-center gap-2 hover:translate-x-1 transition-transform cursor-pointer whitespace-nowrap"
          >
            <span>Оформить заявку</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={clearOrder}
            className="p-1.5 text-[#666666] hover:text-white transition-colors cursor-pointer ml-1"
            title="Очистить"
            aria-label="Очистить"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
