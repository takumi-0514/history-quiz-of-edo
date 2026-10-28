import React, { useState } from 'react';
import { pushStudyTrackerRecord } from '../services/studyTracker';

interface FlashcardResultScreenProps {
  totalCount: number;
  elapsedSec: number;
  fieldLabel: string;
  isFilteredQuizMode: boolean;
  filteredQuizLabel: string;
  isTrackerConnected: boolean;
  onStartQuiz: () => void;
  onReplayFlashcards: () => void;
  onGoToStart: () => void;
}

export const FlashcardResultScreen: React.FC<FlashcardResultScreenProps> = ({
  totalCount,
  elapsedSec,
  fieldLabel,
  isFilteredQuizMode,
  filteredQuizLabel,
  isTrackerConnected,
  onStartQuiz,
  onReplayFlashcards,
  onGoToStart,
}) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;

  const handleSyncToTracker = async () => {
    if (syncStatus === 'sending' || syncStatus === 'success') return;
    setSyncStatus('sending');

    let modeText = `【暗記カード確認】分野: ${fieldLabel} (${totalCount}枚確認)`;
    if (isFilteredQuizMode) {
      modeText = `【暗記カード絞り込み確認 ${filteredQuizLabel}】(${totalCount}枚確認)`;
    }

    const calcMins = Math.max(1, Math.round(elapsedSec / 60));
    const ok = await pushStudyTrackerRecord(calcMins, elapsedSec, modeText);
    if (ok) {
      setSyncStatus('success');
    } else {
      setSyncStatus('error');
    }
  };

  return (
    <div className="p-6 md:p-8 animate-fade-in">
      <div className="text-center mb-6">
        <div className="text-emerald-600 text-5xl mb-3">
          <i className="fa-solid fa-layer-group"></i>
        </div>
        <h2 className="text-2xl font-bold japanese-font mb-1.5">暗記カード確認完了</h2>
        <p className="text-stone-500 text-xs">
          カードの確認お疲れ様でした！頭に入った年号をクイズで腕試ししてみましょう。
        </p>
      </div>

      <div className="bg-stone-50 rounded-2xl p-5 text-center border border-stone-200 mb-6 max-w-sm mx-auto flex justify-around">
        <div>
          <p className="text-xs text-stone-500 font-bold mb-1">確認したカード</p>
          <p className="text-2xl font-black text-emerald-600">
            <span>{totalCount}</span>
            <span className="text-sm font-normal text-stone-500 ml-1">枚</span>
          </p>
        </div>
        <div className="border-l border-stone-200 pl-4">
          <p className="text-xs text-stone-500 font-bold mb-1">学習時間</p>
          <p className="text-2xl font-black text-amber-800">
            <span>{mins > 0 ? `${mins}分` : ''}{secs}</span>
            <span className="text-sm font-normal text-stone-500 ml-0.5">秒</span>
          </p>
        </div>
      </div>

      {/* Study Tracker 連携記録エリア */}
      {isTrackerConnected && totalCount > 0 && (
        <div className="mb-6 bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200 shadow-sm max-w-sm mx-auto animate-fade-in">
          <h3 className="font-bold text-emerald-900 mb-2 text-xs flex items-center justify-center gap-1.5">
            <i className="fa-solid fa-cloud-arrow-up"></i> 学習記録を送信
          </h3>
          <p className="text-[10px] text-stone-600 mb-3">
            今回の予習時間: {mins}分{secs}秒
          </p>

          {syncStatus !== 'success' ? (
            <button
              type="button"
              disabled={syncStatus === 'sending'}
              onClick={handleSyncToTracker}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 text-sm w-full cursor-pointer"
            >
              {syncStatus === 'sending' ? (
                <>
                  送信中 <i className="fa-solid fa-spinner fa-spin"></i>
                </>
              ) : (
                <>
                  Study Trackerに記録する <i className="fa-solid fa-paper-plane"></i>
                </>
              )}
            </button>
          ) : (
            <p className="text-[10px] text-green-700 font-bold mt-2">
              <i className="fa-solid fa-check-circle"></i> 記録を送信しました！
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 max-w-sm mx-auto">
        <button
          type="button"
          onClick={onStartQuiz}
          className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          <i className="fa-solid fa-circle-play"></i> すぐに修行（クイズ）に挑む
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onReplayFlashcards}
            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer border border-stone-200"
          >
            <i className="fa-solid fa-rotate-left"></i> もう一度見る
          </button>
          <button
            type="button"
            onClick={onGoToStart}
            className="flex-1 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer"
          >
            <i className="fa-solid fa-house"></i> トップに戻る
          </button>
        </div>
      </div>
    </div>
  );
};
