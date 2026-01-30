'use client';

import React from 'react';
import { useLanguage } from './LanguageContext';

export default function PixelLanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 font-galmuri11">
      <button
        onClick={() => setLanguage('ko')}
        className={`px-3 py-1 text-[10px] font-bold border-2 transition-all ${
          language === 'ko'
            ? 'bg-indigo-600 text-white border-indigo-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'
        }`}
      >
        KO
      </button>
      <div className="w-1 h-1 bg-white/30" />
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-[10px] font-bold border-2 transition-all ${
          language === 'en'
            ? 'bg-indigo-600 text-white border-indigo-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'
        }`}
      >
        EN
      </button>
    </div>
  );
}
