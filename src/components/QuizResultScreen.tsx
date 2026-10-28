import React, { useState } from 'react';
import { IncorrectAnswer } from '../types';
import { pushStudyTrackerRecord } from '../services/studyTracker';

interface QuizResultScreenProps {
  score: number;
  totalQuestions: number;
  modeLabelText: string;
  elapsedSec: number;
  incorrectAnswers: IncorrectAnswer[];
  hasIncorrectQuestions: boolean;
  incorrectCount: number;
  isTrackerConnected: boolean;
  onReviewOnly: () => void;
  onRestartAll: () => void;
  onGoToStart: () => void;
}

export const QuizResultScreen: React.FC<QuizResultScreenProps> = ({
  score,
  totalQuestions,
  modeLabelText,
  elapsedSec,
  incorrectAnswers,
  hasIncorrectQuestions,
  incorrectCount,
  isTrackerConnected,
  onReviewOnly,
  onRestartAll,
  onGoToStart,
}) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;

  const scoreRate = totalQuestions > 0 ? score / totalQuestions : 0;
  let evaluation = '';
  if (scoreRate === 1) {
    evaluation = '👑 歴史グランドマスター！完璧な暗記です！';
  } else if (scoreRate >= 0.8) {
    evaluation = '🌟 素晴らしい！本物の実力が身についています！';
  } else if (scoreRate >= 0.5) {
    evaluation = '🎯 合格点です！あやふやな歴史をタイムラインで復習してみましょう！';
  } else {
    evaluation = '✍️ 伸び代たっぷり！間違えた問題は年表からじっくり復習できますよ。';
  }

  const handleSyncToTracker = async () => {
    if (syncStatus === 'sending' || syncStatus === 'success') return;
    setSyncStatus('sending');

    const quizModeFull = `${modeLabelText} (正解: ${score}/${totalQuestions})`;
    const calcMins = Math.max(1, Math.round(elapsedSec / 60));
    const ok = await pushStudyTrackerRecord(calcMins, elapsedSec, quizModeFull);
    if (ok) {
      setSyncStatus('success');
    } else {
      setSyncStatus('error');
    }
  };

  return (
    <div className="p-6 md:p-8 animate-fade-in">
      <div className="text-center mb-6">
        <div className="text-amber-600 text-5xl mb-3">
          <i className="fa-solid fa-award"></i>
        </div>
        <h2 className="text-2xl font-bold japanese-font mb-1.5">修行結果</h2>
        <p className="text-stone-500 text-xs">{modeLabelText}</p>
      </div>

      {/* スコアサマリー */}
      <div className="bg-stone-50 rounded-2xl p-5 text-center border border-stone-200 mb-6 max-w-sm mx-auto">
        <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-1">正解率</div>
        <div className="text-4xl font-black text-amber-800 mb-1.5">
          <span>{score}</span>
          <span className="text-xl font-normal text-stone-600"> / {totalQuestions}問</span>
        </div>
        <div className="text-stone-700 font-bold text-sm">{evaluation}</div>
      </div>

      {/* 間違えた問題の復習エリア */}
      {incorrectAnswers.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-stone-800 mb-2.5 text-xs md:text-sm flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-red-500"></i> 要復習の歴史
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-stone-200 rounded-xl p-3 bg-white">
            {incorrectAnswers.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs md:text-sm"
              >
                <div className="font-medium text-stone-700 flex items-center gap-1.5">
                  <span className="text-red-500">
                    <i className="fa-solid fa-fire text-xs"></i>
                  </span>
                  <span>{item.question}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-400 font-mono">（入力：{item.wrong}）</span>
                  <i className="fa-solid fa-arrow-right text-stone-400"></i>
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                    {item.correct}
                  </span>
                  <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                    あと3連続正解で克服
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Tracker 連携記録ボタン */}
      {isTrackerConnected && (
        <div className="mb-6 bg-amber-50 rounded-xl p-4 text-center border border-amber-200 shadow-sm max-w-sm mx-auto animate-fade-in">
          <h3 className="font-bold text-amber-900 mb-2 text-xs flex items-center justify-center gap-1.5">
            <i className="fa-solid fa-cloud-arrow-up"></i> 学習記録を送信
          </h3>
          <p className="text-[10px] text-stone-600 mb-3">
            今回の修行時間: {mins}分{secs}秒
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

      {/* アクションボタンエリア */}
      <div className="flex flex-col gap-3 max-w-sm mx-auto">
        {hasIncorrectQuestions && (
          <button
            type="button"
            onClick={onReviewOnly}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow flex items-center justify-center gap-2 text-sm cursor-pointer animate-bounce"
          >
            <i className="fa-solid fa-triangle-exclamation"></i> 間違えた問題のみ ({incorrectCount}問) で再挑戦！
          </button>
        )}

        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onRestartAll}
            className="flex-1 bg-amber-800 hover:bg-amber-900 text-white font-bold py-3 px-4 rounded-xl transition-all shadow flex items-center justify-center gap-1.5 text-sm cursor-pointer"
          >
            <i className="fa-solid fa-arrows-rotate"></i> もう一度全問
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
