import React, { useState } from 'react';
import { MapPin, Clock, Truck, Award } from 'lucide-react';
import { t } from '../lib/content';
import { SiteSettingsRow } from '../lib/db';

interface CrimeaMapSectionProps {
  settings?: SiteSettingsRow | null;
}

export const CrimeaMapSection: React.FC<CrimeaMapSectionProps> = ({ settings }) => {
  const [selectedCity, setSelectedCity] = useState(t.geography.cities[0]);
  const displayPhone = settings?.phone || t.contacts.phone;
  const displayAddress = settings?.addressSevastopol || 'г. Севастополь, ул. Фиолентовское шоссе, 11Б';

  return (
    <section id="geography-section" className="py-20 sm:py-24 bg-[#111111] border-b border-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.4em] mb-2 block">
            {t.geography.title}
          </span>
          <h2 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light mb-4">
            География сервиса <span className="italic text-[#C5A059]">в Крыму</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#A0A0A0] font-light leading-relaxed">
            Выезд мастера на замер после предварительного обсуждения проекта. Стоимость рассчитывается в зависимости от расстояния от Севастополя.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* City Selector List */}
          <div className="space-y-2 lg:col-span-1">
            {t.geography.cities.map((city) => {
              const isSelected = selectedCity.name === city.name;
              return (
                <div
                  key={city.name}
                  onClick={() => setSelectedCity(city)}
                  className={`p-4 border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#1A1A1A] border-[#C5A059] gold-glow'
                      : 'bg-[#0B0B0B] border-[#2A2A2A] hover:border-[#C5A059]/30'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${isSelected ? 'gold-gradient text-black' : 'bg-[#1A1A1A] text-[#A0A0A0]'}`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-medium ${isSelected ? 'text-[#C5A059]' : 'text-[#F5F5F5]'}`}>
                        {city.name}
                      </h4>
                      <p className="text-[11px] text-[#666666] line-clamp-1">{city.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#A0A0A0] uppercase tracking-wider whitespace-nowrap">
                    {city.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Active Detail Showcase Panel */}
          <div className="lg:col-span-2 glass-card p-8 relative overflow-hidden flex flex-col justify-between space-y-8 border border-[#2A2A2A]">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#2A2A2A]">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#C5A059] font-bold">
                    Регион обслуживания
                  </span>
                  <h3 className="serif text-3xl sm:text-4xl text-[#F5F5F5] font-light mt-1">
                    {selectedCity.name}
                  </h3>
                </div>
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-sm bg-[#1A1A1A] border gold-border text-xs text-[#C5A059]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{selectedCity.time}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-sm bg-[#111111] border border-[#2A2A2A] space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs text-[#666666] uppercase tracking-wider font-semibold">
                    <Truck className="w-4 h-4 text-[#C5A059]" />
                    <span>Служба доставки</span>
                  </div>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed">
                    Специальный гидроборт с мягкими крепежными ремнями и климат-контролем в кузове.
                  </p>
                </div>

                <div className="p-5 rounded-sm bg-[#111111] border border-[#2A2A2A] space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs text-[#666666] uppercase tracking-wider font-semibold">
                    <Award className="w-4 h-4 text-[#C5A059]" />
                    <span>Замер на объекте</span>
                  </div>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed">
                    Высокоточный лазерный замер помещения после предварительного обсуждения проекта.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-sm bg-[#0B0B0B] border border-[#2A2A2A] space-y-2">
                <h5 className="text-xs font-semibold text-[#F5F5F5] uppercase tracking-widest">
                  Охват локаций: {selectedCity.name}
                </h5>
                <p className="text-xs text-[#A0A0A0] leading-relaxed">
                  {selectedCity.desc}. Выезд мастера согласуется после предварительного обсуждения проекта; стоимость рассчитывается от Севастополя.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#2A2A2A] flex flex-col sm:flex-row items-center justify-between text-xs text-[#666666] gap-3">
              <span>Производство и студия: {displayAddress} • Доставка по всему Крыму</span>
              <a
                href={`tel:${displayPhone.replace(/[^\d+]/g, '')}`}
                className="text-[#C5A059] font-medium hover:underline whitespace-nowrap uppercase tracking-wider"
              >
                Обсудить проект: {displayPhone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
