import React from 'react';
import { GlobalGameType } from '../types';

interface HeaderProps {
  globalGameType: GlobalGameType;
  setGlobalGameType: (type: GlobalGameType) => void;
  isMatchaTheme: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  globalGameType,
  setGlobalGameType,
  isMatchaTheme,
  onOpenSettings,
}) => {
  const headerBg = isMatchaTheme ? 'bg-[#4c6444]' : 'bg-amber-900';
  const tabContainerBg = isMatchaTheme
    ? 'flex bg-[#324535]/60 p-1 rounded-xl border border-[#3e5338]/40 text-[11px] sm:text-xs'
    : 'flex bg-amber-950/60 p-1 rounded-xl border border-amber-800/40 text-[11px] sm:text-xs';

  const activeBtnClass = isMatchaTheme
    ? 'px-2 sm:px-3 py-1 rounded-lg font-bold transition-all bg-[#4c6444] text-white shadow-sm'
    : 'px-2 sm:px-3 py-1 rounded-lg font-bold transition-all bg-amber-900 text-white shadow-sm';

  const inactiveBtnClass = isMatchaTheme
    ? 'px-2 sm:px-3 py-1 rounded-lg font-bold transition-all text-[#cbdcb3] hover:text-white'
    : 'px-2 sm:px-3 py-1 rounded-lg font-bold transition-all text-amber-200 hover:text-white';

  return (
    <header className={`${headerBg} text-amber-50 py-4 px-6 shadow-md transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold japanese-font flex items-center gap-2">
          <i className="fa-solid fa-scroll"></i> 歴史年号・暗記道場
        </h1>
        {/* 大分類モード切り替えコントロール */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <div className={tabContainerBg}>
            <button
              onClick={() => setGlobalGameType('quiz')}
              className={globalGameType === 'quiz' ? activeBtnClass : inactiveBtnClass}
            >
              通常クイズ
            </button>
            <button
              onClick={() => setGlobalGameType('sort_era')}
              className={globalGameType === 'sort_era' ? activeBtnClass : inactiveBtnClass}
            >
              並べ替え・同時期
            </button>
          </div>
          <div className={`text-xs ${isMatchaTheme ? 'bg-[#3d4f36]' : 'bg-amber-800'} px-3 py-1.5 rounded-full font-medium hidden md:block transition-colors`}>
            日本史 ＆ 世界史 ＆ 混合対応
          </div>
          <button
            onClick={onOpenSettings}
            className={`w-8 h-8 flex items-center justify-center rounded-full ${isMatchaTheme ? 'bg-[#324535]/60 hover:bg-[#324535]/80' : 'bg-amber-950/40 hover:bg-amber-950/60'} text-amber-100 hover:text-white transition-colors shadow-sm border border-amber-800/40`}
            title="設定"
          >
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>
      </div>
    </header>
  );
};
