import React from 'react';
import { GlobalGameType, HistoryField, QuizMode, QuestionCount, SortYearGap } from '../types';

interface StartScreenProps {
  globalGameType: GlobalGameType;
  settingsField: HistoryField;
  setSettingsField: (field: HistoryField) => void;
  settingsMode: QuizMode;
  setSettingsMode: (mode: QuizMode) => void;
  sortYearGap: SortYearGap;
  setSortYearGap: (gap: SortYearGap) => void;
  isWeakOnlyMode: boolean;
  setIsWeakOnlyMode: (isWeak: boolean) => void;
  weakCount: number;
  startYear: string;
  setStartYear: (val: string) => void;
  endYear: string;
  setEndYear: (val: string) => void;
  questionCount: QuestionCount;
  setQuestionCount: (count: QuestionCount) => void;
  availableCount: number;
  isMatchaTheme: boolean;
  onStartGame: () => void;
  onOpenTimeline: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  globalGameType,
  settingsField,
  setSettingsField,
  settingsMode,
  setSettingsMode,
  sortYearGap,
  setSortYearGap,
  isWeakOnlyMode,
  setIsWeakOnlyMode,
  weakCount,
  startYear,
  setStartYear,
  endYear,
  setEndYear,
  questionCount,
  setQuestionCount,
  availableCount,
  isMatchaTheme,
  onStartGame,
  onOpenTimeline,
}) => {
  const primaryBg = isMatchaTheme ? 'bg-[#4c6444]' : 'bg-amber-900';
  const primaryBorder = isMatchaTheme ? 'border-[#4c6444]' : 'border-amber-900';
  const activeBtnClass = `flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${primaryBg} text-white shadow-sm`;
  const inactiveBtnClass = 'flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center text-stone-600 hover:text-stone-900';

  const labelColor = isMatchaTheme ? 'text-[#4c6444]' : 'text-amber-900';
  const boxBg = isMatchaTheme
    ? 'bg-[#edf2e8] p-5 rounded-2xl mb-6 max-w-md mx-auto border border-[#cbdcb3] text-left space-y-4 transition-colors'
    : 'bg-amber-50 p-5 rounded-2xl mb-6 max-w-md mx-auto border border-amber-100 text-left space-y-4 transition-colors';

  let fieldLabel = '日本史';
  if (settingsField === 'world') fieldLabel = '世界史';
  else if (settingsField === 'mixed') fieldLabel = '日本史 ＆ 世界史 混合';

  let filterText = '全年代';
  if (startYear || endYear) {
    filterText = `${startYear || '最初'}〜${endYear || '最後'}年`;
  }

  const startBtnClass = isMatchaTheme
    ? 'flex-1 bg-[#4c6444] hover:bg-[#3d4f36] text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 cursor-pointer'
    : settingsMode === 'flashcard'
    ? 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 cursor-pointer'
    : 'flex-1 bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 cursor-pointer';

  return (
    <div className="p-6 md:p-10 text-center animate-fade-in">
      <div className={`text-6xl mb-4 transition-colors ${isMatchaTheme ? 'text-[#4c6444]' : 'text-amber-700'}`}>
        <i className="fa-solid fa-graduation-cap"></i>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold mb-4 japanese-font text-stone-900">
        歴史年号暗記に挑戦！
      </h2>
      <p className="text-stone-600 mb-6 text-sm md:text-base leading-relaxed">
        日本史（古代〜近代）や世界史、または両方の混合問題に挑戦しましょう！<br />
        お好みの設定を選んで「修行を始める」を押してください。
      </p>

      {/* 設定エリア */}
      <div className={boxBg}>
        {/* 分野選択 */}
        <div>
          <h3 className={`font-bold ${labelColor} mb-1.5 flex items-center justify-between text-xs tracking-wider uppercase transition-colors`}>
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-map-location-dot"></i> 歴史分野
            </span>
            <span className={`text-[10px] ${isMatchaTheme ? 'text-[#556b3f]' : 'text-stone-500'} font-normal`}>
              {fieldLabel} | {filterText} (対象: {availableCount}問)
            </span>
          </h3>
          <div className="flex bg-stone-200/60 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setSettingsField('japan')}
              className={settingsField === 'japan' ? activeBtnClass : inactiveBtnClass}
            >
              日本史
            </button>
            <button
              type="button"
              onClick={() => setSettingsField('world')}
              className={settingsField === 'world' ? activeBtnClass : inactiveBtnClass}
            >
              世界史
            </button>
            <button
              type="button"
              onClick={() => setSettingsField('mixed')}
              className={settingsField === 'mixed' ? activeBtnClass : inactiveBtnClass}
            >
              混合
            </button>
          </div>
        </div>

        {/* 年代範囲指定 */}
        <div>
          <h3 className={`font-bold ${labelColor} mb-1.5 flex items-center gap-1.5 text-xs tracking-wider uppercase transition-colors`}>
            <i className="fa-solid fa-clock"></i> 出題する年代（西暦）
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="開始年 (例: 1600)"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-500 transition-colors"
            />
            <span className="text-stone-500 font-bold">〜</span>
            <input
              type="number"
              placeholder="終了年 (例: 1912)"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <p className="text-[10px] text-stone-500 mt-1.5 leading-relaxed pl-1">
            ※空欄の場合は全年代から出題されます。
          </p>
        </div>

        {/* 修行の種類（通常 or 苦手克服） */}
        <div>
          <h3 className={`font-bold ${labelColor} mb-1.5 flex items-center justify-between text-xs tracking-wider uppercase transition-colors`}>
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-dumbbell"></i> 修行スタイル
            </span>
          </h3>
          <div className="flex bg-stone-200/60 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setIsWeakOnlyMode(false)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs md:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                !isWeakOnlyMode ? `${primaryBg} text-white shadow-sm` : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <i className="fa-solid fa-cubes text-[10px]"></i> 通常修行
            </button>
            <button
              type="button"
              onClick={() => setIsWeakOnlyMode(true)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs md:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 relative ${
                isWeakOnlyMode ? `${primaryBg} text-white shadow-sm` : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <i className="fa-solid fa-fire text-red-500 text-[10px]"></i> 苦手克服
              {weakCount > 0 && (
                <span className="ml-1 text-[9px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                  {weakCount}
                </span>
              )}
            </button>
          </div>
          <p className="text-[10px] text-stone-500 mt-1.5 leading-relaxed pl-1">
            {isWeakOnlyMode
              ? '間違えた問題から優先出題します。間違えてから3回連続で正解すると苦手を克服できます！'
              : '全ての出来事からランダムに出題します。'}
          </p>
        </div>

        {/* クイズモード */}
        <div>
          <h3 className={`font-bold ${labelColor} mb-1.5 flex items-center gap-1.5 text-xs tracking-wider uppercase transition-colors`}>
            <i className="fa-solid fa-gears"></i> クイズモード
          </h3>
          {globalGameType === 'quiz' ? (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSettingsMode('input')}
                className={`py-2 px-3 text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 rounded-xl border ${
                  settingsMode === 'input'
                    ? `${primaryBg} text-white ${primaryBorder} shadow-inner`
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span>出来事➔年号</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsMode('choice')}
                className={`py-2 px-3 text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 rounded-xl border ${
                  settingsMode === 'choice'
                    ? `${primaryBg} text-white ${primaryBorder} shadow-inner`
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span>年号➔出来事</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsMode('flashcard')}
                className={`py-2 px-3 text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 rounded-xl border ${
                  settingsMode === 'flashcard'
                    ? `${primaryBg} text-white ${primaryBorder} shadow-inner`
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span>暗記カード</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettingsMode('sort')}
                className={`py-2 px-3 text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 rounded-xl border ${
                  settingsMode === 'sort'
                    ? 'bg-[#4c6444] text-white border-[#4c6444] shadow-inner'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span>通常の並べ替え</span>
                <span className="text-[9px] opacity-85 font-normal hidden sm:inline">
                  4つの出来事を古い順にソート
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (settingsField !== 'mixed') {
                    setSettingsField('mixed');
                  }
                  setSettingsMode('same_era');
                }}
                className={`py-2 px-3 text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 rounded-xl border relative ${
                  settingsMode === 'same_era'
                    ? 'bg-[#4c6444] text-white border-[#4c6444] shadow-inner'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span>同時期のできごとクイズ</span>
                <span className="text-[9px] opacity-85 font-normal hidden sm:inline">
                  同じ年に日・世で起きたこと
                </span>
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-bold text-[8px] px-1 rounded">
                  混合限定
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 並べ替えの年代差（難易度）設定 */}
        {settingsMode === 'sort' && (
          <div className="animate-fade-in">
            <h3 className={`font-bold ${labelColor} mb-1.5 flex items-center justify-between text-xs tracking-wider uppercase transition-colors`}>
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-arrows-left-right"></i> 年代差（難易度）
              </span>
            </h3>
            <div className="flex bg-stone-200/60 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setSortYearGap('near')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                  sortYearGap === 'near' ? 'bg-[#4c6444] text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                近い (4〜10年)
              </button>
              <button
                type="button"
                onClick={() => setSortYearGap('medium')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                  sortYearGap === 'medium' ? 'bg-[#4c6444] text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                中間 (10〜25年)
              </button>
              <button
                type="button"
                onClick={() => setSortYearGap('far')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                  sortYearGap === 'far' ? 'bg-[#4c6444] text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                遠い (25〜50年)
              </button>
            </div>
            <p className="text-[10px] text-stone-500 mt-1.5 leading-relaxed pl-1">
              {sortYearGap === 'near'
                ? '基準となる出来事の前後4〜10年の範囲から抽出。非常に近い年号の順序を見抜く高難易度修行。'
                : sortYearGap === 'medium'
                ? '基準となる出来事の前後10〜25年の範囲から抽出。手ごたえのある標準的な並べ替え。'
                : '基準となる出来事の前後25〜50年の範囲から抽出。歴史の流れと大枠を捉える基本クイズ。'}
            </p>
          </div>
        )}

        {/* 問題数選択 */}
        <div className={isWeakOnlyMode ? 'opacity-50 pointer-events-none' : ''}>
          <h3 className={`font-bold ${labelColor} mb-1.5 flex items-center gap-1.5 text-xs tracking-wider uppercase transition-colors`}>
            <i className="fa-solid fa-sliders"></i> 問題数
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setQuestionCount(10)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                questionCount === 10
                  ? `${primaryBg} text-white`
                  : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
              }`}
            >
              10問
            </button>
            <button
              type="button"
              onClick={() => setQuestionCount(20)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                questionCount === 20
                  ? `${primaryBg} text-white`
                  : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
              }`}
            >
              20問
            </button>
            <button
              type="button"
              onClick={() => setQuestionCount('all')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                questionCount === 'all'
                  ? `${primaryBg} text-white`
                  : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
              }`}
            >
              全{availableCount}問
            </button>
          </div>
        </div>
      </div>

      {/* ボタンエリア */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-sm mx-auto">
        <button type="button" onClick={onStartGame} className={startBtnClass}>
          {settingsMode === 'flashcard' ? (
            <>
              <i className="fa-solid fa-layer-group"></i> 暗記を始める
            </>
          ) : (
            <>
              修行（クイズ） <i className="fa-solid fa-circle-play"></i>
            </>
          )}
        </button>
        {/* 年表ボタン */}
        <button
          type="button"
          onClick={onOpenTimeline}
          className="flex-1 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
        >
          <i className="fa-solid fa-chart-column text-amber-700"></i> 年表
        </button>
      </div>
    </div>
  );
};
