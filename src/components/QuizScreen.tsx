import React, { useState, useEffect, useCallback } from 'react';
import { HistoryEvent, QuizMode, SameEraPair, StatSaveResult, IncorrectAnswer } from '../types';
import { saveStats, shuffle } from '../utils/quizHelpers';

interface QuizScreenProps {
  currentQuestions: any[];
  questionIndex: number;
  score: number;
  settingsMode: QuizMode;
  isWeakOnlyMode: boolean;
  isReviewMode: boolean;
  isFilteredQuizMode: boolean;
  filteredQuizLabel: string;
  isMatchaTheme: boolean;
  activeDatabase: HistoryEvent[];
  japanDatabase: HistoryEvent[];
  worldDatabase: HistoryEvent[];
  onAnswerSubmitted: (
    isCorrect: boolean,
    questionObj: any,
    playerAnswerStr: string,
    correctAnswerStr: string,
    statResult: StatSaveResult
  ) => void;
  onNextQuestion: () => void;
  onConfirmExit: () => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({
  currentQuestions,
  questionIndex,
  score,
  settingsMode,
  isWeakOnlyMode,
  isReviewMode,
  isFilteredQuizMode,
  filteredQuizLabel,
  isMatchaTheme,
  activeDatabase,
  japanDatabase,
  worldDatabase,
  onAnswerSubmitted,
  onNextQuestion,
  onConfirmExit,
}) => {
  const currentQ = currentQuestions[questionIndex];

  // State for input mode
  const [currentInput, setCurrentInput] = useState<string>('');

  // State for choice mode
  const [choices, setChoices] = useState<HistoryEvent[]>([]);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);

  // State for same_era mode
  const [sameEraData, setSameEraData] = useState<{
    targetEventText: string;
    correctEvent: HistoryEvent;
    shuffledChoices: HistoryEvent[];
  } | null>(null);

  // State for sort mode
  const [sortDisplayCards, setSortDisplayCards] = useState<HistoryEvent[]>([]);
  const [sortCorrectCards, setSortCorrectCards] = useState<HistoryEvent[]>([]);
  const [selectedSortIndex, setSelectedSortIndex] = useState<number | null>(null);

  // Answer status
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    title: string;
    textMain: string;
    statResult?: StatSaveResult | null;
    descriptions?: { event: HistoryEvent }[];
  } | null>(null);

  // Prepare current question
  useEffect(() => {
    setHasAnswered(false);
    setAnswerFeedback(null);
    setCurrentInput('');
    setSelectedChoiceIdx(null);
    setSelectedSortIndex(null);

    if (!currentQ) return;

    if (settingsMode === 'sort') {
      const correctCards = [...(currentQ as HistoryEvent[])].sort((a, b) => a.year - b.year);
      let shuffled = shuffle(correctCards);
      while (shuffled.every((val, idx) => val.id === correctCards[idx].id) && correctCards.length > 1) {
        shuffled = shuffle(correctCards);
      }
      setSortCorrectCards(correctCards);
      setSortDisplayCards(shuffled);
    } else if (settingsMode === 'same_era') {
      const pair = currentQ as SameEraPair;
      const isAskJapanToWorld = Math.random() > 0.5;
      let targetText = '';
      let correct: HistoryEvent;
      let decoySourceDb: HistoryEvent[] = [];

      if (isAskJapanToWorld) {
        targetText = `日本史の出来事『${pair.jp.event}』`;
        correct = pair.wd;
        decoySourceDb = worldDatabase;
      } else {
        targetText = `世界史の出来事『${pair.wd.event}』`;
        correct = pair.jp;
        decoySourceDb = japanDatabase;
      }

      const validDecoys = decoySourceDb.filter(item => {
        return item.id !== correct.id && Math.abs(item.year - pair.year) > 15;
      });
      const dummyChoices = shuffle(validDecoys).slice(0, 3);
      const chList = shuffle([correct, ...dummyChoices]);

      setSameEraData({
        targetEventText: targetText,
        correctEvent: correct,
        shuffledChoices: chList,
      });
    } else if (settingsMode === 'choice') {
      const eventItem = currentQ as HistoryEvent;
      const dbIndex = activeDatabase.findIndex(item => item.id === eventItem.id);

      const candidates = activeDatabase
        .map((item, idx) => {
          if (item.id === eventItem.id) return null;
          if (item.year === eventItem.year) return null;

          let tagScore = 0;
          if (item.tags && eventItem.tags) {
            item.tags.forEach(t => {
              if (eventItem.tags.includes(t)) tagScore += 10;
            });
          }

          const isSameType = (item.id.startsWith('jp_') === eventItem.id.startsWith('jp_'));
          if (isSameType) tagScore += 5;

          const distance = Math.abs(idx - dbIndex);
          const distanceScore = 1 / (distance + 1);

          return { item, score: tagScore + distanceScore };
        })
        .filter((c): c is { item: HistoryEvent; score: number } => c !== null);

      candidates.sort((a, b) => b.score - a.score);
      const dummyChoices = candidates.slice(0, 3).map(c => c.item);

      if (dummyChoices.length < 3) {
        const fallbackPool = shuffle([...japanDatabase, ...worldDatabase]);
        for (const fbItem of fallbackPool) {
          if (
            fbItem.id !== eventItem.id &&
            fbItem.year !== eventItem.year &&
            !dummyChoices.some(d => d.id === fbItem.id)
          ) {
            dummyChoices.push(fbItem);
          }
          if (dummyChoices.length === 3) break;
        }
      }

      setChoices(shuffle([eventItem, ...dummyChoices]));
    }
  }, [questionIndex, settingsMode, currentQ, activeDatabase, japanDatabase, worldDatabase]);

  // Keypad handling for input mode
  const handlePressKey = (key: string) => {
    if (hasAnswered) return;
    if (key === 'Backspace') {
      setCurrentInput(prev => prev.slice(0, -1));
    } else if (key.match(/^[0-9]$/) && currentInput.length < 4) {
      setCurrentInput(prev => prev + key);
    }
  };

  const handleSubmitInputAnswer = () => {
    if (currentInput.length !== 4 || hasAnswered) return;
    setHasAnswered(true);

    const eventItem = currentQ as HistoryEvent;
    const playerYear = parseInt(currentInput, 10);
    const actualYear = eventItem.year;
    const isCorrect = (playerYear === actualYear);

    const statResult = saveStats(eventItem.id, isCorrect);

    let textMain = '';
    let title = '';
    if (isCorrect) {
      title = '大正解！';
      textMain = `「${eventItem.event}」が起こったのは、まさに【 ${actualYear}年 】です！すばらしい！`;
    } else {
      title = `不正解（正解：${actualYear}年）`;
      const difference = Math.abs(playerYear - actualYear);
      let diffComment = difference <= 3
        ? `惜しい！あと ${difference} 年のズレでした。`
        : difference <= 10
        ? `かなり近い時代のできごとです（ズレ：${difference} 年）。`
        : `時代のズレは ${difference} 年です。`;
      textMain = `${diffComment} 「${eventItem.event}」が起こったのは正しくは 【 ${actualYear}年 】 です。解説を読んで覚え直そう！`;
    }

    setAnswerFeedback({
      isCorrect,
      title,
      textMain,
      statResult,
    });

    onAnswerSubmitted(
      isCorrect,
      eventItem,
      `${playerYear}年`,
      `${actualYear}年`,
      statResult
    );
  };

  const handleSelectChoice = (idx: number) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    setSelectedChoiceIdx(idx);

    if (settingsMode === 'same_era' && sameEraData) {
      const selected = sameEraData.shuffledChoices[idx];
      const isCorrect = selected.id === sameEraData.correctEvent.id;
      const pair = currentQ as SameEraPair;

      const resJp = saveStats(pair.jp.id, isCorrect);
      const resWd = saveStats(pair.wd.id, isCorrect);
      const statResult = (!isCorrect || resJp.newlyOvercome || resWd.newlyOvercome)
        ? (resJp.newlyOvercome ? resJp : resWd)
        : resJp;

      let title = isCorrect ? '大正解！' : '不正解です';
      let textMain = isCorrect
        ? `その通り！【 ${pair.year}年頃 】に双方がほぼ同時期に起こりました！歴史がつながりましたね。`
        : `正しくは「${sameEraData.correctEvent.event}」でした。同時期の日本と世界のつながりを確認しよう。`;

      setAnswerFeedback({
        isCorrect,
        title,
        textMain,
        statResult,
      });

      onAnswerSubmitted(
        isCorrect,
        pair,
        selected.event,
        sameEraData.correctEvent.event,
        statResult
      );
    } else if (settingsMode === 'choice') {
      const selected = choices[idx];
      const eventItem = currentQ as HistoryEvent;
      const isCorrect = selected.id === eventItem.id;
      const statResult = saveStats(eventItem.id, isCorrect);

      let title = isCorrect ? '大正解！' : '不正解です';
      let textMain = isCorrect
        ? `「${eventItem.event}」が起こったのは、まさに【 ${eventItem.year}年 】です！すばらしい！`
        : `「${selected.event}」ではなく、正しくは「${eventItem.event}」が起こったのは 【 ${eventItem.year}年 】 でした。解説をチェックしてみよう！`;

      setAnswerFeedback({
        isCorrect,
        title,
        textMain,
        statResult,
      });

      onAnswerSubmitted(
        isCorrect,
        eventItem,
        selected.event,
        eventItem.event,
        statResult
      );
    }
  };

  const handleSelectSortCard = (idx: number) => {
    if (hasAnswered) return;
    if (selectedSortIndex === null) {
      setSelectedSortIndex(idx);
    } else {
      if (selectedSortIndex !== idx) {
        const next = [...sortDisplayCards];
        const temp = next[selectedSortIndex];
        next[selectedSortIndex] = next[idx];
        next[idx] = temp;
        setSortDisplayCards(next);
      }
      setSelectedSortIndex(null);
    }
  };

  const handleSubmitSortAnswer = () => {
    if (hasAnswered) return;
    setHasAnswered(true);

    const isAllCorrect = sortDisplayCards.every((val, idx) => val.id === sortCorrectCards[idx].id);

    let newlyOvercomeCount = 0;
    sortDisplayCards.forEach((card, idx) => {
      const isWrongPlace = (card.id !== sortCorrectCards[idx].id);
      const res = saveStats(card.id, !isWrongPlace);
      if (res.newlyOvercome) newlyOvercomeCount++;
    });

    let title = '';
    let textMain = '';
    if (isAllCorrect) {
      title = 'お見事！完璧に一致しています！';
      textMain = 'すべての歴史のできごとを正しい時系列に並べ替えることができました！素晴らしい暗記力です！';
    } else {
      title = '残念！並べ替えミスがあります';
      textMain = '正しい年代の順番は以下の通りです：';
    }

    setAnswerFeedback({
      isCorrect: isAllCorrect,
      title,
      textMain,
      descriptions: sortCorrectCards.map(c => ({ event: c })),
    });

    const wrongCards = sortDisplayCards.filter((card, idx) => card.id !== sortCorrectCards[idx].id);
    const wrongNames = wrongCards.map(c => `「${c.event.substring(0, 8)}…」`).join(', ');

    onAnswerSubmitted(
      isAllCorrect,
      sortCorrectCards,
      sortDisplayCards.map(c => `${c.year}年`).join(' ➔ '),
      sortCorrectCards.map(c => `${c.year}年`).join(' ➔ '),
      {
        wasWeak: false,
        isWeak: !isAllCorrect,
        streak: isAllCorrect ? 1 : 0,
        newlyOvercome: newlyOvercomeCount > 0,
      }
    );
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (hasAnswered) {
        if (e.key === 'Enter') {
          e.preventDefault();
          onNextQuestion();
        }
        return;
      }

      if (settingsMode === 'input') {
        if (e.key.match(/^[0-9]$/)) {
          handlePressKey(e.key);
        } else if (e.key === 'Backspace') {
          handlePressKey('Backspace');
        } else if (e.key === 'Enter') {
          if (currentInput.length === 4) {
            handleSubmitInputAnswer();
          }
        }
      } else if (settingsMode === 'choice' || settingsMode === 'same_era') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          handleSelectChoice(idx);
        }
      }
    },
    [hasAnswered, settingsMode, currentInput, onNextQuestion, handleSelectChoice, handlePressKey]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const progressPercent = ((questionIndex + 1) / currentQuestions.length) * 100;

  let modeBadgeText = isReviewMode
    ? '苦手復習'
    : isWeakOnlyMode
    ? '苦手克服'
    : isFilteredQuizMode
    ? '絞り込み特訓'
    : '通常修行';

  if (settingsMode === 'sort') modeBadgeText += ' (並べ替え)';
  else if (settingsMode === 'same_era') modeBadgeText += ' (同時期対比)';

  const modeBadgeClass = isReviewMode || isWeakOnlyMode
    ? 'text-[10px] md:text-xs bg-red-600 text-white font-bold px-2 py-1 rounded'
    : isMatchaTheme
    ? 'text-[10px] md:text-xs bg-[#e2edd5] text-[#354931] font-bold px-2 py-1 rounded'
    : 'text-[10px] md:text-xs bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded';

  const progressBarColor = isReviewMode || isWeakOnlyMode
    ? 'bg-red-600'
    : isMatchaTheme
    ? 'bg-[#4c6444]'
    : 'bg-amber-600';

  const isJapanItem = (currentQ && currentQ.id) ? currentQ.id.startsWith('jp_') : false;

  return (
    <div className="p-5 md:p-6 animate-fade-in">
      {/* 中断ボタンとモード案内 */}
      <div className="flex justify-between items-center mb-3">
        <button
          type="button"
          onClick={onConfirmExit}
          className="text-xs md:text-sm font-medium text-stone-500 hover:text-red-600 transition-colors bg-stone-100 hover:bg-red-50 py-1.5 px-3 rounded-lg flex items-center gap-1 border border-stone-200 cursor-pointer"
        >
          <i className="fa-solid fa-house"></i> 中断して戻る
        </button>
        <div className={modeBadgeClass}>{modeBadgeText}</div>
      </div>

      {/* ステータスバー */}
      <div className="flex justify-between items-center mb-4 text-xs md:text-sm">
        <div className="text-stone-500 font-medium">
          問題:{' '}
          <span className="text-amber-800 font-bold text-base">
            {questionIndex + 1}
          </span>{' '}
          / <span>{currentQuestions.length}</span>
        </div>
        <div className="text-stone-500 font-medium flex items-center gap-1">
          現在の正解数:{' '}
          <span className="text-green-600 font-bold text-base">{score}</span>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-stone-100 h-1.5 rounded-full mb-6 overflow-hidden">
        <div
          className={`${progressBarColor} h-full transition-all duration-300`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 問題文ボックス（sort以外で表示） */}
      {settingsMode !== 'sort' && (
        <div className="mb-5 text-center min-h-[90px] flex flex-col justify-center bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
          <div className="text-xs font-semibold text-amber-800 mb-1.5 tracking-wider">
            {settingsMode === 'same_era' ? (
              <span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-800 text-white mr-1.5">
                  同時期対比
                </span>
                【{(currentQ as SameEraPair)?.year}年頃】に起きた出来事
              </span>
            ) : settingsMode === 'choice' ? (
              <span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                    isJapanItem ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'
                  }`}
                >
                  {isJapanItem ? '日本史' : '世界史'}
                </span>
                この年に起こった（開始された）出来事はどれ？
              </span>
            ) : (
              <span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                    isJapanItem ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'
                  }`}
                >
                  {isJapanItem ? '日本史' : '世界史'}
                </span>
                この出来事が起こった年（西暦）は？
              </span>
            )}
          </div>
          <div className="text-lg md:text-xl font-bold text-stone-900 leading-normal japanese-font">
            {settingsMode === 'same_era' && sameEraData ? (
              <div>
                {sameEraData.targetEventText} が起きたのと<br className="hidden sm:inline" />
                <span className="text-amber-800 font-bold">同じ時期（同じ年）に起きた出来事</span>はどれ？
              </div>
            ) : settingsMode === 'choice' ? (
              <div>
                <span className="text-3xl font-bold font-mono text-amber-800">
                  {(currentQ as HistoryEvent)?.year}
                </span>{' '}
                年
              </div>
            ) : (
              <div>「{(currentQ as HistoryEvent)?.event}」</div>
            )}
          </div>
        </div>
      )}

      {/* A. 年号直接入力エリア */}
      {settingsMode === 'input' && (
        <div>
          <div className="flex flex-col items-center mb-5">
            <div className="flex items-center gap-1.5 mb-2">
              {[0, 1, 2, 3].map(i => {
                const char = currentInput[i] || '';
                let boxClass = 'w-12 h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold text-stone-800 transition-all ';
                if (hasAnswered && answerFeedback) {
                  boxClass += answerFeedback.isCorrect
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-red-400 bg-red-50 text-red-700';
                } else if (char) {
                  boxClass += 'border-amber-600 bg-amber-50/50';
                } else {
                  boxClass += 'border-stone-300 bg-stone-50';
                }
                return (
                  <div key={i} className={boxClass}>
                    {char}
                  </div>
                );
              })}
              <span className="text-stone-600 font-bold text-lg ml-1">年</span>
            </div>
            <div className="text-xs text-stone-400">
              数字キーをタッチ、またはキーボードから4桁入力してください
            </div>
          </div>

          {/* 画面キーパッド */}
          <div className="grid grid-cols-3 gap-2 mb-5 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                disabled={hasAnswered}
                onClick={() => handlePressKey(num)}
                className="py-3 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 disabled:opacity-50 rounded-lg font-bold text-lg text-stone-700 transition-colors cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={hasAnswered}
              onClick={() => handlePressKey('Backspace')}
              className="py-3 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center cursor-pointer"
            >
              <i className="fa-solid fa-delete-left text-lg"></i>
            </button>
            <button
              type="button"
              disabled={hasAnswered}
              onClick={() => handlePressKey('0')}
              className="py-3 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 disabled:opacity-50 rounded-lg font-bold text-lg text-stone-700 transition-colors cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              disabled={hasAnswered || currentInput.length !== 4}
              onClick={handleSubmitInputAnswer}
              className={`py-3 rounded-lg font-bold text-sm transition-all text-white cursor-pointer ${
                currentInput.length === 4 && !hasAnswered
                  ? 'bg-amber-800 hover:bg-amber-900 shadow-md'
                  : 'bg-amber-700/50 opacity-50 cursor-not-allowed'
              }`}
            >
              判定する
            </button>
          </div>
        </div>
      )}

      {/* B. 4択選択エリア（通常の4択 & 同時期クイズ） */}
      {(settingsMode === 'choice' || settingsMode === 'same_era') && (
        <div className="space-y-3 mb-5 max-w-lg mx-auto">
          {(settingsMode === 'same_era' ? sameEraData?.shuffledChoices : choices)?.map((choiceItem, idx) => {
            const isChoiceJapan = choiceItem.id.startsWith('jp_');
            const targetCorrectId = settingsMode === 'same_era'
              ? sameEraData?.correctEvent.id
              : (currentQ as HistoryEvent)?.id;
            const isTargetCorrect = choiceItem.id === targetCorrectId;
            const isSelected = selectedChoiceIdx === idx;

            let btnClass = 'w-full p-3.5 text-left border-2 rounded-xl font-medium text-stone-700 transition-all duration-150 flex items-center justify-between group ';
            if (hasAnswered) {
              if (isTargetCorrect) {
                btnClass += 'border-green-500 bg-green-50 text-green-800 cursor-default';
              } else if (isSelected && !isTargetCorrect) {
                btnClass += 'border-red-400 bg-red-50 text-red-800 cursor-default';
              } else {
                btnClass += 'border-stone-200 bg-white opacity-60 cursor-default';
              }
            } else {
              btnClass += 'border-stone-200 hover:border-amber-700 hover:bg-amber-50 cursor-pointer';
            }

            return (
              <button
                key={choiceItem.id}
                type="button"
                disabled={hasAnswered}
                onClick={() => handleSelectChoice(idx)}
                className={btnClass}
              >
                <span className="text-sm md:text-base leading-snug flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-1 ${
                      isChoiceJapan ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {isChoiceJapan ? '日本史' : '世界史'}
                  </span>
                  <span>{choiceItem.event}</span>
                </span>
                <span className="text-stone-300 group-hover:text-amber-700 transition-colors ml-2">
                  <i className="fa-solid fa-angle-right"></i>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* C. 並べ替えエリア */}
      {settingsMode === 'sort' && (
        <div className="space-y-3 mb-5 max-w-lg mx-auto">
          <div className="text-xs text-stone-500 mb-2 text-center flex items-center justify-center gap-1">
            <i className="fa-solid fa-circle-info text-[#4c6444]"></i>
            タップして選択し、別の位置のカードをタップして並び替えます
          </div>

          <div className="space-y-2">
            {sortDisplayCards.map((card, idx) => {
              const isSelected = selectedSortIndex === idx;
              const isJapan = card.id.startsWith('jp_');
              const isPlaceCorrect = hasAnswered && card.id === sortCorrectCards[idx]?.id;

              let cardClass = 'p-4 border-2 rounded-xl transition-all duration-150 flex items-center justify-between ';
              if (hasAnswered) {
                cardClass += isPlaceCorrect
                  ? 'border-green-300 bg-green-50/20'
                  : 'border-red-200 bg-red-50/20';
              } else if (isSelected) {
                cardClass += 'border-emerald-600 bg-emerald-50 shadow-md ring-2 ring-emerald-500/25 scale-[1.01] cursor-pointer';
              } else {
                cardClass += 'border-stone-200 bg-white hover:border-emerald-500 cursor-pointer';
              }

              return (
                <div
                  key={card.id}
                  onClick={() => handleSelectSortCard(idx)}
                  className={cardClass}
                >
                  <div className="flex items-center gap-2 pr-3 overflow-hidden">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                        isJapan ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'
                      }`}
                    >
                      {isJapan ? '日本史' : '世界史'}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-stone-800 truncate" title={card.event}>
                      {card.event}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasAnswered && (
                      <div className="flex items-center gap-1.5 font-bold font-mono">
                        <span className="text-xs text-[#354931] bg-[#e2edd5] px-2 py-0.5 rounded">
                          {card.year}年
                        </span>
                        {isPlaceCorrect ? (
                          <span className="text-green-600 text-sm">
                            <i className="fa-solid fa-circle-check"></i>
                          </span>
                        ) : (
                          <span className="text-red-500 text-sm">
                            <i className="fa-solid fa-circle-xmark"></i>
                          </span>
                        )}
                      </div>
                    )}
                    <i className="fa-solid fa-sort text-stone-300 text-sm"></i>
                  </div>
                </div>
              );
            })}
          </div>

          {!hasAnswered && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleSubmitSortAnswer}
                className="w-full sm:w-2/3 bg-[#4c6444] hover:bg-[#3d4f36] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md cursor-pointer"
              >
                これで並びを判定する <i className="fa-solid fa-circle-check ml-1"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 結果フィードバック（回答後に表示） */}
      {hasAnswered && answerFeedback && (
        <div
          className={`rounded-xl p-4 mb-4 flex flex-col gap-3 transition-all animate-fade-in ${
            answerFeedback.isCorrect
              ? 'bg-green-50 border border-green-200 text-green-900'
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl mt-0.5">
              {answerFeedback.isCorrect ? (
                <i className="fa-solid fa-circle-check text-green-600"></i>
              ) : (
                <i className="fa-solid fa-circle-xmark text-red-500"></i>
              )}
            </span>
            <div className="flex-1">
              <h4 className="font-bold text-base mb-0.5">{answerFeedback.title}</h4>
              <div className="text-xs md:text-sm text-stone-700 leading-relaxed font-semibold">
                {answerFeedback.textMain}
              </div>

              {/* 苦手克服状態バッジ */}
              {answerFeedback.statResult?.newlyOvercome && (
                <div className="mt-2.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 rounded-lg px-3 py-2 flex items-center gap-2">
                  <i className="fa-solid fa-crown text-amber-500 text-sm"></i>
                  <span>【苦手克服達成！🎉】3回連続正解を達成し、この出来事の苦手を克服しました！</span>
                </div>
              )}
              {answerFeedback.statResult?.isWeak && !answerFeedback.statResult?.newlyOvercome && (
                <div className="mt-2.5 text-xs font-bold text-red-800 bg-red-100/90 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-fire text-red-500"></i>
                    {answerFeedback.isCorrect
                      ? `【苦手克服修行中】あと ${Math.max(0, 3 - (answerFeedback.statResult.streak || 0))} 回の連続正解で克服！`
                      : '【苦手判定】克服するには「3回連続正解」が必要です'}
                  </span>
                  <span className="bg-red-200 text-red-900 px-2 py-0.5 rounded text-[11px] font-mono whitespace-nowrap">
                    {answerFeedback.statResult.streak || 0} / 3 連続正解
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 歴史解説カード */}
          <div className="border-t border-stone-200/60 pt-3">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
              <h5 className="font-bold text-xs text-stone-700 mb-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-book-open"></i> 歴史の解説
              </h5>

              {settingsMode === 'sort' && answerFeedback.descriptions ? (
                <div className="space-y-2">
                  {answerFeedback.descriptions.map(({ event: c }) => {
                    const isJp = c.id.startsWith('jp_');
                    return (
                      <div key={c.id} className="p-3 bg-white border border-stone-200 rounded-lg shadow-sm text-left">
                        <div className="flex items-center gap-2 mb-1.5 text-xs flex-wrap">
                          <span className="font-bold font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {c.year}年
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              isJp ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'
                            }`}
                          >
                            {isJp ? '日本史' : '世界史'}
                          </span>
                          <span className="font-bold text-stone-800">{c.event}</span>
                        </div>
                        <p className="text-[11px] text-stone-600 leading-relaxed pl-2 border-l-2 border-[#4c6444]/60">
                          {c.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : settingsMode === 'same_era' ? (
                <div className="text-xs md:text-sm text-stone-600 leading-relaxed space-y-2">
                  <div>
                    <strong className="text-stone-800">
                      ● 日本史: 【{(currentQ as SameEraPair).jp.year}年】{(currentQ as SameEraPair).jp.event}
                    </strong>
                    <p className="mt-0.5">{(currentQ as SameEraPair).jp.description}</p>
                  </div>
                  <div>
                    <strong className="text-stone-800">
                      🗺 世界史: 【{(currentQ as SameEraPair).wd.year}年】{(currentQ as SameEraPair).wd.event}
                    </strong>
                    <p className="mt-0.5">{(currentQ as SameEraPair).wd.description}</p>
                  </div>
                </div>
              ) : (
                <div className="text-xs md:text-sm text-stone-600 leading-relaxed">
                  {(currentQ as HistoryEvent)?.description}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 次へ進むボタン */}
      {hasAnswered && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onNextQuestion}
            className={`text-white font-bold py-2 px-5 rounded-lg transition-all flex items-center gap-1.5 text-sm cursor-pointer shadow-md ${
              isMatchaTheme ? 'bg-[#4c6444] hover:bg-[#3d4f36]' : 'bg-amber-800 hover:bg-amber-900'
            }`}
          >
            <span>次の問題へ</span> <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      )}
    </div>
  );
};
