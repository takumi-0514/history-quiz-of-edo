import React, { useState, useEffect, useCallback } from 'react';
import { HistoryEvent } from '../types';

interface FlashcardScreenProps {
  questions: HistoryEvent[];
  fcIndex: number;
  onPrevCard: () => void;
  onNextCard: () => void;
  onFinishCards: () => void;
  onEndEarly: () => void;
}

export const FlashcardScreen: React.FC<FlashcardScreenProps> = ({
  questions,
  fcIndex,
  onPrevCard,
  onNextCard,
  onFinishCards,
  onEndEarly,
}) => {
  const [flipped, setFlipped] = useState<boolean>(false);
  const currentCard = questions[fcIndex];
  const isLastCard = fcIndex === questions.length - 1;

  // Reset flip state when card index changes
  useEffect(() => {
    setFlipped(false);
  }, [fcIndex]);

  const handleToggleFlip = () => {
    setFlipped(prev => !prev);
  };

  const handleNext = () => {
    if (isLastCard) {
      onFinishCards();
    } else {
      onNextCard();
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (fcIndex > 0) {
          onPrevCard();
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        handleToggleFlip();
      }
    },
    [fcIndex, isLastCard, handleNext, onPrevCard]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!currentCard) return null;

  const isJapan = currentCard.id.startsWith('jp_');

  return (
    <div className="p-6 md:p-8 flex flex-col h-full min-h-[440px] animate-fade-in">
      {/* 上部ステータス＆終了ボタン */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-700 text-sm">
            カード <span className="text-amber-800 text-base">{fcIndex + 1}</span> / {questions.length}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              isJapan ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'
            }`}
          >
            {isJapan ? '日本史' : '世界史'}
          </span>
        </div>
        <button
          type="button"
          onClick={onEndEarly}
          className="text-stone-400 hover:text-stone-600 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-stone-100"
        >
          <i className="fa-solid fa-xmark"></i> 途中で終了
        </button>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-stone-100 h-1.5 rounded-full mb-6 overflow-hidden">
        <div
          className="bg-emerald-600 h-full transition-all duration-300"
          style={{ width: `${((fcIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* メインカード（タップで反転） */}
      <div className="flex-1 flex flex-col justify-center items-center mb-6">
        <div className="w-full max-w-md" onClick={handleToggleFlip}>
          <div
            className={`transition-all duration-300 w-full min-h-[19rem] cursor-pointer shadow-lg hover:shadow-xl rounded-2xl flex flex-col items-center justify-center p-6 border-4 relative select-none ${
              flipped
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200/50'
                : 'bg-white border-stone-200 hover:border-amber-400'
            }`}
          >
            {/* 表面：出来事 */}
            {!flipped ? (
              <div className="flex flex-col items-center justify-center text-center px-2 py-4">
                <span className="text-xs text-amber-800 font-bold mb-3 tracking-widest uppercase">
                  【 出来事 】
                </span>
                <p className="text-xl md:text-2xl font-bold text-stone-800 leading-relaxed japanese-font">
                  {currentCard.event}
                </p>
                <p className="text-xs text-stone-400 mt-8 flex items-center gap-1.5 animate-pulse absolute bottom-4">
                  <i className="fa-solid fa-hand-pointer"></i> タップして年号・解説を見る
                </p>
              </div>
            ) : (
              /* 裏面：西暦年号 + 詳細解説 */
              <div className="flex flex-col items-center text-center w-full animate-fade-in py-2">
                <span className="text-xs text-amber-800 font-bold tracking-widest uppercase">
                  【 発生年（西暦）】
                </span>
                <p className="text-5xl md:text-6xl font-black text-amber-700 my-2 font-mono">
                  {currentCard.year}
                  <span className="text-xl md:text-2xl font-bold font-serif ml-1">年</span>
                </p>
                <div className="w-full border-t border-amber-200 my-3 pt-3">
                  <p className="text-xs md:text-sm text-stone-700 leading-relaxed max-h-36 overflow-y-auto px-1 text-left">
                    {currentCard.description || '解説はありません。'}
                  </p>
                </div>
                <p className="text-[11px] text-stone-400 flex items-center gap-1">
                  <i className="fa-solid fa-rotate"></i> タップして出来事に戻す
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 下部ナビゲーションボタン（見るだけ：前へ／次へ・完了） */}
      <div className="flex gap-3 max-w-md mx-auto w-full">
        <button
          type="button"
          disabled={fcIndex === 0}
          onClick={onPrevCard}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border ${
            fcIndex === 0
              ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed opacity-50'
              : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300 shadow-sm active:scale-95'
          }`}
        >
          <i className="fa-solid fa-arrow-left"></i> 前のカード
        </button>

        <button
          type="button"
          onClick={handleNext}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-white active:scale-95 ${
            isLastCard
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-amber-700 hover:bg-amber-800'
          }`}
        >
          <span>{isLastCard ? '完了する' : '次のカード'}</span>
          <i className={`fa-solid ${isLastCard ? 'fa-circle-check' : 'fa-arrow-right'}`}></i>
        </button>
      </div>

      <div className="text-center mt-3 text-[11px] text-stone-400">
        キーボード操作: <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded text-[10px]">Space</kbd> 反転 / <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded text-[10px]">➔</kbd> 次へ / <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded text-[10px]">⬅</kbd> 前へ
      </div>
    </div>
  );
};
