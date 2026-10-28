import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GlobalGameType,
  HistoryField,
  QuizMode,
  QuestionCount,
  HistoryEvent,
  StatsMap,
  IncorrectAnswer,
  StatSaveResult,
  SameEraPair,
  SortYearGap,
} from './types';
import { japanDatabase, worldDatabase } from './data/historyData';
import {
  getStats,
  getWeakItemsForField,
  shuffle,
  generateSameEraQuestions,
  get4CloseDistinctYearEvents,
  get4SortEvents,
  resetAllStats,
} from './utils/quizHelpers';
import { checkSyncStatus, setupRealtimeSync } from './services/studyTracker';

import { Header } from './components/Header';
import { StartScreen } from './components/StartScreen';
import { QuizScreen } from './components/QuizScreen';
import { FlashcardScreen } from './components/FlashcardScreen';
import { FlashcardResultScreen } from './components/FlashcardResultScreen';
import { QuizResultScreen } from './components/QuizResultScreen';
import { TimelineModal } from './components/TimelineModal';
import { FilteredQuizModal } from './components/FilteredQuizModal';
import { TimelineDetailModal } from './components/TimelineDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CustomAlertModal } from './components/CustomAlertModal';

export const App: React.FC = () => {
  // App navigation state
  const [currentScreen, setCurrentScreen] = useState<
    'start' | 'quiz' | 'flashcard' | 'flashcard_result' | 'result'
  >('start');

  // Game configuration
  const [globalGameType, setGlobalGameTypeState] = useState<GlobalGameType>('quiz');
  const [settingsField, setSettingsField] = useState<HistoryField>('japan');
  const [settingsMode, setSettingsMode] = useState<QuizMode>('input');
  const [sortYearGap, setSortYearGap] = useState<SortYearGap>('medium');
  const [isWeakOnlyMode, setIsWeakOnlyMode] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [startYear, setStartYear] = useState<string>('');
  const [endYear, setEndYear] = useState<string>('');

  // Stats & Sync
  const [stats, setStats] = useState<StatsMap>(() => getStats());
  const [isTrackerConnected, setIsTrackerConnected] = useState<boolean>(false);

  // Active quiz session state
  const [currentQuestions, setCurrentQuestions] = useState<any[]>([]);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState<IncorrectAnswer[]>([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState<any[]>([]);
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);

  // Filtered quiz from timeline state
  const [isFilteredQuizMode, setIsFilteredQuizMode] = useState<boolean>(false);
  const [filteredQuizLabel, setFilteredQuizLabel] = useState<string>('');

  // Flashcards state
  const [flashcardQuestions, setFlashcardQuestions] = useState<HistoryEvent[]>([]);
  const [fcIndex, setFcIndex] = useState<number>(0);

  // Time tracking
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [quizElapsedSec, setQuizElapsedSec] = useState<number>(0);

  // Modals state
  const [isTimelineOpen, setIsTimelineOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [timelineDetail, setTimelineDetail] = useState<{
    isOpen: boolean;
    items: HistoryEvent[];
    type: 'japan' | 'world';
  }>({
    isOpen: false,
    items: [],
    type: 'japan',
  });
  const [filteredQuizModal, setFilteredQuizModal] = useState<{
    isOpen: boolean;
    filteredEvents: HistoryEvent[];
    query: string;
    fieldTab: 'all' | 'japan' | 'world';
  }>({
    isOpen: false,
    filteredEvents: [],
    query: '',
    fieldTab: 'all',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    confirmBtnClass?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'はい',
    cancelText: 'キャンセル',
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    iconClass?: string;
    iconColorClass?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showAlert = (
    title: string,
    message: string,
    iconClass = 'fa-circle-info',
    iconColorClass = 'text-amber-700'
  ) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      iconClass,
      iconColorClass,
    });
  };

  // Sync status check & realtime listener setup on mount
  useEffect(() => {
    const status = checkSyncStatus();
    setIsTrackerConnected(status.isConnected);

    setupRealtimeSync((updatedStats) => {
      setStats(updatedStats);
    });
  }, []);

  // Global game type switcher
  const setGlobalGameType = (type: GlobalGameType) => {
    setGlobalGameTypeState(type);
    if (type === 'quiz') {
      setSettingsMode('input');
    } else {
      setSettingsMode('sort');
    }
  };

  // Active database by field
  const activeDatabase = useMemo(() => {
    if (settingsField === 'japan') return japanDatabase;
    if (settingsField === 'world') return worldDatabase;
    return [...japanDatabase, ...worldDatabase];
  }, [settingsField]);

  // Year range filtering
  const sYear = startYear ? parseInt(startYear, 10) : -9999;
  const eYear = endYear ? parseInt(endYear, 10) : 9999;

  const dateFilteredDatabase = useMemo(() => {
    return activeDatabase.filter(item => item.year >= sYear && item.year <= eYear);
  }, [activeDatabase, sYear, eYear]);

  // Weak list for current field & years
  const weakItemsForField = useMemo(() => {
    return getWeakItemsForField(dateFilteredDatabase, stats);
  }, [dateFilteredDatabase, stats]);

  const weakCount = weakItemsForField.length;

  // Available question count
  const availableCount = isWeakOnlyMode ? weakCount : dateFilteredDatabase.length;

  // Theme check
  const isMatchaTheme = settingsMode === 'sort' || settingsMode === 'same_era';

  // Start Flashcards
  const startFlashcards = useCallback(() => {
    setQuizStartTime(Date.now());
    if (dateFilteredDatabase.length === 0) {
      showAlert('お知らせ', '指定された年代のデータが見つかりません。', 'fa-circle-info', 'text-amber-700');
      return;
    }

    let qCount = dateFilteredDatabase.length;
    if (questionCount !== 'all') {
      qCount = Math.min(questionCount, dateFilteredDatabase.length);
    }

    const shuffled = shuffle([...dateFilteredDatabase]).slice(0, qCount);
    setFlashcardQuestions(shuffled);
    setFcIndex(0);
    setCurrentScreen('flashcard');
  }, [dateFilteredDatabase, questionCount]);

  // Start Quiz
  const startGame = useCallback(() => {
    if (settingsMode === 'flashcard') {
      startFlashcards();
      return;
    }

    setQuizStartTime(Date.now());
    setIsReviewMode(false);
    setIsFilteredQuizMode(false);

    const filteredJapan = japanDatabase.filter(item => item.year >= sYear && item.year <= eYear);
    const filteredWorld = worldDatabase.filter(item => item.year >= sYear && item.year <= eYear);

    if (dateFilteredDatabase.length === 0) {
      showAlert(
        'お知らせ',
        '指定された年代の問題が見つかりません。年代の指定を変えてみてください。',
        'fa-circle-info',
        'text-amber-700'
      );
      return;
    }

    if (settingsMode === 'same_era' && (filteredJapan.length === 0 || filteredWorld.length === 0)) {
      showAlert(
        'お知らせ',
        '同時期クイズには日本史・世界史両方の問題が必要です。年代の指定を変えてみてください。',
        'fa-circle-info',
        'text-amber-700'
      );
      return;
    }

    let generatedQuestions: any[] = [];

    if (isWeakOnlyMode) {
      const weakItems = weakItemsForField;
      if (weakItems.length === 0) {
        showAlert(
          'お知らせ',
          '苦手克服モードの対象となる問題がありません！\n（間違えた出来事は「3回連続正解」するまで苦手問題として特訓できます）\nまずは「通常修行」をプレイして、間違えた歴史を記録しましょう。',
          'fa-circle-info',
          'text-amber-700'
        );
        setIsWeakOnlyMode(false);
        return;
      }

      if (settingsMode === 'sort') {
        const questionsList: HistoryEvent[][] = [];
        weakItems.forEach(item => {
          const set = get4SortEvents(dateFilteredDatabase, sortYearGap, item);
          if (set.length === 4) {
            questionsList.push(set);
          }
        });
        generatedQuestions = shuffle(questionsList);
      } else if (settingsMode === 'same_era') {
        const allPairs = generateSameEraQuestions('all', filteredJapan, filteredWorld);
        const weakItemIds = new Set(weakItems.map(item => item.id));
        const weakPairs = allPairs.filter(
          pair => weakItemIds.has(pair.jp.id) || weakItemIds.has(pair.wd.id)
        );
        generatedQuestions = weakPairs.length > 0 ? shuffle(weakPairs) : shuffle(allPairs).slice(0, 10);
      } else {
        generatedQuestions = shuffle(weakItems);
      }
    } else {
      let countVal = questionCount === 'all' ? dateFilteredDatabase.length : questionCount;

      if (settingsMode === 'same_era') {
        generatedQuestions = generateSameEraQuestions(questionCount, filteredJapan, filteredWorld);
      } else if (settingsMode === 'sort') {
        const questionsList: HistoryEvent[][] = [];
        const loops = questionCount === 'all' ? 10 : questionCount;
        for (let i = 0; i < loops; i++) {
          const items = get4SortEvents(dateFilteredDatabase, sortYearGap);
          if (items.length === 4) {
            questionsList.push(items);
          }
        }
        generatedQuestions = questionsList;
      } else if (settingsField === 'mixed') {
        const shuffledJapan = shuffle(filteredJapan);
        const shuffledWorld = shuffle(filteredWorld);

        if (questionCount === 'all') {
          generatedQuestions = shuffle([...filteredJapan, ...filteredWorld]);
        } else {
          const half = Math.floor(countVal / 2);
          const selJp = shuffledJapan.slice(0, half);
          const selWd = shuffledWorld.slice(0, half);
          generatedQuestions = shuffle([...selJp, ...selWd]);
        }
      } else {
        const shuffledDb = shuffle(dateFilteredDatabase);
        generatedQuestions = shuffledDb.slice(0, countVal);
      }
    }

    if (!generatedQuestions || generatedQuestions.length === 0) {
      showAlert(
        'お知らせ',
        '条件に合う問題が十分に作成できませんでした。年代の範囲を広げるなどしてお試しください。',
        'fa-circle-info',
        'text-amber-700'
      );
      return;
    }

    setCurrentQuestions(generatedQuestions);
    setQuestionIndex(0);
    setScore(0);
    setIncorrectAnswers([]);
    setIncorrectQuestions([]);
    setCurrentScreen('quiz');
  }, [
    settingsMode,
    startFlashcards,
    sYear,
    eYear,
    dateFilteredDatabase,
    isWeakOnlyMode,
    weakItemsForField,
    questionCount,
    settingsField,
  ]);

  // Answer submitted in QuizScreen
  const handleAnswerSubmitted = (
    isCorrect: boolean,
    questionObj: any,
    playerAnswerStr: string,
    correctAnswerStr: string,
    statResult: StatSaveResult
  ) => {
    // Update local stats state
    setStats(getStats());

    if (isCorrect) {
      setScore(prev => prev + 1);
    } else {
      setIncorrectQuestions(prev => [...prev, questionObj]);

      let qText = '';
      if (settingsMode === 'sort') {
        qText = `並べ替え`;
      } else if (settingsMode === 'same_era') {
        const pair = questionObj as SameEraPair;
        qText = `【${pair.year}年頃】の対比クイズ`;
      } else {
        const ev = questionObj as HistoryEvent;
        qText = ev.event;
      }

      setIncorrectAnswers(prev => [
        ...prev,
        {
          question: qText,
          correct: correctAnswerStr,
          wrong: playerAnswerStr,
        },
      ]);
    }
  };

  const handleNextQuestion = () => {
    if (questionIndex + 1 < currentQuestions.length) {
      setQuestionIndex(prev => prev + 1);
    } else {
      const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
      setQuizElapsedSec(elapsed);
      setCurrentScreen('result');
    }
  };

  // Review only wrong questions
  const handleReviewOnly = () => {
    setQuizStartTime(Date.now());
    setIsReviewMode(true);
    setCurrentQuestions(shuffle(incorrectQuestions));
    setQuestionIndex(0);
    setScore(0);
    setIncorrectAnswers([]);
    setIncorrectQuestions([]);
    setCurrentScreen('quiz');
  };

  // Flashcards navigation
  const handlePrevCard = () => {
    if (fcIndex > 0) {
      setFcIndex(prev => prev - 1);
    }
  };

  const handleNextCard = () => {
    if (fcIndex + 1 < flashcardQuestions.length) {
      setFcIndex(prev => prev + 1);
    }
  };

  const handleFinishCards = () => {
    const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
    setQuizElapsedSec(elapsed);
    setCurrentScreen('flashcard_result');
  };

  // Exit confirm dialogs
  const confirmExitQuiz = () => {
    setConfirmModal({
      isOpen: true,
      title: '修行を中断しますか？',
      message: 'これまでのスコアや進捗状況はリセットされてしまいますが、よろしいですか？',
      confirmText: '中断して戻る',
      cancelText: '続ける',
      confirmBtnClass: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setCurrentScreen('start');
      },
    });
  };

  const confirmExitFlashcards = () => {
    setConfirmModal({
      isOpen: true,
      title: '確認を途中で終了しますか？',
      message: 'ここまでの確認でカード学習を終了し、完了画面へ移動しますか？',
      confirmText: '終了する',
      cancelText: '続ける',
      confirmBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
        setQuizElapsedSec(elapsed);
        setCurrentScreen('flashcard_result');
      },
    });
  };

  const confirmResetStats = () => {
    setConfirmModal({
      isOpen: true,
      title: '記録をリセットしますか？',
      message: 'これまでのすべての正解・不正解の記録が完全にクリアされます。よろしいですか？',
      confirmText: 'リセットする',
      cancelText: 'キャンセル',
      confirmBtnClass: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: () => {
        resetAllStats();
        setStats({});
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showAlert('完了', 'すべての記録をクリアしました！', 'fa-circle-check', 'text-green-600');
      },
    });
  };

  // Start filtered quiz from timeline
  const handleStartFilteredQuiz = (
    selectedMode: QuizMode,
    selectedCount: number | 'all',
    selectedSortGap: SortYearGap = 'medium'
  ) => {
    const events = filteredQuizModal.filteredEvents;
    if (events.length === 0) return;

    setFilteredQuizModal(prev => ({ ...prev, isOpen: false }));
    setIsTimelineOpen(false);

    let tabLabel = '日世混合';
    if (filteredQuizModal.fieldTab === 'japan') tabLabel = '日本史';
    else if (filteredQuizModal.fieldTab === 'world') tabLabel = '世界史';

    const label = filteredQuizModal.query.trim()
      ? `"${filteredQuizModal.query.trim()}" (${tabLabel})`
      : `年表絞り込み (${tabLabel})`;

    setIsFilteredQuizMode(true);
    setFilteredQuizLabel(label);

    let qCount = events.length;
    if (selectedCount !== 'all') {
      qCount = Math.min(selectedCount, events.length);
    }

    if (selectedMode === 'flashcard') {
      setQuizStartTime(Date.now());
      setFlashcardQuestions(shuffle([...events]).slice(0, qCount));
      setFcIndex(0);
      setCurrentScreen('flashcard');
      return;
    }

    setSettingsMode(selectedMode);
    setQuizStartTime(Date.now());
    setIsReviewMode(false);
    setIsWeakOnlyMode(false);

    let generated: any[] = [];
    if (selectedMode === 'sort') {
      const questionsList: HistoryEvent[][] = [];
      const loops =
        selectedCount === 'all'
          ? Math.max(1, Math.min(10, Math.floor(events.length / 4) || 1))
          : Math.min(qCount, Math.floor(events.length / 4) || 1);

      for (let i = 0; i < loops; i++) {
        const set = get4SortEvents(events, selectedSortGap);
        if (set.length === 4) {
          questionsList.push(set);
        }
      }
      if (questionsList.length === 0) {
        const distinctMap = new Map<number, HistoryEvent>();
        events.forEach(e => {
          if (!distinctMap.has(e.year)) distinctMap.set(e.year, e);
        });
        const distinctList = Array.from(distinctMap.values());
        if (distinctList.length >= 4) {
          questionsList.push(shuffle(distinctList).slice(0, 4));
        } else {
          showAlert(
            'お知らせ',
            '並べ替えには異なる年代の出来事が4つ以上必要です。別の出題形式をお選びください。',
            'fa-circle-info',
            'text-amber-700'
          );
          return;
        }
      }
      generated = questionsList;
    } else {
      generated = shuffle([...events]).slice(0, qCount);
    }

    setCurrentQuestions(generated);
    setQuestionIndex(0);
    setScore(0);
    setIncorrectAnswers([]);
    setIncorrectQuestions([]);
    setCurrentScreen('quiz');
  };

  // Text label for results
  let fieldLabel = '日本史';
  if (settingsField === 'world') fieldLabel = '世界史';
  else if (settingsField === 'mixed') fieldLabel = '日世混合';

  let modeLabel = '年号直接入力';
  if (settingsMode === 'choice') modeLabel = '出来事選択4択';
  else if (settingsMode === 'sort') modeLabel = '通常の並べ替え';
  else if (settingsMode === 'same_era') modeLabel = '同時期できごとクイズ';

  let reviewModeText = '';
  if (isReviewMode) reviewModeText = '【苦手復習】';
  else if (isWeakOnlyMode) reviewModeText = '【苦手克服】';

  let modeTextFull = `${reviewModeText}分野: ${fieldLabel} | モード: ${modeLabel}`;
  if (isFilteredQuizMode) {
    modeTextFull = `【絞り込み特訓 ${filteredQuizLabel}】出題: ${currentQuestions.length}問 | モード: ${modeLabel}`;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between text-stone-800 select-none">
      {/* ヘッダー */}
      <Header
        globalGameType={globalGameType}
        setGlobalGameType={setGlobalGameType}
        isMatchaTheme={isMatchaTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* メインコンテンツ */}
      <main className="flex-grow p-4 md:p-6 flex items-center justify-center relative">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden transition-all duration-300">
          {currentScreen === 'start' && (
            <StartScreen
              globalGameType={globalGameType}
              settingsField={settingsField}
              setSettingsField={setSettingsField}
              settingsMode={settingsMode}
              setSettingsMode={setSettingsMode}
              sortYearGap={sortYearGap}
              setSortYearGap={setSortYearGap}
              isWeakOnlyMode={isWeakOnlyMode}
              setIsWeakOnlyMode={setIsWeakOnlyMode}
              weakCount={weakCount}
              startYear={startYear}
              setStartYear={setStartYear}
              endYear={endYear}
              setEndYear={setEndYear}
              questionCount={questionCount}
              setQuestionCount={setQuestionCount}
              availableCount={availableCount}
              isMatchaTheme={isMatchaTheme}
              onStartGame={startGame}
              onOpenTimeline={() => setIsTimelineOpen(true)}
            />
          )}

          {currentScreen === 'quiz' && (
            <QuizScreen
              currentQuestions={currentQuestions}
              questionIndex={questionIndex}
              score={score}
              settingsMode={settingsMode}
              isWeakOnlyMode={isWeakOnlyMode}
              isReviewMode={isReviewMode}
              isFilteredQuizMode={isFilteredQuizMode}
              filteredQuizLabel={filteredQuizLabel}
              isMatchaTheme={isMatchaTheme}
              activeDatabase={activeDatabase}
              japanDatabase={japanDatabase}
              worldDatabase={worldDatabase}
              onAnswerSubmitted={handleAnswerSubmitted}
              onNextQuestion={handleNextQuestion}
              onConfirmExit={confirmExitQuiz}
            />
          )}

          {currentScreen === 'flashcard' && (
            <FlashcardScreen
              questions={flashcardQuestions}
              fcIndex={fcIndex}
              onPrevCard={handlePrevCard}
              onNextCard={handleNextCard}
              onFinishCards={handleFinishCards}
              onEndEarly={confirmExitFlashcards}
            />
          )}

          {currentScreen === 'flashcard_result' && (
            <FlashcardResultScreen
              totalCount={flashcardQuestions.length}
              elapsedSec={quizElapsedSec}
              fieldLabel={fieldLabel}
              isFilteredQuizMode={isFilteredQuizMode}
              filteredQuizLabel={filteredQuizLabel}
              isTrackerConnected={isTrackerConnected}
              onStartQuiz={startGame}
              onReplayFlashcards={() => {
                setFcIndex(0);
                setQuizStartTime(Date.now());
                setCurrentScreen('flashcard');
              }}
              onGoToStart={() => setCurrentScreen('start')}
            />
          )}

          {currentScreen === 'result' && (
            <QuizResultScreen
              score={score}
              totalQuestions={currentQuestions.length}
              modeLabelText={modeTextFull}
              elapsedSec={quizElapsedSec}
              incorrectAnswers={incorrectAnswers}
              hasIncorrectQuestions={incorrectQuestions.length > 0}
              incorrectCount={incorrectQuestions.length}
              isTrackerConnected={isTrackerConnected}
              onReviewOnly={handleReviewOnly}
              onRestartAll={() => {
                if (isFilteredQuizMode) {
                  startGame();
                } else {
                  startGame();
                }
              }}
              onGoToStart={() => {
                setIsFilteredQuizMode(false);
                setCurrentScreen('start');
              }}
            />
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-stone-800 text-stone-400 text-center py-4 text-xs">
        <div className="max-w-4xl mx-auto px-4">
          <p>© 2026 歴史年号暗記アプリ. 完璧な暗記を手に入れよう！</p>
        </div>
      </footer>

      {/* 年表モーダル */}
      <TimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        japanDatabase={japanDatabase}
        worldDatabase={worldDatabase}
        stats={stats}
        onResetStatsRequest={confirmResetStats}
        onOpenFilteredQuiz={(filteredEvents, query, fieldTab) => {
          setFilteredQuizModal({
            isOpen: true,
            filteredEvents,
            query,
            fieldTab,
          });
        }}
        onSelectEventDetail={(items, type) => {
          setTimelineDetail({
            isOpen: true,
            items,
            type,
          });
        }}
      />

      {/* 年表詳細モーダル */}
      <TimelineDetailModal
        isOpen={timelineDetail.isOpen}
        onClose={() => setTimelineDetail(prev => ({ ...prev, isOpen: false }))}
        items={timelineDetail.items}
        type={timelineDetail.type}
        stats={stats}
      />

      {/* 絞り込み特訓クイズモーダル */}
      <FilteredQuizModal
        isOpen={filteredQuizModal.isOpen}
        onClose={() => setFilteredQuizModal(prev => ({ ...prev, isOpen: false }))}
        filteredEvents={filteredQuizModal.filteredEvents}
        query={filteredQuizModal.query}
        fieldTab={filteredQuizModal.fieldTab}
        onStart={handleStartFilteredQuiz}
      />

      {/* 設定モーダル */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSyncStatusChanged={setIsTrackerConnected}
        onShowAlert={showAlert}
      />

      {/* 中断・リセット等の確認ダイアログ */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmBtnClass={confirmModal.confirmBtnClass}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* カスタムアラートダイアログ */}
      <CustomAlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        iconClass={alertModal.iconClass}
        iconColorClass={alertModal.iconColorClass}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default App;
