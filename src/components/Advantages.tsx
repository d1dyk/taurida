import React from 'react';
import { Factory, Ruler, Droplets, ShieldCheck } from 'lucide-react';
import { t } from '../lib/content';

export const Advantages: React.FC = () => {
  const icons = [
    <Factory className="w-5 h-5 text-[#C5A059]" key="1" />,
    <Ruler className="w-5 h-5 text-[#C5A059]" key="2" />,
    <Droplets className="w-5 h-5 text-[#C5A059]" key="3" />,
    <ShieldCheck className="w-5 h-5 text-[#C5A059]" key="4" />
  ];

  return (
    <section id="advantages-section" className="py-20 sm:py-24 bg-[#0B0B0B] border-b border-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.4em] mb-3 block">
            {t.advantages.title}
          </span>
          <h2 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light">
            Преимущества <span className="italic text-[#C5A059]">мануфактуры</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.advantages.items.map((item, idx) => (
            <div
              key={item.id}
              className="bg-[#111111] p-8 border border-[#2A2A2A] hover:border-[#C5A059]/40 transition-all duration-300 relative flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-sm bg-[#1A1A1A] border border-[#2A2A2A] group-hover:border-[#C5A059]/40 flex items-center justify-center mb-6 transition-colors">
                  {icons[idx]}
                </div>

                <h3 className="serif text-xl font-normal text-[#F5F5F5] mb-3 group-hover:text-[#C5A059] transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-[#A0A0A0] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-[#2A2A2A] flex items-center justify-between text-[10px] uppercase tracking-widest text-[#666666]">
                <span>Стандарт №0{item.id}</span>
                <span className="text-[#C5A059]">Крым 2026</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
