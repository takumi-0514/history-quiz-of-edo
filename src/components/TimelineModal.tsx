import React, { useState, useMemo } from 'react';
import { HistoryEvent, StatsMap } from '../types';
import { matchTimelineFilter, isItemWeak } from '../utils/quizHelpers';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  japanDatabase: HistoryEvent[];
  worldDatabase: HistoryEvent[];
  stats: StatsMap;
  onResetStatsRequest: () => void;
  onOpenFilteredQuiz: (filteredEvents: HistoryEvent[], query: string, fieldTab: 'all' | 'japan' | 'world') => void;
  onSelectEventDetail: (items: HistoryEvent[], type: 'japan' | 'world') => void;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({
  isOpen,
  onClose,
  japanDatabase,
  worldDatabase,
  stats,
  onResetStatsRequest,
  onOpenFilteredQuiz,
  onSelectEventDetail,
}) => {
  const [query, setQuery] = useState<string>('');
  const [fieldTab, setFieldTab] = useState<'all' | 'japan' | 'world'>('all');
  // Dropdown collapse state for mobile/desktop (default collapsed for maximum vertical space)
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Filtered lists
  const jpFiltered = useMemo(() => {
    return japanDatabase.filter(item => matchTimelineFilter(item, query, fieldTab, stats));
  }, [japanDatabase, query, fieldTab, stats]);

  const wdFiltered = useMemo(() => {
    return worldDatabase.filter(item => matchTimelineFilter(item, query, fieldTab, stats));
  }, [worldDatabase, query, fieldTab, stats]);

  const allFilteredEvents = useMemo(() => {
    return [...jpFiltered, ...wdFiltered];
  }, [jpFiltered, wdFiltered]);

  // Unique sorted years
  const matchedYears = useMemo(() => {
    const yearSet = new Set<number>();
    jpFiltered.forEach(d => yearSet.add(d.year));
    wdFiltered.forEach(d => yearSet.add(d.year));
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [jpFiltered, wdFiltered]);

  if (!isOpen) return null;

  const highlightText = (text: string) => {
    if (!text || !query.trim()) return text;
    const tokens = query
      .trim()
      .split(/[\s,、　]+/)
      .filter(
        t =>
          t.length > 0 &&
          !/^(\d{1,4})[-〜~](\d{1,4})$/.test(t) &&
          !['日本史', '世界史', '日本', '世界', '苦手', 'ミス'].includes(t)
      );

    if (tokens.length === 0) return text;

    try {
      const regex = new RegExp(`(${tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        tokens.some(t => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch (e) {
      return text;
    }
  };

  const renderCard = (items: HistoryEvent[], type: 'japan' | 'world') => {
    let correctSum = 0;
    let wrongSum = 0;
    let hasWeak = false;

    items.forEach(item => {
      const s = stats[item.id] || { correct: 0, wrong: 0, streak: 0, isWeak: false };
      correctSum += s.correct;
      wrongSum += s.wrong;
      if (isItemWeak(s)) {
        hasWeak = true;
      }
    });

    let borderClass = 'border-stone-200 bg-white';
    if (hasWeak) {
      borderClass = 'border-red-300 bg-red-50/40 ring-1 ring-red-200';
    } else if (correctSum > 0) {
      borderClass = 'border-green-300 bg-green-50/20';
    }

    const rawEventLabel = items.map(it => it.event).join(' ／ ');

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelectEventDetail(items, type);
        }}
        className={`w-full ${borderClass} border rounded-xl p-3 flex flex-col justify-between shadow-xs transition-all hover:scale-[1.03] duration-150 h-32 cursor-pointer select-none`}
      >
        <div className="flex flex-col justify-between h-full">
          <div
            className={`text-[9px] font-bold ${
              type === 'japan' ? 'text-amber-800' : 'text-stone-600'
            } uppercase tracking-wider flex items-center justify-between`}
          >
            <span className="flex items-center gap-1">
              {type === 'japan' ? '● 日本史' : '🗺 世界史'}
              {items.length > 1 && (
                <span className="ml-1 text-[8px] bg-stone-700/80 text-white px-1.5 py-[1px] rounded-full">
                  {items.length}件
                </span>
              )}
              {hasWeak && (
                <span className="text-red-500 ml-0.5" title="苦手（3連続正解で克服）">
                  <i className="fa-solid fa-fire text-[10px]"></i>
                </span>
              )}
            </span>
            <i className="fa-solid fa-arrow-up-right-from-square text-[9px] text-stone-300"></i>
          </div>

          <div
            className="text-xs text-stone-700 font-medium leading-snug break-words h-14 overflow-hidden line-clamp-3 my-1"
            title={rawEventLabel}
          >
            {items.map((it, idx) => (
              <React.Fragment key={it.id}>
                {idx > 0 && ' ／ '}
                {highlightText(it.event)}
              </React.Fragment>
            ))}
          </div>

          <div className="pt-1 border-t border-stone-100 flex justify-between text-[9px] font-bold">
            <span className="text-green-600">
              <i className="fa-solid fa-square-check"></i> {correctSum}
            </span>
            <span className="text-red-500">
              <i className="fa-solid fa-square-xmark"></i> {wrongSum}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const hasActiveQuery = query.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center p-2 sm:p-4 z-40 animate-fade-in">
      <div className="bg-[#fcfbf9] rounded-2xl w-full max-w-5xl h-[92vh] sm:h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* 年表ヘッダー */}
        <div className="bg-amber-900 text-amber-50 p-3 sm:p-4 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold japanese-font flex items-center gap-2">
              <i className="fa-solid fa-chart-column text-amber-300"></i> 歴史年表 (日世対比)
            </h3>
            <p className="text-[10px] text-amber-200 hidden sm:block">
              日本と世界のできごとが西暦年ごとに縦にピタッと揃って並びます（タップで詳細解説表示）
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onResetStatsRequest}
              className="text-[11px] sm:text-xs bg-amber-800 hover:bg-red-800 hover:text-white text-amber-200 py-1.5 px-2.5 sm:px-3 rounded-lg border border-amber-700/60 transition-all flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-trash-can"></i> <span className="hidden sm:inline">記録初期化</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] sm:text-xs bg-amber-950 hover:bg-amber-900 text-white font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              閉じる <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* コントロールエリア（常にコンパクト表示＋ドロップダウンで展開） */}
        <div className="bg-amber-50/90 border-b border-amber-200/80 flex-shrink-0">
          {/* コンパクトバー (常に表示) */}
          <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            {/* 分野タブ */}
            <div className="flex items-center gap-0.5 bg-white p-1 rounded-xl border border-stone-200 shadow-xs text-xs">
              <button
                type="button"
                onClick={() => setFieldTab('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] sm:text-xs ${
                  fieldTab === 'all'
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                すべて
              </button>
              <button
                type="button"
                onClick={() => setFieldTab('japan')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] sm:text-xs flex items-center gap-1 ${
                  fieldTab === 'japan'
                    ? 'bg-amber-900 text-white font-bold shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block"></span> 日本史
              </button>
              <button
                type="button"
                onClick={() => setFieldTab('world')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] sm:text-xs flex items-center gap-1 ${
                  fieldTab === 'world'
                    ? 'bg-amber-900 text-white font-bold shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500 inline-block"></span> 世界史
              </button>
            </div>

            {/* 検索ドロップダウントグルボタン & 絞り込み件数バッジ */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSearchOpen(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                  hasActiveQuery
                    ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-300/50'
                    : isSearchOpen
                    ? 'bg-amber-800 text-white border-amber-800'
                    : 'bg-white hover:bg-amber-100/80 text-stone-700 border-stone-300'
                }`}
              >
                <i className="fa-solid fa-magnifying-glass text-amber-700"></i>
                <span>{hasActiveQuery ? `検索: "${query.substring(0, 8)}..."` : '検索・フィルター'}</span>
                <i className={`fa-solid ${isSearchOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] ml-0.5`}></i>
              </button>

              <button
                type="button"
                disabled={allFilteredEvents.length === 0}
                onClick={() => onOpenFilteredQuiz(allFilteredEvents, query, fieldTab)}
                className="bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold py-1.5 px-3 rounded-xl shadow transition-all flex items-center gap-1.5 text-xs cursor-pointer shrink-0"
              >
                <i className="fa-solid fa-graduation-cap"></i>
                <span className="hidden sm:inline">絞り込みで</span>クイズ
                <span className="bg-amber-950 text-amber-200 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {allFilteredEvents.length}問
                </span>
              </button>
            </div>
          </div>

          {/* ドロップダウン式 検索＆フィルターパネル */}
          {isSearchOpen && (
            <div className="p-3 sm:p-4 border-t border-amber-200/80 bg-amber-50 animate-fade-in space-y-3">
              {/* 検索入力欄 */}
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm"></i>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="キーワード・年号・日本史・世界史で絞り込み (例: 1582, 信長, 宗教改革...)"
                  className="w-full pl-9 pr-9 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 shadow-xs"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 transition-colors cursor-pointer"
                    title="検索をクリア"
                  >
                    <i className="fa-solid fa-circle-xmark text-sm"></i>
                  </button>
                )}
              </div>

              {/* クイック検索プリセット */}
              <div>
                <div className="text-[10px] font-bold text-stone-400 mb-1 flex items-center gap-1">
                  <i className="fa-solid fa-bolt text-amber-600"></i> クイックタグ:
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-stone-600">
                  {['信長', '明治', '宗教改革', '世界大戦', '条約', '1500-1600', '1900-1945'].map(
                    preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuery(preset)}
                        className="whitespace-nowrap px-2.5 py-1 bg-white border border-stone-200 hover:border-amber-700 hover:text-amber-900 rounded-full transition-all cursor-pointer font-mono shadow-xs"
                      >
                        {preset}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setQuery('苦手')}
                    className="whitespace-nowrap px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-full transition-all font-bold cursor-pointer shadow-xs"
                  >
                    <i className="fa-solid fa-triangle-exclamation"></i> 苦手な出来事
                  </button>
                </div>
              </div>

              {/* 検索結果件数 ＆ パネル閉じるボタン */}
              <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 text-xs">
                <div className="text-stone-600 flex items-center gap-1.5 flex-wrap">
                  <span className="text-stone-500 font-medium">結果:</span>
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                    日本史 {jpFiltered.length}件
                  </span>
                  <span className="bg-stone-200 text-stone-800 px-2 py-0.5 rounded font-bold">
                    世界史 {wdFiltered.length}件
                  </span>
                  <span className="text-stone-500 font-mono">
                    (計 {allFilteredEvents.length}件)
                  </span>
                </div>

                <div className="flex gap-2">
                  {hasActiveQuery && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="text-[11px] text-red-600 hover:text-red-800 font-bold underline cursor-pointer"
                    >
                      条件クリア
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="text-[11px] bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    閉じる ▲
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 年表メインスクロールエリア */}
        <div className="flex-grow p-3 sm:p-5 overflow-y-auto space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs flex justify-between items-center text-stone-700 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-800 text-sm">
                <i className="fa-solid fa-circle-info"></i>
              </span>
              <span className="text-[11px] sm:text-xs">
                年表は<strong>横スクロール</strong>可能。カードをタップで<strong>解説</strong>表示。
              </span>
            </div>
            <div className="flex gap-2 font-semibold text-[9px] sm:text-[10px] whitespace-nowrap">
              <span className="text-green-700">
                <i className="fa-solid fa-square-check text-green-600"></i> 正解
              </span>
              <span className="text-red-700">
                <i className="fa-solid fa-square-xmark text-red-500"></i> 不正解
              </span>
            </div>
          </div>

          {/* スクロール年表コンテナ */}
          <div className="timeline-scroll overflow-x-auto pb-4 bg-stone-100/50 border border-stone-200 rounded-xl p-3 sm:p-4 min-h-[340px]">
            {allFilteredEvents.length === 0 ? (
              <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center text-stone-500">
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-2xl mb-3 shadow-inner">
                  <i className="fa-solid fa-magnifying-glass"></i>
                </div>
                <h4 className="font-bold text-stone-800 text-base mb-1.5 japanese-font">
                  該当する出来事が見つかりませんでした
                </h4>
                <p className="text-xs text-stone-500 max-w-sm leading-relaxed mb-4">
                  検索キーワードや年代の範囲を変えてお試しいただくか、「条件クリア」を押してください。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setIsSearchOpen(true);
                  }}
                  className="text-xs bg-amber-900 hover:bg-amber-950 text-white font-bold py-2 px-5 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-rotate-left"></i> 検索条件をクリア
                </button>
              </div>
            ) : (
              <div className="flex gap-3 sm:gap-4 items-stretch select-none pb-2">
                {matchedYears.map(year => {
                  const jpItems = jpFiltered.filter(d => d.year === year);
                  const wdItems = wdFiltered.filter(d => d.year === year);

                  return (
                    <div key={year} className="flex flex-col items-center w-44 sm:w-48 flex-shrink-0 gap-2">
                      {/* 上段：日本史エリア */}
                      <div className="w-full flex flex-col flex-grow justify-end min-h-[128px]">
                        {jpItems.length > 0 ? (
                          renderCard(jpItems, 'japan')
                        ) : (
                          <div className="w-full h-32 border border-dashed border-stone-200 bg-stone-50/20 rounded-xl flex items-center justify-center text-[10px] text-stone-300 font-sans">
                            -
                          </div>
                        )}
                      </div>

                      {/* 中段：中央年号バッジ */}
                      <div className="w-full py-1 bg-amber-900 text-amber-50 rounded-lg text-xs font-bold text-center font-mono shadow-sm border border-amber-800/80 my-1 flex-shrink-0 sticky z-10">
                        {year} 年
                      </div>

                      {/* 下段：世界史エリア */}
                      <div className="w-full flex flex-col flex-grow justify-start min-h-[128px]">
                        {wdItems.length > 0 ? (
                          renderCard(wdItems, 'world')
                        ) : (
                          <div className="w-full h-32 border border-dashed border-stone-200 bg-stone-50/20 rounded-xl flex items-center justify-center text-[10px] text-stone-300 font-sans">
                            -
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
