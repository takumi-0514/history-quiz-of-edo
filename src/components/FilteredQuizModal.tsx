import React, { useState } from 'react';
import { HistoryEvent, QuizMode, SortYearGap } from '../types';

interface FilteredQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredEvents: HistoryEvent[];
  query: string;
  fieldTab: 'all' | 'japan' | 'world';
  onStart: (selectedMode: QuizMode, selectedCount: number | 'all', selectedSortYearGap?: SortYearGap) => void;
}

export const FilteredQuizModal: React.FC<FilteredQuizModalProps> = ({
  isOpen,
  onClose,
  filteredEvents,
  query,
  fieldTab,
  onStart,
}) => {
  const [mode, setMode] = useState<QuizMode>('choice');
  const [count, setCount] = useState<number | 'all'>('all');
  const [sortYearGap, setSortYearGap] = useState<SortYearGap>('medium');

  if (!isOpen) return null;

  let tabLabel = '日本史 & 世界史';
  if (fieldTab === 'japan') tabLabel = '日本史';
  else if (fieldTab === 'world') tabLabel = '世界史';

  const conditionDetails: string[] = [];
  if (query.trim()) {
    conditionDetails.push(`キーワード: 「${query.trim()}」`);
  }
  conditionDetails.push(`分野: ${tabLabel}`);

  const canSort = filteredEvents.length >= 4;
  const can10 = filteredEvents.length >= 10;
  const can5 = filteredEvents.length >= 5;

  const modeBtnClass = (m: QuizMode) =>
    mode === m
      ? 'p-3 border-2 border-amber-800 bg-amber-50 text-amber-900 rounded-xl font-bold flex flex-col items-center gap-1 transition-all shadow-xs cursor-pointer'
      : 'p-3 border-2 border-stone-200 hover:border-amber-700 bg-white text-stone-700 rounded-xl font-bold flex flex-col items-center gap-1 transition-all cursor-pointer';

  return (
    <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative text-left">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
            <i className="fa-solid fa-filter"></i> 絞り込み特訓クイズ
          </div>
          <h3 className="text-lg font-bold text-stone-900 japanese-font">絞り込んだ歴史で挑戦！</h3>
          <div className="text-xs text-stone-700 mt-2 bg-amber-50/80 border border-amber-200 p-3 rounded-xl leading-relaxed">
            <div className="flex items-center justify-between mb-1">
              <span>{conditionDetails.join(' / ')}</span>
              <span className="text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded-full font-mono text-[11px]">
                {filteredEvents.length} 件
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              この条件に一致した歴史の出来事から集中出題します。
            </p>
          </div>
        </div>

        {/* クイズモード選択 */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-700 mb-2">出題形式を選択</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMode('choice')}
              className={modeBtnClass('choice')}
            >
              <i className="fa-solid fa-list-check text-base"></i>
              <span>出来事選択4択</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('input')}
              className={modeBtnClass('input')}
            >
              <i className="fa-solid fa-keyboard text-base"></i>
              <span>年号直接入力</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('flashcard')}
              className={modeBtnClass('flashcard')}
            >
              <i className="fa-solid fa-clone text-base"></i>
              <span>フラッシュカード</span>
            </button>
            <button
              type="button"
              disabled={!canSort}
              onClick={() => setMode('sort')}
              className={`${modeBtnClass('sort')} ${!canSort ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={!canSort ? '並べ替えには最低4件の出来事が必要です' : ''}
            >
              <i className="fa-solid fa-arrow-down-1-9 text-base"></i>
              <span>年代並べ替え</span>
            </button>
          </div>

          {/* 並べ替えの場合の難易度（年代差）選択 */}
          {mode === 'sort' && (
            <div className="mt-3 bg-stone-50 border border-stone-200 p-3 rounded-xl animate-fade-in">
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
                <i className="fa-solid fa-arrows-left-right text-amber-800"></i> 年代差（難易度）
              </label>
              <div className="flex bg-stone-200/60 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setSortYearGap('near')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    sortYearGap === 'near' ? 'bg-amber-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  近い (4〜10年)
                </button>
                <button
                  type="button"
                  onClick={() => setSortYearGap('medium')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    sortYearGap === 'medium' ? 'bg-amber-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  中間 (10〜25年)
                </button>
                <button
                  type="button"
                  onClick={() => setSortYearGap('far')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    sortYearGap === 'far' ? 'bg-amber-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  遠い (25〜50年)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 出題問題数選択 */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-stone-700 mb-2">出題数を選択</label>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setCount('all')}
              className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer ${
                count === 'all'
                  ? 'bg-amber-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              全問 ({filteredEvents.length})
            </button>
            <button
              type="button"
              disabled={!can10}
              onClick={() => setCount(10)}
              className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer ${
                !can10
                  ? 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-400'
                  : count === 10
                  ? 'bg-amber-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              10問
            </button>
            <button
              type="button"
              disabled={!can5}
              onClick={() => setCount(5)}
              className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer ${
                !can5
                  ? 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-400'
                  : count === 5
                  ? 'bg-amber-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              5問
            </button>
          </div>
        </div>

        {/* スタートボタン */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => onStart(mode, count, sortYearGap)}
            className="flex-2 py-2.5 px-6 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            クイズを開始する <i className="fa-solid fa-play"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

