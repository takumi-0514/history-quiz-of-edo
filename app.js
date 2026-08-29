// app.js — 歴史年号暗記道場：画面制御・ゲームロジック
        // 状態変数
        let activeDatabase = [];       // 現在選ばれている歴史データベース
        let currentQuestions = [];      // 出題するクイズオブジェクトの配列
        let questionIndex = 0;
        let score = 0;
        let settingsQuestionCount = 10; // 数値、または 'all'
        let settingsField = 'japan';    // 'japan' / 'world' / 'mixed'
        let settingsMode = 'input';     // 'input' / 'choice' / 'sort' / 'same_era'
        let isWeakOnlyMode = false;     // よく間違えた問題モードかどうか
        let globalGameType = 'quiz';    // 'quiz' (通常クイズ) または 'sort_era' (並べ替え・同時期)
        
        let incorrectAnswers = [];      // 復習リスト表示用のデータ
        let incorrectQuestions = [];    // 間違えた問題のオリジナルクイズ配列（復習機能で使用）
        let isReviewMode = false;       // 今が復習モードかどうか

        let currentInput = "";          // 現在入力されているキー
        let hasAnswered = false;

        // 並べ替えモード用の状態管理
        let sortDisplayCards = [];      // 画面表示用の4枚のカード配列 (シャッフルされた状態)
        let sortCorrectCards = [];      // 正しい時系列順の4枚のカード配列
        let selectedSortIndex = null;   // タップ選択されたカードのインデックス

        // ページ読み込み時にセット
        window.onload = function() {
            setGlobalGameType('quiz'); // 通常クイズをデフォルトに
            setHistoryField('japan'); // デフォルトは日本史
            setQuizMode('input');      // デフォルトは直接入力
            setQuestionCount(10);      // デフォルトは10問
            setTrainingStyle(false);   // 初期状態で通常修行を選択状態にする
            updateWeakBadge();         // 苦手バッジを更新

            // 物理キーボードのキー入力を監視
            document.addEventListener('keydown', handlePhysicalKeyboard);
        };

        // ================= スタッツ管理（localStorage） =================
        const STATS_KEY = "history_quiz_stats_v3";
        function getStats() {
            const stats = localStorage.getItem(STATS_KEY);
            return stats ? JSON.parse(stats) : {};
        }

        // 配列シャッフルアルゴリズム（フィッシャー・イェーツ）
        function shuffle(array) {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        function saveStats(id, isCorrect) {
            const stats = getStats();
            if (!stats[id]) {
                stats[id] = { correct: 0, wrong: 0 };
            }
            if (isCorrect) {
                stats[id].correct += 1;
            } else {
                stats[id].wrong += 1;
            }
            localStorage.setItem(STATS_KEY, JSON.stringify(stats));
            updateWeakBadge();
        }

        // 記録を初期化する
        function resetAllStats() {
            document.getElementById("reset-confirm-modal").classList.remove("hidden");
        }

        // ================= 苦手克服対象の抽出ロジック =================
        // 条件：
        // 1. 過去に間違えた回数（wrong）が1回以上である
        // 2. 正解した回数（correct）が間違えた回数（wrong）の1.5倍未満である（correct < wrong * 1.5）
        // 3. 上記に該当するものを「間違えた回数（wrong）」が多い順に並べ、上位5位（同率含む）までを抽出する
        function getWeakItemsForField(database, stats) {
            // 1. 未克服の苦手問題を抽出
            const candidates = database.filter(item => {
                const s = stats[item.id];
                return s && s.wrong > 0 && s.correct < s.wrong * 1.5;
            });
            
            if (candidates.length === 0) return [];

            // 2. 間違えた回数（wrong）が多い順にソート
            candidates.sort((a, b) => {
                const sA = stats[a.id];
                const sB = stats[b.id];
                const wrongDiff = sB.wrong - sA.wrong;
                if (wrongDiff !== 0) return wrongDiff;
                return sA.correct - sB.correct;
            });

            // 3. 5位（同率含む）の境界判定
            if (candidates.length <= 5) {
                return candidates;
            }

            const thresholdWrong = stats[candidates[4].id].wrong;
            return candidates.filter(item => stats[item.id].wrong >= thresholdWrong);
        }

        // スタート画面の苦手バッジの数字を更新
        function updateWeakBadge() {
            const stats = getStats();
            
            // 各分野の苦手克服対象の問題を取得
            let targetDb = [];
            if (settingsField === 'japan') {
                targetDb = japanDatabase;
            } else if (settingsField === 'world') {
                targetDb = worldDatabase;
            } else {
                targetDb = [...japanDatabase, ...worldDatabase];
            }

            const weakItems = getWeakItemsForField(targetDb, stats);
            const currentFieldWeakCount = weakItems.length;
            const badge = document.getElementById("weak-count-badge");
            
            if (currentFieldWeakCount > 0) {
                badge.textContent = currentFieldWeakCount;
                badge.classList.remove("hidden");
            } else {
                badge.classList.add("hidden");
            }
        }

        // 物理キーボード対応
        function handlePhysicalKeyboard(e) {
            if (document.getElementById("quiz-screen").classList.contains("hidden")) return;
            
            if (settingsMode === 'input') {
                if (hasAnswered) {
                    if (e.key === "Enter") {
                        nextQuestion();
                    }
                    return;
                }

                if (/^[0-9]$/.test(e.key)) {
                    pressKey(e.key);
                } else if (e.key === "Backspace") {
                    pressKey("Backspace");
                } else if (e.key === "Enter") {
                    if (currentInput.length === 4) {
                        submitAnswer();
                    }
                }
            } else if (settingsMode === 'choice' || settingsMode === 'same_era') {
                if (!hasAnswered && /^[1-4]$/.test(e.key)) {
                    selectChoice(parseInt(e.key) - 1);
                } else if (hasAnswered && e.key === "Enter") {
                    nextQuestion();
                }
            } else if (settingsMode === 'sort') {
                if (hasAnswered && e.key === "Enter") {
                    nextQuestion();
                }
            }
        }

        // 大分類ゲームモードの切り替え (通常クイズ vs 並べ替え・同時期) と 抹茶テーマの連動
        function setGlobalGameType(type) {
            globalGameType = type;
            const btnQuiz = document.getElementById("btn-gtype-quiz");
            const btnSort = document.getElementById("btn-gtype-sort");
            const quizSelectors = document.getElementById("quiz-mode-selectors");
            const sortSelectors = document.getElementById("sort-mode-selectors");

            if (type === 'quiz') {
                btnQuiz.className = "px-3 py-1 rounded-lg text-xs font-bold transition-all bg-amber-900 text-white shadow-sm";
                btnSort.className = "px-3 py-1 rounded-lg text-xs font-bold transition-all text-amber-200 hover:text-white";
                quizSelectors.classList.remove("hidden");
                sortSelectors.classList.add("hidden");
                setQuizMode('input'); // デフォルトは年号入力
            } else {
                btnQuiz.className = "px-3 py-1 rounded-lg text-xs font-bold transition-all text-amber-200 hover:text-white";
                btnSort.className = "px-3 py-1 rounded-lg text-xs font-bold transition-all bg-amber-900 text-white shadow-sm";
                quizSelectors.classList.add("hidden");
                sortSelectors.classList.remove("hidden");
                
                // 初期時は通常の並べ替え
                setQuizMode('sort');
            }
            applyThemeColor();
        }

        // 分野（日本史／世界史／混合）を切り替える (データベースの長さに基づいて自動更新)
        function setHistoryField(field) {
            settingsField = field;
            const btnJapan = document.getElementById("btn-field-japan");
            const btnWorld = document.getElementById("btn-field-world");
            const btnMixed = document.getElementById("btn-field-mixed");
            const btnAll = document.getElementById("btn-count-all");

            // 全てのタブスタイルを一度クリア
            btnJapan.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center text-stone-600 hover:text-stone-900";
            btnWorld.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center text-stone-600 hover:text-stone-900";
            btnMixed.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center text-stone-600 hover:text-stone-900";

            if (field === 'japan') {
                activeDatabase = [...japanDatabase];
                btnJapan.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center bg-amber-900 text-white shadow-sm";
                btnAll.textContent = `全${japanDatabase.length}問`;
                document.getElementById("field-stats-badge").textContent = `江戸〜明治 (全${japanDatabase.length}問)`;
                
                // 日本史のときは同時期クイズを選択不可にするため、もし選ばれていたら並べ替えに戻す
                if (settingsMode === 'same_era') {
                    setQuizMode('sort');
                }
            } else if (field === 'world') {
                activeDatabase = [...worldDatabase];
                btnWorld.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center bg-amber-900 text-white shadow-sm";
                btnAll.textContent = `全${worldDatabase.length}問`;
                document.getElementById("field-stats-badge").textContent = `近代市民革命〜帝国主義 (全${worldDatabase.length}問)`;
                
                // 世界史のときも同時期クイズを選択不可にするため、もし選ばれていたら並べ替えに戻す
                if (settingsMode === 'same_era') {
                    setQuizMode('sort');
                }
            } else {
                // 'mixed' 混合モード
                activeDatabase = [...japanDatabase, ...worldDatabase];
                btnMixed.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center bg-amber-900 text-white shadow-sm";
                
                const totalMixedCount = japanDatabase.length + worldDatabase.length;
                btnAll.textContent = `全${totalMixedCount}問`;
                document.getElementById("field-stats-badge").textContent = `日本史 ＆ 世界史 混合 (全${totalMixedCount}問)`;
            }

            // 同時期できごとボタンの有効無効制御
            const btnSameEra = document.getElementById("btn-mode-same-era");
            if (field === 'mixed') {
                btnSameEra.classList.remove("opacity-50");
            } else {
                btnSameEra.classList.add("opacity-50");
            }

            updateWeakBadge();
            // 出題数ボタンのアクティブ・非アクティブを再適用
            setQuestionCount(settingsQuestionCount);
            applyThemeColor();
        }

        // クイズモードを切り替える
        function setQuizMode(mode) {
            if (mode === 'same_era' && settingsField !== 'mixed') {
                // 混合以外で同時期クイズをクリックした場合は、自動的に混合に切り替える
                setHistoryField('mixed');
            }

            settingsMode = mode;
            
            // 全てのクイズモードボタンのアクティブ状態を一旦解除
            const btnInput = document.getElementById("btn-mode-input");
            const btnChoice = document.getElementById("btn-mode-choice");
            const btnSort = document.getElementById("btn-mode-sort");
            const btnSameEra = document.getElementById("btn-mode-same-era");

            btnInput.className = "py-2 px-3 bg-white text-stone-700 border border-stone-300 rounded-xl text-xs font-bold hover:bg-stone-50 transition-all flex flex-col items-center justify-center gap-0.5";
            btnChoice.className = "py-2 px-3 bg-white text-stone-700 border border-stone-300 rounded-xl text-xs font-bold hover:bg-stone-50 transition-all flex flex-col items-center justify-center gap-0.5";
            btnSort.className = "py-2 px-3 bg-white text-stone-700 border border-stone-300 rounded-xl text-xs font-bold hover:bg-stone-50 transition-all flex flex-col items-center justify-center gap-0.5";
            btnSameEra.className = "py-2 px-3 bg-white text-stone-700 border border-stone-300 rounded-xl text-xs font-bold hover:bg-stone-50 transition-all flex flex-col items-center justify-center gap-0.5 relative";
            if (settingsField !== 'mixed') btnSameEra.classList.add("opacity-50");

            // 選択されたボタンを強調表示
            if (mode === 'input') {
                btnInput.className = "py-2 px-3 bg-amber-900 text-white rounded-xl text-xs font-bold transition-all border border-amber-900 flex flex-col items-center justify-center gap-0.5 shadow-inner";
            } else if (mode === 'choice') {
                btnChoice.className = "py-2 px-3 bg-amber-900 text-white rounded-xl text-xs font-bold transition-all border border-amber-900 flex flex-col items-center justify-center gap-0.5 shadow-inner";
            } else if (mode === 'sort') {
                btnSort.className = "py-2 px-3 bg-[#4c6444] text-white rounded-xl text-xs font-bold transition-all border border-[#4c6444] flex flex-col items-center justify-center gap-0.5 shadow-inner";
            } else if (mode === 'same_era') {
                btnSameEra.className = "py-2 px-3 bg-amber-900 text-white rounded-xl text-xs font-bold transition-all border border-amber-900 flex flex-col items-center justify-center gap-0.5 shadow-inner relative";
            }
            applyThemeColor();
        }

        // 修行スタイル（通常 vs 苦手克服）の設定
        function setTrainingStyle(isWeak) {
            isWeakOnlyMode = isWeak;
            const btnNormal = document.getElementById("btn-style-normal");
            const btnWeak = document.getElementById("btn-style-weak");
            const qCountSelector = document.getElementById("question-count-selector");
            const desc = document.getElementById("style-desc");

            if (isWeak) {
                btnNormal.className = "flex-1 py-1.5 px-3 rounded-lg text-xs md:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 text-stone-600 hover:text-stone-900";
                btnWeak.className = "flex-1 py-1.5 px-3 rounded-lg text-xs md:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 bg-amber-900 text-white shadow-sm";
                qCountSelector.classList.add("opacity-50", "pointer-events-none");
                desc.textContent = "よく間違えた問題ワースト5位（同率含む）から優先出題します。正解が不正解の1.5倍に達すると克服リストから卒業します。";
            } else {
                btnNormal.className = "flex-1 py-1.5 px-3 rounded-lg text-xs md:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 bg-amber-900 text-white shadow-sm";
                btnWeak.className = "flex-1 py-1.5 px-3 rounded-lg text-xs md:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 text-stone-600 hover:text-stone-900";
                qCountSelector.classList.remove("opacity-50", "pointer-events-none");
                desc.textContent = "全ての出来事からランダムに出題します。";
            }
            applyThemeColor();
        }

        // 出題数を設定する
        function setQuestionCount(count) {
            settingsQuestionCount = count;
            const counts = [10, 20, 'all'];

            counts.forEach(c => {
                const btn = document.getElementById(`btn-count-${c}`);
                if (c === count) {
                    btn.className = "flex-1 py-1.5 px-3 bg-amber-900 text-white rounded-lg text-xs font-semibold transition-colors";
                } else {
                    btn.className = "flex-1 py-1.5 px-3 bg-white text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-colors";
                }
            });
            applyThemeColor();
        }

        // カスタムアラートモーダル制御
        function showCustomAlert(title, message, iconClass = "fa-circle-info", iconColorClass = "text-amber-700") {
            document.getElementById("alert-title").textContent = title;
            document.getElementById("alert-message").textContent = message;
            document.getElementById("alert-icon").innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
            document.getElementById("alert-icon").className = `${iconColorClass} text-4xl mb-3`;
            document.getElementById("alert-modal").classList.remove("hidden");
        }

        function closeAlertModal() {
            document.getElementById("alert-modal").classList.add("hidden");
        }

        // ================= 中断確認・記録リセット関連の関数 =================
        function confirmExit() {
            document.getElementById("confirm-modal").classList.remove("hidden");
        }

        function closeConfirmModal() {
            document.getElementById("confirm-modal").classList.add("hidden");
        }

        // スタート画面に戻る
        function goToStart() {
            updateWeakBadge();
            const sortSubmitBtn = document.getElementById("sort-submit-btn");
            if (sortSubmitBtn) {
                sortSubmitBtn.disabled = false;
                sortSubmitBtn.classList.remove("opacity-50");
            }
            document.getElementById("start-screen").classList.remove("hidden");
            document.getElementById("quiz-screen").classList.add("hidden");
            document.getElementById("result-screen").classList.add("hidden");
            applyThemeColor();
        }

        function exitToStart() {
            closeConfirmModal();
            goToStart();
        }

        function closeResetConfirmModal() {
            document.getElementById("reset-confirm-modal").classList.add("hidden");
        }

        function executeResetStats() {
            localStorage.removeItem(STATS_KEY);
            updateWeakBadge();
            renderTimeline();
            closeResetConfirmModal();
            showCustomAlert("完了", "すべての記録をクリアしました！", "fa-circle-check", "text-green-600");
        }

        // ================= 同時期できごとペア検出用ヘルパー =================
        function generateAllSameEraPairs() {
            const pairs = [];
            
            // 1. まずは「完全一致（同じ年）」のペアを最優先で検索
            japanDatabase.forEach(jp => {
                const exactWorldMatch = worldDatabase.find(wd => wd.year === jp.year);
                if (exactWorldMatch) {
                    pairs.push({
                        jp: jp,
                        wd: exactWorldMatch,
                        year: jp.year,
                        exact: true
                    });
                }
            });

            // 2. 差分が少ない（±3年以内）ペアを緩やかにカバーして問題プールを十分に確保
            japanDatabase.forEach(jp => {
                if (pairs.some(p => p.jp.id === jp.id)) return;

                const nearWorldMatch = worldDatabase.find(wd => Math.abs(wd.year - jp.year) <= 3);
                if (nearWorldMatch) {
                    pairs.push({
                        jp: jp,
                        wd: nearWorldMatch,
                        year: Math.round((jp.year + nearWorldMatch.year) / 2),
                        exact: false
                    });
                }
            });
            return pairs;
        }

        function generateSameEraQuestions(count) {
            const allPairs = generateAllSameEraPairs();
            const shuffledPairs = shuffle(allPairs);
            return shuffledPairs.slice(0, count === 'all' ? shuffledPairs.length : count);
        }

        // 基準となる出来事から年代の「近い」西暦の異なる出来事4選を抽出するロジック
        function get4CloseDistinctYearEvents(database, baseItem = null) {
            if (database.length < 4) return [];
            
            // 1. 基準となる出来事を1つ選出（指定がなければランダム）
            if (!baseItem) {
                baseItem = database[Math.floor(Math.random() * database.length)];
            }
            
            // 2. 基準の出来事と「年号の差」が近い順に全データをマッピング＆ソート
            const sortedByDistance = [...database]
                .filter(item => item.id !== baseItem.id) // 自身は除外
                .map(item => ({
                    item: item,
                    distance: Math.abs(item.year - baseItem.year)
                }))
                .sort((a, b) => a.distance - b.distance); // 差が小さい順
            
            // 3. 年号が重複しないように近い順から3つ選出して合計4つの出来事セットを作る
            const selected = [baseItem];
            const selectedYears = new Set([baseItem.year]);
            
            for (const entry of sortedByDistance) {
                if (!selectedYears.has(entry.item.year)) {
                    selected.push(entry.item);
                    selectedYears.add(entry.item.year);
                }
                if (selected.length === 4) break;
            }
            
            // 万が一4つに満たない場合のフォールバック（通常の重複回避ランダム）
            if (selected.length < 4) {
                const fallbackSelected = [baseItem];
                const fallbackYears = new Set([baseItem.year]);
                const shuffledDb = shuffle(database);
                for (const item of shuffledDb) {
                    if (!fallbackYears.has(item.year)) {
                        fallbackSelected.push(item);
                        fallbackYears.add(item.year);
                    }
                    if (fallbackSelected.length === 4) return fallbackSelected;
                }
            }
            
            return selected;
        }

        // 【新仕様】抹茶色テーマの動的適用・連動処理（same_eraでも抹茶色に適用）
        function applyThemeColor() {
            const isMatcha = (settingsMode === 'sort' || settingsMode === 'same_era');
            const header = document.getElementById("app-header");
            const gtypeTabContainer = document.getElementById("gtype-tab-container");
            const btnGtypeQuiz = document.getElementById("btn-gtype-quiz");
            const btnGtypeSort = document.getElementById("btn-gtype-sort");
            const fieldStatsBadge = document.getElementById("field-stats-badge");
            const labelField = document.getElementById("label-field");
            const labelStyle = document.getElementById("label-style");
            const labelMode = document.getElementById("label-mode");
            const labelCount = document.getElementById("label-count");
            const startIcon = document.getElementById("start-icon");
            const settingBox = document.getElementById("setting-box");
            const startBtn = document.getElementById("start-game-btn");
            const sortSubmitBtn = document.getElementById("sort-submit-btn");
            const progressBar = document.getElementById("progress-bar");
            const modeBadge = document.getElementById("mode-badge");
            const nextBtn = document.getElementById("next-btn");

            // 各クイズアクティブボタン
            const activeButtons = [
                document.getElementById("btn-field-japan"),
                document.getElementById("btn-field-world"),
                document.getElementById("btn-field-mixed"),
                document.getElementById("btn-style-normal"),
                document.getElementById("btn-style-weak"),
                document.getElementById("btn-mode-input"),
                document.getElementById("btn-mode-choice"),
                document.getElementById("btn-mode-sort"),
                document.getElementById("btn-mode-same-era"),
                document.getElementById("btn-count-10"),
                document.getElementById("btn-count-20"),
                document.getElementById("btn-count-all")
            ];

            if (isMatcha) {
                // 抹茶グリーンテーマの適用
                if (header) header.className = "bg-[#4c6444] text-amber-50 py-4 px-6 shadow-md transition-colors duration-300";
                if (gtypeTabContainer) gtypeTabContainer.className = "flex bg-[#324535]/60 p-1 rounded-xl border border-[#3e5338]/40";
                if (globalGameType === 'sort_era') {
                    if (btnGtypeSort) btnGtypeSort.className = "px-3 py-1 rounded-lg text-xs font-bold transition-all bg-[#4c6444] text-white shadow-sm";
                    if (btnGtypeQuiz) btnGtypeQuiz.className = "px-3 py-1 rounded-lg text-xs font-bold transition-all text-[#cbdcb3] hover:text-white";
                }
                if (fieldStatsBadge) fieldStatsBadge.className = "text-[10px] text-[#556b3f] font-semibold";
                if (labelField) labelField.className = "font-bold text-[#4c6444] mb-1.5 flex items-center justify-between text-xs tracking-wider uppercase transition-colors";
                if (labelStyle) labelStyle.className = "font-bold text-[#4c6444] mb-1.5 flex items-center justify-between text-xs tracking-wider uppercase transition-colors";
                if (labelMode) labelMode.className = "font-bold text-[#4c6444] mb-1.5 flex items-center gap-1.5 text-xs tracking-wider uppercase transition-colors";
                if (labelCount) labelCount.className = "font-bold text-[#4c6444] mb-1.5 flex items-center gap-1.5 text-xs tracking-wider uppercase transition-colors";
                if (startIcon) startIcon.className = "text-[#4c6444] text-6xl mb-4 transition-colors";
                if (settingBox) settingBox.className = "bg-[#edf2e8] p-5 rounded-2xl mb-6 max-w-md mx-auto border border-[#cbdcb3] text-left space-y-4 animate-fade-in transition-colors";
                if (startBtn) startBtn.className = "flex-1 bg-[#4c6444] hover:bg-[#3d4f36] text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-base tracking-wider flex items-center justify-center gap-2";
                if (sortSubmitBtn) sortSubmitBtn.className = "w-full sm:w-2/3 bg-[#4c6444] hover:bg-[#3d4f36] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md";
                if (progressBar) progressBar.className = "bg-[#4c6444] h-full transition-all duration-300";
                if (modeBadge) {
                    let modeText = "並べ替え";
                    if (settingsMode === 'same_era') modeText = "同時期対比";
                    modeBadge.textContent = isReviewMode ? `苦手復習 (${modeText})` : (isWeakOnlyMode ? `苦手克服 (${modeText})` : `通常修行 (${modeText})`);
                    modeBadge.className = "text-[10px] md:text-xs bg-[#e2edd5] text-[#354931] font-bold px-2 py-1 rounded";
                }
                if (nextBtn) nextBtn.className = "hidden bg-[#4c6444] hover:bg-[#3d4f36] text-white font-bold py-2 px-5 rounded-lg transition-all items-center gap-1.5 text-sm";

                // アクティブボタンの色置換
                activeButtons.forEach(btn => {
                    if (btn && btn.classList.contains("bg-amber-900")) {
                        btn.className = btn.className.replace("bg-amber-900", "bg-[#4c6444]");
                        btn.className = btn.className.replace("border-amber-900", "border-[#4c6444]");
                    }
                });

            } else {
                // 通常の琥珀（アースブラウン）テーマの適用
                if (header) header.className = "bg-amber-900 text-amber-50 py-4 px-6 shadow-md transition-colors duration-300";
                if (gtypeTabContainer) gtypeTabContainer.className = "flex bg-amber-950/60 p-1 rounded-xl border border-amber-800/40";
                if (globalGameType === 'quiz') {
                    if (btnGtypeQuiz) btnGtypeQuiz.className = "px-3 py-1 rounded-lg text-xs font-bold transition-all bg-amber-900 text-white shadow-sm";
                    if (btnGtypeSort) btnGtypeSort.className = "px-3 py-1 rounded-lg text-xs font-bold transition-all text-amber-200 hover:text-white";
                }
                if (fieldStatsBadge) fieldStatsBadge.className = "text-[10px] text-stone-500 font-normal";
                if (labelField) labelField.className = "font-bold text-amber-900 mb-1.5 flex items-center justify-between text-xs tracking-wider uppercase transition-colors";
                if (labelStyle) labelStyle.className = "font-bold text-amber-900 mb-1.5 flex items-center justify-between text-xs tracking-wider uppercase transition-colors";
                if (labelMode) labelMode.className = "font-bold text-amber-900 mb-1.5 flex items-center gap-1.5 text-xs tracking-wider uppercase transition-colors";
                if (labelCount) labelCount.className = "font-bold text-amber-900 mb-1.5 flex items-center gap-1.5 text-xs tracking-wider uppercase transition-colors";
                if (startIcon) startIcon.className = "text-amber-700 text-6xl mb-4 transition-colors";
                if (settingBox) settingBox.className = "bg-amber-50 p-5 rounded-2xl mb-6 max-w-md mx-auto border border-amber-100 text-left space-y-4 animate-fade-in transition-colors";
                if (startBtn) startBtn.className = "flex-1 bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-base tracking-wider flex items-center justify-center gap-2";
                if (progressBar) progressBar.className = `${isReviewMode || isWeakOnlyMode ? "bg-red-600" : "bg-amber-600"} h-full transition-all duration-300`;
                if (modeBadge) {
                    modeBadge.textContent = isReviewMode ? "苦手復習" : (isWeakOnlyMode ? "苦手克服" : "通常修行");
                    modeBadge.className = `text-[10px] md:text-xs font-bold px-2 py-1 rounded ${isReviewMode || isWeakOnlyMode ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`;
                }
                if (nextBtn) nextBtn.className = "hidden bg-amber-800 hover:bg-amber-900 text-white font-bold py-2 px-5 rounded-lg transition-all items-center gap-1.5 text-sm";

                // アクティブボタンの色を元に戻す
                activeButtons.forEach(btn => {
                    if (btn && btn.classList.contains("bg-[#4c6444]")) {
                        btn.className = btn.className.replace("bg-[#4c6444]", "bg-amber-900");
                        btn.className = btn.className.replace("border-[#4c6444]", "border-amber-900");
                    }
                });
            }
        }

        // ゲーム開始 (通常プレイ & 苦手克服 & 並べ替え & 同時期)
        function startGame() {
            isReviewMode = false;
            const stats = getStats();
            
            if (isWeakOnlyMode) {
                // 【苦手克服モードの動作：新ルール適用】
                const weakItems = getWeakItemsForField(activeDatabase, stats);
                
                if (weakItems.length === 0) {
                    showCustomAlert(
                        "お知らせ", 
                        "苦手克服モードの対象となる問題がありません！\n（間違えた回数に対して正解数が1.5倍未満の問題が対象になります）\nまずは「通常修行」をプレイして、間違えた歴史を記録しましょう。",
                        "fa-circle-info",
                        "text-amber-700"
                    );
                    setTrainingStyle(false); // 通常モードに強制切り替え
                    return;
                }

                if (settingsMode === 'sort') {
                    // 苦手克服 + 並べ替え：各苦手項目をベースに近接セットを構築
                    const questionsList = [];
                    weakItems.forEach(item => {
                        const set = get4CloseDistinctYearEvents(activeDatabase, item);
                        if (set.length === 4) {
                            questionsList.push(set);
                        }
                    });
                    currentQuestions = shuffle(questionsList);
                } else if (settingsMode === 'same_era') {
                    // 苦手克服 + 同時期：苦手項目を含むペアを優先抽出
                    const allPairs = generateAllSameEraPairs();
                    const weakItemIds = new Set(weakItems.map(item => item.id));
                    const weakPairs = allPairs.filter(pair => weakItemIds.has(pair.jp.id) || weakItemIds.has(pair.wd.id));
                    
                    if (weakPairs.length === 0) {
                        currentQuestions = shuffle(allPairs).slice(0, 10);
                    } else {
                        currentQuestions = shuffle(weakPairs);
                    }
                } else {
                    // 通常の1問1答形式
                    currentQuestions = shuffle(weakItems);
                }

                document.getElementById("mode-badge").textContent = "苦手克服";
                document.getElementById("mode-badge").className = "text-[10px] md:text-xs bg-red-600 text-white font-bold px-2 py-1 rounded";
                document.getElementById("progress-bar").className = "bg-red-600 h-full transition-all duration-300";
            } else {
                let count = settingsQuestionCount;
                
                if (settingsMode === 'same_era') {
                    // 同時期できごとクイズ（特別生成）
                    currentQuestions = generateSameEraQuestions(count);
                } else if (settingsMode === 'sort') {
                    // 並べ替えモード：より近い年代同士の4選セットを作る
                    const questionsList = [];
                    const loops = (count === 'all') ? 10 : count; // 全問の場合はひとまず10問用意
                    for (let i = 0; i < loops; i++) {
                        const items = get4CloseDistinctYearEvents(activeDatabase);
                        if (items.length === 4) {
                            questionsList.push(items);
                        }
                    }
                    currentQuestions = questionsList;
                } else if (settingsField === 'mixed') {
                    // 通常の混合モード
                    const shuffledJapan = shuffle(japanDatabase);
                    const shuffledWorld = shuffle(worldDatabase);
                    
                    if (count === 'all') {
                        currentQuestions = shuffle([...japanDatabase, ...worldDatabase]);
                    } else {
                        const halfCount = count / 2;
                        const selectedJapan = shuffledJapan.slice(0, halfCount);
                        const selectedWorld = shuffledWorld.slice(0, halfCount);
                        currentQuestions = shuffle([...selectedJapan, ...selectedWorld]);
                    }
                } else {
                    // 通常の単一歴史分野モード
                    const shuffledDb = shuffle(activeDatabase);
                    if (count === 'all') {
                        count = activeDatabase.length;
                    }
                    currentQuestions = shuffledDb.slice(0, count);
                }

                document.getElementById("mode-badge").textContent = isWeakOnlyMode ? "苦手克服" : "通常修行";
                document.getElementById("mode-badge").className = isWeakOnlyMode ? "text-[10px] md:text-xs bg-red-600 text-white font-bold px-2 py-1 rounded" : "text-[10px] md:text-xs bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded";
                document.getElementById("progress-bar").className = isWeakOnlyMode ? "bg-red-600 h-full transition-all duration-300" : "bg-amber-600 h-full transition-all duration-300";
            }
            
            questionIndex = 0;
            score = 0;
            incorrectAnswers = [];
            incorrectQuestions = []; // 不正解オリジナル配列もリセット
            
            document.getElementById("start-screen").classList.add("hidden");
            document.getElementById("quiz-screen").classList.remove("hidden");
            document.getElementById("result-screen").classList.add("hidden");
            
            document.getElementById("current-score").textContent = score;
            document.getElementById("total-questions-count").textContent = currentQuestions.length;

            loadQuestion();
            applyThemeColor();
        }

        // 間違えた問題だけでやり直す処理
        function startReviewOnly() {
            isReviewMode = true;
            
            currentQuestions = shuffle(incorrectQuestions);
            
            questionIndex = 0;
            score = 0;
            incorrectAnswers = [];
            incorrectQuestions = []; // 今回間違えた用をリセット

            document.getElementById("mode-badge").textContent = "苦手復習";
            document.getElementById("mode-badge").className = "text-[10px] md:text-xs bg-red-100 text-red-800 font-bold px-2 py-1 rounded";
            document.getElementById("progress-bar").className = "bg-red-500 h-full transition-all duration-300";

            document.getElementById("start-screen").classList.add("hidden");
            document.getElementById("quiz-screen").classList.remove("hidden");
            document.getElementById("result-screen").classList.add("hidden");
            
            document.getElementById("current-score").textContent = score;
            document.getElementById("total-questions-count").textContent = currentQuestions.length;

            loadQuestion();
            applyThemeColor();
        }

        // 問題のロード
        function loadQuestion() {
            hasAnswered = false;
            
            // 【重要バグ修正】ここで判定ボタン（#sort-submit-btn）を確実に再活性化します！
            const sortSubmitBtn = document.getElementById("sort-submit-btn");
            if (sortSubmitBtn) {
                sortSubmitBtn.disabled = false;
                sortSubmitBtn.classList.remove("opacity-50");
            }

            document.getElementById("feedback-area").classList.add("hidden");
            document.getElementById("next-btn").classList.add("hidden");

            // 全表示エリアを一旦非表示
            document.getElementById("input-mode-area").classList.add("hidden");
            document.getElementById("choice-mode-area").classList.add("hidden");
            document.getElementById("sort-mode-area").classList.add("hidden");
            
            const currentQ = currentQuestions[questionIndex];
            document.getElementById("current-question-index").textContent = questionIndex + 1;
            
            const progressPercent = ((questionIndex + 1) / currentQuestions.length) * 100;
            document.getElementById("progress-bar").style.width = `${progressPercent}%`;

            // 【超安全ガード】並べ替えモード時はcurrentQが配列となるため、startsWithの参照エラーを防止
            const isJapanItem = (currentQ && currentQ.id) ? currentQ.id.startsWith("jp_") : false;
            document.getElementById("question-label").innerHTML = `
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isJapanItem ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'}">
                    ${isJapanItem ? '日本史' : '世界史'}
                </span>
                この出来事が起こった年（西暦）は？
            `;

            if (settingsMode === 'sort') {
                // ==================== 並べ替え（ソート）モード ====================
                document.getElementById("sort-mode-area").classList.remove("hidden");
                document.getElementById("question-box").classList.add("hidden"); // 上部のできごと欄は不要なので隠す

                sortCorrectCards = [...currentQ].sort((a, b) => a.year - b.year);
                
                let shuffled = shuffle(sortCorrectCards);
                while (shuffled.every((val, idx) => val.id === sortCorrectCards[idx].id)) {
                    shuffled = shuffle(sortCorrectCards);
                }
                sortDisplayCards = shuffled;
                selectedSortIndex = null;

                renderSortCards();

            } else if (settingsMode === 'same_era') {
                // ==================== 同時期のできごとクイズ ====================
                document.getElementById("choice-mode-area").classList.remove("hidden");
                document.getElementById("question-box").classList.remove("hidden");

                const isAskJapanToWorld = Math.random() > 0.5;

                let targetEventText = "";
                let correctEvent = null;
                let decoySourceDb = [];

                if (isAskJapanToWorld) {
                    targetEventText = `日本史の出来事『${currentQ.jp.event}』`;
                    correctEvent = currentQ.wd;
                    decoySourceDb = worldDatabase;
                } else {
                    targetEventText = `世界史の出来事『${currentQ.wd.event}』`;
                    correctEvent = currentQ.jp;
                    decoySourceDb = japanDatabase;
                }

                document.getElementById("question-label").innerHTML = `
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-800 text-white mr-1.5">同時期対比</span>
                    【${currentQ.year}年頃】に起きた出来事
                `;
                document.getElementById("question-text").innerHTML = `
                    ${targetEventText} が起きたのと<br class="hidden sm:inline">
                    <span class="text-amber-800 font-bold">同じ時期（同じ年）に起きた出来事</span>はどれ？
                `;

                const validDecoys = decoySourceDb.filter(item => {
                    return item.id !== correctEvent.id && Math.abs(item.year - currentQ.year) > 15;
                });
                const shuffledDecoys = shuffle(validDecoys);
                const dummyChoices = shuffledDecoys.slice(0, 3);

                const choices = [correctEvent, ...dummyChoices];
                const shuffledChoices = shuffle(choices);

                for (let i = 0; i < 4; i++) {
                    const btn = document.getElementById("choice-" + i);
                    const txt = document.getElementById("choice-text-" + i);
                    
                    const isChoiceJapan = shuffledChoices[i].id.startsWith("jp_");
                    txt.innerHTML = `
                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${isChoiceJapan ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'}">
                            ${isChoiceJapan ? '日本史' : '世界史'}
                        </span>
                        ${shuffledChoices[i].event}
                    `;
                    btn.className = "choice-btn w-full p-3.5 text-left border-2 border-stone-200 hover:border-amber-700 hover:bg-amber-50 rounded-xl font-medium text-stone-700 transition-all duration-150 flex items-center justify-between group cursor-pointer";
                    btn.disabled = false;
                    
                    btn.dataset.itemId = shuffledChoices[i].id;
                }

            } else {
                // ==================== A. 通常の出来事入力・4択モード ====================
                document.getElementById("question-box").classList.remove("hidden");
                
                document.getElementById("question-label").innerHTML = `
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isJapanItem ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'}">
                        ${isJapanItem ? '日本史' : '世界史'}
                    </span>
                    この出来事が起こった年（西暦）は？
                `;

                if (settingsMode === 'input') {
                    document.getElementById("input-mode-area").classList.remove("hidden");
                    document.getElementById("question-text").textContent = `「${currentQ.event}」`;
                    
                    currentInput = "";
                    updateDisplayDigits();
                    document.getElementById("submit-btn").disabled = true;

                    const keys = document.querySelectorAll(".key-btn");
                    keys.forEach(k => k.disabled = false);

                } else {
                    document.getElementById("choice-mode-area").classList.remove("hidden");
                    document.getElementById("question-label").innerHTML = `
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isJapanItem ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'}">
                            ${isJapanItem ? '日本史' : '世界史'}
                        </span>
                        この年に起こった（開始された）出来事はどれ？
                    `;
                    document.getElementById("question-text").innerHTML = `<span class="text-3xl font-bold font-mono text-amber-800">${currentQ.year}</span> 年`;

                    // ダミーの候補選出に activeDatabase を参照固定！
                    const dbIndex = activeDatabase.findIndex(item => item.id === currentQ.id);

                    const candidates = activeDatabase
                        .map((item, idx) => {
                            if (item.id === currentQ.id) return null;
                            // 同じ年の出来事はダミー候補から除外（正解が2つあるように見えるのを防ぐ）
                            if (item.year === currentQ.year) return null;
                            
                            let tagScore = 0;
                            if (item.tags && currentQ.tags) {
                                item.tags.forEach(t => {
                                    if (currentQ.tags.includes(t)) tagScore += 10;
                                });
                            }
                            
                            const isSameType = (item.id.startsWith("jp_") === currentQ.id.startsWith("jp_"));
                            if (isSameType) {
                                tagScore += 5;
                            }

                            const distance = Math.abs(idx - dbIndex);
                            const distanceScore = 1 / (distance + 1);
                            
                            const totalScore = tagScore + distanceScore;
                            return { item, score: totalScore };
                        });

                    const validCandidates = candidates.filter(c => c !== null);

                    validCandidates.sort((a, b) => b.score - a.score);
                    const dummyChoices = validCandidates.slice(0, 3).map(c => c.item);

                    const choices = [currentQ, ...dummyChoices];
                    const shuffledChoices = shuffle(choices);

                    for (let i = 0; i < 4; i++) {
                        const btn = document.getElementById("choice-" + i);
                        const txt = document.getElementById("choice-text-" + i);
                        
                        const isChoiceJapan = shuffledChoices[i].id.startsWith("jp_");
                        txt.innerHTML = `
                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${isChoiceJapan ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'}">
                                ${isChoiceJapan ? '日' : '世'}
                            </span>
                            ${shuffledChoices[i].event}
                        `;
                        btn.className = "choice-btn w-full p-3.5 text-left border-2 border-stone-200 hover:border-amber-700 hover:bg-amber-50 rounded-xl font-medium text-stone-700 transition-all duration-150 flex items-center justify-between group cursor-pointer";
                        btn.disabled = false;
                        
                        btn.dataset.itemId = shuffledChoices[i].id;
                    }
                }
            }
        }

        // ================= 並べ替えカードのレンダリング =================
        function renderSortCards() {
            const container = document.getElementById("sort-list-container");
            container.innerHTML = "";

            sortDisplayCards.forEach((card, idx) => {
                const isSelected = (selectedSortIndex === idx);
                const isJapan = card.id.startsWith("jp_");

                const div = document.createElement("div");
                div.onclick = () => selectSortCard(idx);
                div.className = `p-4 border-2 rounded-xl transition-all duration-150 flex items-center justify-between cursor-pointer ${
                    isSelected ? 'border-emerald-600 bg-emerald-50 shadow-md ring-2 ring-emerald-500/25 scale-[1.01]' : 'border-stone-200 bg-white hover:border-emerald-500'
                }`;

                let extraBadgeHTML = "";
                if (hasAnswered) {
                    const isPlaceCorrect = (card.id === sortCorrectCards[idx].id);
                    extraBadgeHTML = `
                        <div class="flex items-center gap-1.5 font-bold font-mono">
                            <span class="text-xs text-[#354931] bg-[#e2edd5] px-2 py-0.5 rounded">${card.year}年</span>
                            ${isPlaceCorrect ? '<span class="text-green-600 text-sm"><i class="fa-solid fa-circle-check"></i></span>' : '<span class="text-red-500 text-sm"><i class="fa-solid fa-circle-xmark"></i></span>'}
                        </div>
                    `;
                    div.onclick = null; // タップ無効
                    div.className = `p-4 border-2 rounded-xl flex items-center justify-between ${
                        isPlaceCorrect ? 'border-green-300 bg-green-50/20' : 'border-red-200 bg-red-50/20'
                    }`;
                }

                div.innerHTML = `
                    <div class="flex items-center gap-2 pr-3 overflow-hidden">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${isJapan ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'}">
                            ${isJapan ? '日本史' : '世界史'}
                        </span>
                        <span class="text-xs sm:text-sm font-semibold text-stone-800 truncate" title="${card.event}">${card.event}</span>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        ${extraBadgeHTML}
                        <i class="fa-solid fa-sort text-stone-300 text-sm"></i>
                    </div>
                `;
                container.appendChild(div);
            });
        }

        // 並べ替えカードの選択・入れ替え処理
        function selectSortCard(idx) {
            if (hasAnswered) return;

            if (selectedSortIndex === null) {
                selectedSortIndex = idx;
            } else {
                if (selectedSortIndex !== idx) {
                    const temp = sortDisplayCards[selectedSortIndex];
                    sortDisplayCards[selectedSortIndex] = sortDisplayCards[idx];
                    sortDisplayCards[idx] = temp;
                }
                selectedSortIndex = null;
            }
            renderSortCards();
        }

        // 並べ替えモード：回答判定
        function submitSortAnswer() {
            if (hasAnswered) return;
            hasAnswered = true;

            document.getElementById("sort-submit-btn").disabled = true;
            document.getElementById("sort-submit-btn").classList.add("opacity-50");

            const isAllCorrect = sortDisplayCards.every((val, idx) => val.id === sortCorrectCards[idx].id);

            renderSortCards();

            const feedbackArea = document.getElementById("feedback-area");
            const feedbackIcon = document.getElementById("feedback-icon");
            const feedbackTitle = document.getElementById("feedback-title");
            const feedbackTextMain = document.getElementById("feedback-text-main");
            const feedbackDescription = document.getElementById("feedback-description");
            const feedbackDescCard = document.getElementById("feedback-desc-card");

            feedbackArea.classList.remove("hidden");
            feedbackDescCard.classList.remove("hidden"); // 解説カードをバッチリ表示！

            // 4つの解説をループで美しく構築
            let descHTML = "";
            sortCorrectCards.forEach(c => {
                const isJp = c.id.startsWith("jp_");
                descHTML += `
                    <div class="p-3 bg-white border border-stone-200 rounded-lg shadow-sm text-left">
                        <div class="flex items-center gap-2 mb-1.5 text-xs">
                            <span class="font-bold font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">${c.year}年</span>
                            <span class="px-2 py-0.5 rounded text-[9px] font-bold ${isJp ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'}">
                                ${isJp ? '日本史' : '世界史'}
                            </span>
                            <span class="font-bold text-stone-800">${c.event}</span>
                        </div>
                        <p class="text-[11px] text-stone-600 leading-relaxed pl-2 border-l-2 border-[#4c6444]/60">${c.description}</p>
                    </div>
                `;
            });
            feedbackDescription.innerHTML = descHTML;

            if (isAllCorrect) {
                score++;
                document.getElementById("current-score").textContent = score;

                feedbackArea.className = "rounded-xl p-4 mb-4 flex flex-col gap-3 bg-green-50 border border-green-200 text-green-900";
                feedbackIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
                feedbackTitle.textContent = "お見事！完璧に一致しています！";
                feedbackTextMain.textContent = "すべての歴史のできごとを正しい時系列に並べ替えることができました！素晴らしい暗記力です！";

                sortCorrectCards.forEach(card => saveStats(card.id, true));
            } else {
                // 不正解のときは間違えた復習用の配列（incorrectQuestions）と結果用の配列（incorrectAnswers）に追加
                incorrectQuestions.push(sortCorrectCards);

                // 間違えた場所のカードを抽出してまとめ表示を作る
                const wrongCards = sortDisplayCards.filter((card, idx) => card.id !== sortCorrectCards[idx].id);
                const wrongNames = wrongCards.map(c => `「${c.event.substring(0, 8)}…」`).join(", ");

                incorrectAnswers.push({
                    question: `並べ替え失敗: ${wrongNames}`,
                    correct: sortCorrectCards.map(c => `${c.year}年`).join(" ➔ "),
                    wrong: sortDisplayCards.map(c => `${c.year}年`).join(" ➔ ")
                });

                feedbackArea.className = "rounded-xl p-4 mb-4 flex flex-col gap-3 bg-red-50 border border-red-200 text-red-900";
                feedbackIcon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
                feedbackTitle.textContent = "残念！並べ替えミスがあります";
                
                const correctOrderStr = sortCorrectCards.map(c => `・[${c.year}年] ${c.event}`).join("<br>");
                feedbackTextMain.innerHTML = `
                    正しい年代の順番は以下の通りです：<br>
                    <div class="mt-2 text-xs font-semibold font-serif text-stone-700 leading-relaxed text-left bg-white/70 p-3 rounded-xl border border-red-100">
                        ${correctOrderStr}
                    </div>
                `;

                sortDisplayCards.forEach((card, idx) => {
                    const isWrongPlace = (card.id !== sortCorrectCards[idx].id);
                    if (isWrongPlace) saveStats(card.id, false);
                });
            }

            document.getElementById("next-btn").classList.remove("hidden");
            document.getElementById("next-btn").classList.add("flex");
        }

        // ================= モードA: 直接入力の処理 =================
        function pressKey(key) {
            if (hasAnswered) return;

            if (key === "Backspace") {
                currentInput = currentInput.slice(0, -1);
            } else if (currentInput.length < 4) {
                currentInput += key;
            }

            updateDisplayDigits();

            const submitBtn = document.getElementById("submit-btn");
            if (currentInput.length === 4) {
                submitBtn.disabled = false;
                submitBtn.classList.add("bg-amber-800");
            } else {
                submitBtn.disabled = true;
                submitBtn.classList.remove("bg-amber-800");
            }
        }

        // 4マスの入力を表示
        function updateDisplayDigits() {
            for (let i = 0; i < 4; i++) {
                const box = document.getElementById("digit-" + i);
                if (i < currentInput.length) {
                    box.textContent = currentInput[i];
                    box.classList.remove("border-stone-300", "bg-stone-50");
                    box.classList.add("border-amber-600", "bg-amber-50/50");
                } else {
                    box.textContent = "";
                    box.classList.remove("border-amber-600", "bg-amber-50/50");
                    box.classList.add("border-stone-300", "bg-stone-50");
                }
                box.classList.remove("border-green-500", "bg-green-50", "border-red-400", "bg-red-50", "text-green-700", "text-red-700");
            }
        }

        // 回答判定
        function submitAnswer() {
            if (currentInput.length !== 4 || hasAnswered) return;
            hasAnswered = true;

            const currentQ = currentQuestions[questionIndex];
            const playerAnswer = parseInt(currentInput);
            const actualYear = currentQ.year;
            const isCorrect = (playerAnswer === actualYear);

            const keys = document.querySelectorAll(".key-btn");
            keys.forEach(k => k.disabled = true);

            for (let i = 0; i < 4; i++) {
                const box = document.getElementById("digit-" + i);
                box.classList.remove("border-amber-600", "bg-amber-50/50");
                if (isCorrect) {
                    box.classList.add("border-green-500", "bg-green-50", "text-green-700");
                } else {
                    box.classList.add("border-red-400", "bg-red-50", "text-red-700");
                }
            }

            saveStats(currentQ.id, isCorrect);
            showFeedback(isCorrect, playerAnswer, actualYear, currentQ.event);
        }

        // ================= モードB: 選択肢モードの処理 =================
        function selectChoice(choiceIdx) {
            if (hasAnswered) return;
            hasAnswered = true;

            const currentQ = currentQuestions[questionIndex];
            const selectedBtn = document.getElementById("choice-" + choiceIdx);
            
            let isCorrect = false;
            let displayTargetEvent = "";

            if (settingsMode === 'same_era') {
                const isJpToWd = (selectedBtn.dataset.itemId.startsWith("wd_"));
                const targetCorrectId = isJpToWd ? currentQ.wd.id : currentQ.jp.id;
                isCorrect = (selectedBtn.dataset.itemId === targetCorrectId);
                displayTargetEvent = isJpToWd ? currentQ.wd.event : currentQ.jp.event;

                saveStats(currentQ.jp.id, isCorrect);
                saveStats(currentQ.wd.id, isCorrect);
            } else {
                isCorrect = (selectedBtn.dataset.itemId === currentQ.id);
                displayTargetEvent = currentQ.event;
                saveStats(currentQ.id, isCorrect);
            }

            for (let i = 0; i < 4; i++) {
                const btn = document.getElementById("choice-" + i);
                btn.disabled = true;
                btn.classList.remove("hover:border-amber-700", "hover:bg-amber-50", "cursor-pointer");
                btn.classList.add("cursor-default");

                const targetCorrectId = (settingsMode === 'same_era') ? 
                    (selectedBtn.dataset.itemId.startsWith("wd_") ? currentQ.wd.id : currentQ.jp.id) : 
                    currentQ.id;

                if (btn.dataset.itemId === targetCorrectId) {
                    btn.classList.add("border-green-500", "bg-green-50", "text-green-800");
                }
            }

            if (!isCorrect) {
                selectedBtn.classList.add("border-red-400", "bg-red-50", "text-red-800");
            }

            const selectedText = document.getElementById("choice-text-" + choiceIdx).innerText.replace(/^(日本史|世界史)\s*/, "");
            showFeedback(isCorrect, selectedText, displayTargetEvent, currentQ.year);
        }

        // ================= 共通処理 =================
        function showFeedback(isCorrect, playerAnswer, correctAnswer, eventOrYear) {
            const feedbackArea = document.getElementById("feedback-area");
            const feedbackIcon = document.getElementById("feedback-icon");
            const feedbackTitle = document.getElementById("feedback-title");
            const feedbackTextMain = document.getElementById("feedback-text-main");
            const feedbackDescription = document.getElementById("feedback-description");
            const feedbackDescCard = document.getElementById("feedback-desc-card");

            feedbackArea.classList.remove("hidden");
            feedbackDescCard.classList.remove("hidden");

            const currentQ = currentQuestions[questionIndex];

            if (settingsMode === 'same_era') {
                feedbackDescription.innerHTML = `
                    <strong>● 日本史: 【${currentQ.jp.year}年】${currentQ.jp.event}</strong><br>${currentQ.jp.description}<br><br>
                    <strong>🗺 世界史: 【${currentQ.wd.year}年】${currentQ.wd.event}</strong><br>${currentQ.wd.description}
                `;
            } else {
                feedbackDescription.textContent = currentQ.description;
            }

            if (isCorrect) {
                score++;
                document.getElementById("current-score").textContent = score;

                feedbackArea.className = "rounded-xl p-4 mb-4 flex flex-col gap-3 bg-green-50 border border-green-200 text-green-900";
                feedbackIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
                feedbackTitle.textContent = "大正解！";

                if (settingsMode === 'input') {
                    feedbackTextMain.textContent = `「${correctAnswer}」が起きたのは、まさに【 ${eventOrYear}年 】です！すばらしい！`;
                } else if (settingsMode === 'same_era') {
                    feedbackTextMain.textContent = `その通り！【 ${eventOrYear}年頃 】に双方がほぼ同時期に起こりました！歴史がつながりましたね。`;
                } else {
                    feedbackTextMain.textContent = `【 ${eventOrYear}年 】に起きたのは、まさに「${correctAnswer}」です！すばらしい！`;
                }
            } else {
                incorrectQuestions.push(currentQ);

                let diffComment = "";
                if (settingsMode === 'input') {
                    // 【バグ修正箇所】引き算の対象を「eventOrYear（文字列）」から「correctAnswer（数値）」に正しく修正しました
                    const difference = Math.abs(playerAnswer - correctAnswer);
                    if (difference <= 3) {
                        diffComment = `惜しい！あと ${difference} 年のズレでした。`;
                    } else if (difference <= 10) {
                        diffComment = `かなり近い時代のできごとです（ズレ：${difference} 年）。`;
                    } else {
                        diffComment = `時代のズレは ${difference} 年です。`;
                    }

                    incorrectAnswers.push({
                        question: eventOrYear,
                        correct: `${correctAnswer}年`,
                        wrong: `${playerAnswer}年`
                    });

                    feedbackArea.className = "rounded-xl p-4 mb-4 flex flex-col gap-3 bg-red-50 border border-red-200 text-red-900";
                    feedbackIcon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
                    feedbackTitle.textContent = `不正解 (正解 is ${correctAnswer}年)`;
                    feedbackTextMain.textContent = `${diffComment} 正しくは 【 ${correctAnswer}年 】 です。解説を読んで覚え直そう！`;
                } else if (settingsMode === 'same_era') {
                    incorrectAnswers.push({
                        question: `【${currentQ.year}年頃】の対比クイズ`,
                        correct: correctAnswer,
                        wrong: playerAnswer
                    });

                    feedbackArea.className = "rounded-xl p-4 mb-4 flex flex-col gap-3 bg-red-50 border border-red-200 text-red-900";
                    feedbackIcon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
                    feedbackTitle.textContent = "不正解です";
                    feedbackTextMain.textContent = `正しくは「${correctAnswer}」でした。同時期の日本と世界のつながりを確認しよう。`;
                } else {
                    incorrectAnswers.push({
                        question: `${eventOrYear}年の出来事`,
                        correct: correctAnswer,
                        wrong: playerAnswer
                    });

                    feedbackArea.className = "rounded-xl p-4 mb-4 flex flex-col gap-3 bg-red-50 border border-red-200 text-red-900";
                    feedbackIcon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
                    feedbackTitle.textContent = "不正解です";
                    feedbackTextMain.textContent = `正解は「${correctAnswer}」でした。解説をチェックしてみよう！`;
                }
            }

            document.getElementById("next-btn").classList.remove("hidden");
            document.getElementById("next-btn").classList.add("flex");
        }

        function nextQuestion() {
            questionIndex++;
            if (questionIndex < currentQuestions.length) {
                document.getElementById("sort-submit-btn").disabled = false;
                document.getElementById("sort-submit-btn").classList.remove("opacity-50");
                loadQuestion();
            } else {
                showResults();
            }
        }

        function showResults() {
            document.getElementById("quiz-screen").classList.add("hidden");
            document.getElementById("result-screen").classList.remove("hidden");

            document.getElementById("result-score").textContent = score;
            document.getElementById("result-total").textContent = currentQuestions.length;

            let fieldLabel = '日本史';
            if (settingsField === 'world') fieldLabel = '世界史';
            else if (settingsField === 'mixed') fieldLabel = '日世混合';

            let modeLabel = '年号直接入力';
            if (settingsMode === 'choice') modeLabel = '出来事選択4択';
            else if (settingsMode === 'sort') modeLabel = '通常の並べ替え';
            else if (settingsMode === 'same_era') modeLabel = '同時期できごとクイズ';
            
            let reviewModeText = "";
            if (isReviewMode) reviewModeText = "【苦手復習】";
            else if (isWeakOnlyMode) reviewModeText = "【苦手克服】";

            document.getElementById("result-mode-label").textContent = `${reviewModeText}分野: ${fieldLabel} | モード: ${modeLabel}`;

            const scoreRate = score / currentQuestions.length;
            let evaluation = "";
            if (scoreRate === 1) {
                evaluation = (isReviewMode || isWeakOnlyMode) ? "🎉 素晴らしい！弱点を完全に克服しました！" : "👑 歴史グランドマスター！完璧な暗記です！";
            } else if (scoreRate >= 0.8) {
                evaluation = "🌟 素晴らしい！本物の実力が身についています！";
            } else if (scoreRate >= 0.5) {
                evaluation = "🎯 合格点です！あやふやな歴史をタイムラインで復習してみましょう！";
            } else {
                evaluation = "✍️ 伸び代たっぷり！間違えた問題は年表からじっくり復習できますよ。";
            }
            document.getElementById("result-evaluation").textContent = evaluation;

            const reviewArea = document.getElementById("incorrect-review-area");
            const listContainer = document.getElementById("incorrect-list");
            listContainer.innerHTML = "";

            const btnReviewOnly = document.getElementById("btn-review-only");

            if (incorrectAnswers.length > 0) {
                reviewArea.classList.remove("hidden");
                btnReviewOnly.classList.remove("hidden");
                btnReviewOnly.innerHTML = `<i class="fa-solid fa-triangle-exclamation animate-bounce"></i> 間違えた問題のみ (${incorrectQuestions.length}問) で再挑戦！`;

                incorrectAnswers.forEach(item => {
                    const div = document.createElement("div");
                    div.className = "p-3 bg-stone-50 border border-stone-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs md:text-sm";
                    div.innerHTML = `
                        <div class="font-medium text-stone-700">${item.question}</div>
                        <div class="flex items-center gap-2">
                            <span class="text-stone-400 font-mono">（入力：${item.wrong}）</span>
                            <i class="fa-solid fa-arrow-right text-stone-400"></i>
                            <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">${item.correct}</span>
                        </div>
                    `;
                    listContainer.appendChild(div);
                });
            } else {
                reviewArea.classList.add("hidden");
                btnReviewOnly.classList.add("hidden");
            }
        }

        // ================= 年表（スタッツ年表）表示とタップ解説の処理 =================
        function openTimeline() {
            renderTimeline();
            document.getElementById("timeline-screen").classList.remove("hidden");
        }

        function closeTimeline() {
            document.getElementById("timeline-screen").classList.add("hidden");
        }

        // 年表カードをタップしたときにポップアップ詳細を出す関数
        // items: 同じ年・同じ分野の出来事の配列（1件でも複数件でもOK）
        function showTimelineDetail(items, type) {
            const modal = document.getElementById("timeline-detail-modal");
            const badge = document.getElementById("td-badge");
            const year = document.getElementById("td-year");
            const entriesContainer = document.getElementById("td-entries");

            year.textContent = `${items[0].year}年`;

            if (type === 'japan') {
                badge.textContent = "日本史";
                badge.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800";
            } else {
                badge.textContent = "世界史";
                badge.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800";
            }

            entriesContainer.innerHTML = items.map(item => `
                <div class="bg-stone-50 border border-stone-200 rounded-xl p-4">
                    <h4 class="text-sm font-bold text-stone-900 japanese-font leading-snug mb-1.5">${item.event}</h4>
                    <p class="text-xs md:text-sm text-stone-600 leading-relaxed">${item.description}</p>
                </div>
            `).join("");

            modal.classList.remove("hidden");
        }

        function closeTimelineDetail() {
            document.getElementById("timeline-detail-modal").classList.add("hidden");
        }

        // 歴史年表に格納するカードのHTML生成
        // items: 同じ年・同じ分野の出来事の配列。複数あっても必ず1枚のカードにまとめる（＝縦の並びは日本史・世界史の2段のみになる）
        function createTimelineCard(items, stats, type) {
            let correctSum = 0;
            let wrongSum = 0;
            items.forEach(item => {
                const s = stats[item.id] || { correct: 0, wrong: 0 };
                correctSum += s.correct;
                wrongSum += s.wrong;
            });

            let borderClass = "border-stone-200 bg-white";
            if (wrongSum > 0 && wrongSum >= correctSum) {
                borderClass = "border-red-300 bg-red-50/30";
            } else if (correctSum > 0) {
                borderClass = "border-green-300 bg-green-50/10";
            }

            const card = document.createElement("div");
            card.className = `w-full ${borderClass} border rounded-xl p-3 flex flex-col justify-between shadow-sm transition-all hover:scale-[1.03] duration-150 h-32 cursor-pointer`;
            
            card.onclick = (e) => {
                e.stopPropagation();
                showTimelineDetail(items, type);
            };

            const countBadge = items.length > 1
                ? `<span class="ml-1 text-[8px] bg-stone-700/80 text-white px-1.5 py-[1px] rounded-full">${items.length}件</span>`
                : "";
            const eventLabel = items.map(it => it.event).join(" ／ ");

            card.innerHTML = `
                <div class="flex flex-col justify-between h-full">
                    <div class="text-[9px] font-bold ${type === 'japan' ? 'text-amber-800' : 'text-stone-600'} uppercase tracking-wider flex items-center">
                        ${type === 'japan' ? '● 日本' : '🗺 世界'}${countBadge}
                    </div>
                    <div class="text-xs text-stone-700 font-medium leading-snug break-words h-14 overflow-hidden line-clamp-3 my-1" title="${eventLabel}">
                        ${eventLabel}
                    </div>
                    <div class="pt-1 border-t border-stone-100 flex justify-between text-[9px] font-bold">
                        <span class="text-green-600"><i class="fa-solid fa-square-check"></i> ${correctSum}</span>
                        <span class="text-red-500"><i class="fa-solid fa-square-xmark"></i> ${wrongSum}</span>
                    </div>
                </div>
            `;
            return card;
        }

        function renderTimeline() {
            const stats = getStats();
            const container = document.getElementById("timeline-cols-container");
            container.innerHTML = "";

            // 日本史と世界史のすべての年号を取得し、ソートして重複を排除
            const allYears = Array.from(new Set([
                ...japanDatabase.map(d => d.year),
                ...worldDatabase.map(d => d.year)
            ])).sort((a, b) => a - b);

            allYears.forEach(y => {
                const jpItems = japanDatabase.filter(d => d.year === y);
                const wdItems = worldDatabase.filter(d => d.year === y);

                const col = document.createElement("div");
                col.className = "flex flex-col items-center w-48 flex-shrink-0 gap-2";

                // 1. 上段：日本史エリア（同じ年の出来事は必ず1枚のカードにまとめる＝縦に増えない）
                const jpArea = document.createElement("div");
                jpArea.className = "w-full flex flex-col flex-grow justify-end min-h-[128px]";
                if (jpItems.length > 0) {
                    jpArea.appendChild(createTimelineCard(jpItems, stats, "japan"));
                } else {
                    const placeholder = document.createElement("div");
                    placeholder.className = "w-full h-32 border border-dashed border-stone-200 bg-stone-50/20 rounded-xl flex items-center justify-center text-[10px] text-stone-300 font-sans";
                    placeholder.textContent = "-";
                    jpArea.appendChild(placeholder);
                }

                // 2. 中段：中央年号バッジ
                const yearBadge = document.createElement("div");
                yearBadge.className = "w-full py-1 bg-amber-900 text-amber-50 rounded-lg text-xs font-bold text-center font-mono shadow-sm border border-amber-800/80 my-1 flex-shrink-0 sticky z-10";
                yearBadge.textContent = `${y} 年`;

                // 3. 下段：世界史エリア（同じ年の出来事は必ず1枚のカードにまとめる＝縦に増えない）
                const wdArea = document.createElement("div");
                wdArea.className = "w-full flex flex-col flex-grow justify-start min-h-[128px]";
                if (wdItems.length > 0) {
                    wdArea.appendChild(createTimelineCard(wdItems, stats, "world"));
                } else {
                    const placeholder = document.createElement("div");
                    placeholder.className = "w-full h-32 border border-dashed border-stone-200 bg-stone-50/20 rounded-xl flex items-center justify-center text-[10px] text-stone-300 font-sans";
                    placeholder.textContent = "-";
                    wdArea.appendChild(placeholder);
                }

                col.appendChild(jpArea);
                col.appendChild(yearBadge);
                col.appendChild(wdArea);
                container.appendChild(col);
            });
        }

        // もう一度挑戦する処理
        function restartGame() {
            startGame();
        }
