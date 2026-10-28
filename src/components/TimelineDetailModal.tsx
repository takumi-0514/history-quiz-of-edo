import React from 'react';
import { HistoryEvent, StatsMap } from '../types';
import { isItemWeak } from '../utils/quizHelpers';

interface TimelineDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryEvent[];
  type: 'japan' | 'world';
  stats: StatsMap;
}

export const TimelineDetailModal: React.FC<TimelineDetailModalProps> = ({
  isOpen,
  onClose,
  items,
  type,
  stats,
}) => {
  if (!isOpen || items.length === 0) return null;

  const year = items[0].year;

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative text-left">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        <div className="mb-4">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              type === 'japan' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-800'
            }`}
          >
            {type === 'japan' ? '日本史' : '世界史'}
          </span>
          <p className="text-xs text-amber-800 font-mono font-bold mt-2">{year}年</p>
        </div>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {items.map(item => {
            const s = stats[item.id] || { correct: 0, wrong: 0, streak: 0, isWeak: false };
            const weak = isItemWeak(s);
            const streak = typeof s.streak === 'number' ? s.streak : 0;

            let badge = null;
            if (weak) {
              badge = (
                <span
                  className="text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded font-bold"
                  title={`あと${3 - streak}回連続正解で克服`}
                >
                  <i className="fa-solid fa-fire"></i> 苦手 ({streak}/3)
                </span>
              );
            } else if (s.wrong > 0 && (streak >= 3 || s.isWeak === false)) {
              badge = (
                <span className="text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                  <i className="fa-solid fa-crown text-amber-500"></i> 克服済
                </span>
              );
            }

            return (
              <div key={item.id} className="bg-stone-50 border border-stone-200 rounded-xl p-4 relative">
                <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-bold">
                  <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                    <i className="fa-solid fa-square-check"></i> {s.correct}
                  </span>
                  <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                    <i className="fa-solid fa-square-xmark"></i> {s.wrong}
                  </span>
                  {badge}
                </div>
                <h4 className="text-sm font-bold text-stone-900 japanese-font leading-snug mb-1.5 pr-28">
                  {item.event}
                </h4>
                <p className="text-xs md:text-sm text-stone-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-amber-900 hover:bg-amber-950 text-white font-bold py-2 px-5 rounded-lg transition-colors text-xs shadow-sm cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
