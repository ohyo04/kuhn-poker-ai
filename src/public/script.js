'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    // --- モバイルビューポート調整 ---
    function adjustMobileViewport() {
        if (window.innerWidth <= 799) {
            // 実際のビューポート高さを取得
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
            
            // メインコンテンツエリアの高さを動的に調整
            const mainContent = document.getElementById('content-area');
            if (mainContent) {
                const bottomNavHeight = 80; // 下部ナビの高さ
                const adjustedHeight = window.innerHeight - bottomNavHeight;
                mainContent.style.height = `${adjustedHeight}px`;
                mainContent.style.maxHeight = `${adjustedHeight}px`;
            }
            
            // ゲームテーブルも調整
            const gameTable = document.getElementById('game-table');
            if (gameTable) {
                const tableHeight = window.innerHeight - 200; // 余裕を持った計算
                gameTable.style.minHeight = `${Math.max(tableHeight, 300)}px`;
            }
        }
    }
    
    // 初期調整
    adjustMobileViewport();
    
    // ウィンドウサイズ変更時に再調整
    window.addEventListener('resize', adjustMobileViewport);
    window.addEventListener('orientationchange', () => {
        setTimeout(adjustMobileViewport, 100);
    });

    // --- 認証チェック ---
    const authToken = localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!authToken || !currentUser.username) {
        // 未ログインの場合、ログイン画面にリダイレクト
        alert('ログインが必要です。ログイン画面に移動します。');
        window.location.href = 'login.html';
        return;
    }

    // --- API通信用のヘルパー関数 ---
    async function apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...options.headers }
        };

        try {
            const response = await fetch(`/api${endpoint}`, mergedOptions);
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // トークン無効の場合、ログアウト
                    logout();
                    return null;
                }
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // --- ログアウト機能 ---
    function logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        alert('セッションが無効になりました。ログイン画面に移動します。');
        window.location.href = 'login.html';
    }

    // --- ユーザーデータの読み込み ---
    let currentUserData = {
        stats: { gamesPlayed: 0, playerWins: 0, opponentWins: 0, totalProfit: 0 },
        history: [],
        aiTypes: { player: 'human', opponent: 'kensjitsu' },
        customAiSettings: {
            player: { name: "カスタムAI", s1_a_bet: 0.8, s1_k_bet: 0.0, s1_q_bet: 0.1, s1_a_call: 1.0, s1_k_call: 0.1, s1_q_call: 0.0, s2_a_bet: 1.0, s2_k_bet: 0.0, s2_q_bet: 0.1, s2_a_call: 1.0, s2_k_call: 0.2, s2_q_call: 0.0 },
            opponent: { name: "カスタムAI", s1_a_bet: 0.8, s1_k_bet: 0.0, s1_q_bet: 0.1, s1_a_call: 1.0, s1_k_call: 0.1, s1_q_call: 0.0, s2_a_bet: 1.0, s2_k_bet: 0.0, s2_q_bet: 0.1, s2_a_call: 1.0, s2_k_call: 0.2, s2_q_call: 0.0 }
        }
    };

    // サーバーからデータを取得
    async function loadUserData() {
        try {
            const [stats, history, aiSettings] = await Promise.all([
                apiRequest('/stats'),
                apiRequest('/history'),
                apiRequest('/ai-settings')
            ]);
            
            if (stats) currentUserData.stats = stats;
            if (history) currentUserData.history = history;
            if (aiSettings) {
                if (aiSettings.player) {
                    currentUserData.aiTypes.player = aiSettings.player.aiType;
                    currentUserData.customAiSettings.player = aiSettings.player.settings;
                }
                if (aiSettings.opponent) {
                    currentUserData.aiTypes.opponent = aiSettings.opponent.aiType;
                    currentUserData.customAiSettings.opponent = aiSettings.opponent.settings;
                }
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    // データをサーバーに保存
    async function saveGameResult(gameData) {
        try {
            await apiRequest('/game-result', {
                method: 'POST',
                body: JSON.stringify(gameData)
            });
        } catch (error) {
            console.error('Failed to save game result:', error);
        }
    }

    async function saveAiSettings(role, aiType, settings) {
        try {
            await apiRequest('/ai-settings', {
                method: 'POST',
                body: JSON.stringify({ role, aiType, settings })
            });
        } catch (error) {
            console.error('Failed to save AI settings:', error);
        }
    }

    // --- HTML要素の取得 ---
    const elements = {
        startScreen: document.getElementById('start-screen'),
        initialStartButton: document.getElementById('initial-start-button'),
        mainGameContainer: document.getElementById('main-game-container'),
        playerHand: document.getElementById('player-hand'),
        opponentHand: document.getElementById('opponent-hand'),
        playerChips: document.getElementById('player-chips'),
        opponentChips: document.getElementById('opponent-chips'),
        potAmount: document.getElementById('pot-amount'),
        messageArea: document.getElementById('message-area'),
        betButton: document.getElementById('bet-button'),
        checkButton: document.getElementById('check-button'),
        callButton: document.getElementById('call-button'),
        foldButton: document.getElementById('fold-button'),
        newGameButton: document.getElementById('new-game-button'),
        playerWins: document.getElementById('player-wins'),
        opponentWins: document.getElementById('opponent-wins'),
        playerEv: document.getElementById('player-ev'),
        playerAiTypeSelect: document.getElementById('player-ai-type'),
        opponentAiTypeSelect: document.getElementById('opponent-ai-type'),
        openPlayerSettingsButton: document.getElementById('open-player-settings-button'),
        openOpponentSettingsButton: document.getElementById('open-opponent-settings-button'),
        statsHubScreen: document.getElementById('stats-hub-screen'),
        simulatorScreen: document.getElementById('simulator-screen'),
        playerSettingsScreen: document.getElementById('player-settings-screen'),
        opponentSettingsScreen: document.getElementById('opponent-settings-screen'),
        simP1SettingsScreen: document.getElementById('sim-p1-settings-screen'),
        simP2SettingsScreen: document.getElementById('sim-p2-settings-screen'),
        strategyDetailsOverlay: document.getElementById('strategy-details-overlay'),
        navTabs: document.querySelectorAll('.nav-tab'),
        statsFilterOpponentAi: document.getElementById('filter-opponent-ai'),
        statsFilterPlayerCard: document.getElementById('filter-player-card'),
        statsTotalGames: document.getElementById('stats-total-games'),
        statsWinRate: document.getElementById('stats-win-rate'),
        statsTotalProfit: document.getElementById('stats-total-profit'),
        statsEv: document.getElementById('stats-ev'),
        replayList: document.getElementById('replay-list'),
        clearStatsButton: document.getElementById('clear-stats-button'),
        winRateChartCanvas: document.getElementById('win-rate-by-card-chart'),
        simPlayer1Select: document.getElementById('sim-player1-ai'),
        simPlayer2Select: document.getElementById('sim-player2-ai'),
        simP1SettingsButton: document.getElementById('sim-p1-settings-button'),
        simP2SettingsButton: document.getElementById('sim-p2-settings-button'),
        simGameCountInput: document.getElementById('sim-game-count'),
        startSimButton: document.getElementById('start-simulation-button'),
        simResultsContainer: document.getElementById('simulator-results'),
        simResultText: document.getElementById('sim-result-text'),
        simP1StrategyCard: document.getElementById('sim-p1-strategy-card'),
        simP2StrategyCard: document.getElementById('sim-p2-strategy-card'),
        simEvChartCanvas: document.getElementById('sim-ev-chart'),
    };

    // --- ゲーム状態の管理 ---
    const CARDS = { 'A': 3, 'K': 2, 'Q': 1 };
    const DECK = ['A', 'K', 'Q'];
    let state = {};
    let simChart = null;

    // --- AIの定義済みプロファイル ---
    const aiProfiles = {
        kensjitsu: { name: "堅実", s1_a_bet: 0.8, s1_k_bet: 0.0, s1_q_bet: 0.1, s1_a_call: 1.0, s1_k_call: 0.1, s1_q_call: 0.0, s2_a_bet: 1.0, s2_k_bet: 0.0, s2_q_bet: 0.1, s2_a_call: 1.0, s2_k_call: 0.2, s2_q_call: 0.0 },
        kiai: { name: "気合太郎", s1_a_bet: 1.0, s1_k_bet: 0.8, s1_q_bet: 0.7, s1_a_call: 1.0, s1_k_call: 0.9, s1_q_call: 0.8, s2_a_bet: 1.0, s2_k_bet: 0.8, s2_q_bet: 0.7, s2_a_call: 1.0, s2_k_call: 0.9, s2_q_call: 0.8 },
        mitaiman: { name: "フロップ見たいマン", s1_a_bet: 0.2, s1_k_bet: 0.1, s1_q_bet: 0.0, s1_a_call: 1.0, s1_k_call: 0.9, s1_q_call: 0.9, s2_a_bet: 0.2, s2_k_bet: 0.1, s2_q_bet: 0.0, s2_a_call: 1.0, s2_k_call: 0.9, s2_q_call: 0.9 },
        tightaggressive: { name: "タイトアグレ", s1_a_bet: 1.0, s1_k_bet: 0.1, s1_q_bet: 0.8, s1_a_call: 1.0, s1_k_call: 0.0, s1_q_call: 0.0, s2_a_bet: 1.0, s2_k_bet: 0.1, s2_q_bet: 0.8, s2_a_call: 1.0, s2_k_call: 0.0, s2_q_call: 0.0 },
        gto: { name: "GTO AI", s1_a_bet: 0.333, s1_k_bet: 0.0, s1_q_bet: 0.333, s1_a_call: 1.0, s1_k_call: 0.0, s1_q_call: 0.0, s2_a_bet: 1.0, s2_k_bet: 0.0, s2_q_bet: 0.333, s2_a_call: 1.0, s2_k_call: 0.333, s2_q_call: 0.0 },
    };
    
    let currentAiSettings = { player: {}, opponent: {} };
    let simulatorCustomAiSettings = { p1: {}, p2: {} };

    // --- Helper Functions ---
    // saveUserData関数は削除（データベース連携に変更）

    function syncCurrentSettings(actor, aiType) {
        if (aiType === 'custom') {
            currentAiSettings[actor] = { ...currentUserData.customAiSettings[actor] };
        } else if (aiProfiles[aiType]) {
            currentAiSettings[actor] = { ...aiProfiles[aiType] };
        }
    }

    function showScreen(screenName) {
        document.querySelectorAll('.content-screen').forEach(s => s.classList.remove('active'));
        if (screenName === 'start') {
            elements.startScreen.classList.add('active');
        } else if (screenName === 'game') {
            elements.mainGameContainer.classList.add('active');
        } else if (screenName === 'stats') {
            updateStatsHub();
            elements.statsHubScreen.classList.add('active');
        } else if (screenName === 'simulator') {
            updateSimulatorStrategyDisplay();
            elements.simulatorScreen.classList.add('active');
        }
    }
    
    function showMessage(msg) { elements.messageArea.innerHTML = msg; }

    function updateActionButtons(actions = {}) {
        elements.betButton.classList.toggle('hidden', !actions.bet);
        elements.checkButton.classList.toggle('hidden', !actions.check);
        elements.callButton.classList.toggle('hidden', !actions.call);
        elements.foldButton.classList.toggle('hidden', !actions.fold);
        elements.newGameButton.classList.add('hidden');
    }

    function updateDisplay() {
        elements.playerChips.textContent = state.chips.player;
        elements.opponentChips.textContent = state.chips.opponent;
        elements.potAmount.textContent = state.pot;
        elements.playerHand.innerHTML = `<div class="card">${state.cards.player}</div>`;
        
        if (!state.isGameOver) {
            elements.opponentHand.innerHTML = `<div class="card facedown"></div>`;
        }

        elements.playerWins.textContent = currentUserData.stats.playerWins;
        elements.opponentWins.textContent = currentUserData.stats.opponentWins;
        elements.playerEv.textContent = (currentUserData.stats.gamesPlayed > 0 ? (currentUserData.stats.totalProfit / currentUserData.stats.gamesPlayed).toFixed(2) : '0.00');
    }

    function showSettingsOverlay(actor, show) {
        const screen = elements[`${actor}SettingsScreen`];
        screen.classList.toggle('active', show);
    }

    // --- Statistics Functions ---
    function initializeFilters() {
        const opponentAiFilter = elements.statsFilterOpponentAi;
        while (opponentAiFilter.options.length > 1) opponentAiFilter.remove(1);
        for (const key in aiProfiles) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = aiProfiles[key].name;
            opponentAiFilter.appendChild(option);
        }
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = 'カスタムAI';
        opponentAiFilter.appendChild(customOption);
        
        opponentAiFilter.addEventListener('change', updateStatsHub);
        elements.statsFilterPlayerCard.addEventListener('change', updateStatsHub);
    }

    function displayFilteredStats(filteredHistory) {
        const totalGames = filteredHistory.length;
        const totalWins = countGames(filteredHistory, log => log.winner === 'player');
        const totalProfit = filteredHistory.reduce((sum, log) => sum + log.profit, 0);

        elements.statsTotalGames.textContent = totalGames;
        elements.statsWinRate.textContent = totalGames > 0 ? `${(totalWins / totalGames * 100).toFixed(2)}%` : '0.00%';
        elements.statsTotalProfit.textContent = totalProfit.toFixed(2);
        elements.statsEv.textContent = totalGames > 0 ? (totalProfit / totalGames).toFixed(3) : '0.00';

        ['A', 'K', 'Q'].forEach(card => {
            const totalFirstActionGames = countGames(filteredHistory, log => log.isPlayerFirst && log.playerCard === card);
            const betGames = countGames(filteredHistory, log => log.isPlayerFirst && log.playerCard === card && log.history.startsWith('b'));
            const betRate = totalFirstActionGames > 0 ? (betGames / totalFirstActionGames * 100) : 0;
            const betRateElement = document.getElementById(`stats-bet-rate-${card}`);
            if(betRateElement) betRateElement.textContent = totalFirstActionGames > 0 ? `${betRate.toFixed(2)}%` : '-.--%';
        });
        
        const facedBetTotal = countGames(filteredHistory, log => (!log.isPlayerFirst && log.history.startsWith('b')) || (log.isPlayerFirst && log.history.startsWith('cb')));
        const calledGamesTotal = countGames(filteredHistory, log => (!log.isPlayerFirst && log.history.startsWith('bk')) || (log.isPlayerFirst && log.history.startsWith('cbk')));
        const callRateTotal = facedBetTotal > 0 ? (calledGamesTotal / facedBetTotal * 100) : 0;
        const callRateTotalElement = document.getElementById('stats-call-rate-total');
        if(callRateTotalElement) callRateTotalElement.textContent = facedBetTotal > 0 ? `${callRateTotal.toFixed(2)}%` : '-.--%';

        ['A', 'K'].forEach(card => {
            const facedBetWithCard = countGames(filteredHistory, log => log.playerCard === card && ((!log.isPlayerFirst && log.history.startsWith('b')) || (log.isPlayerFirst && log.history.startsWith('cb'))));
            const calledGamesWithCard = countGames(filteredHistory, log => log.playerCard === card && ((!log.isPlayerFirst && log.history.startsWith('bk')) || (log.isPlayerFirst && log.history.startsWith('cbk'))));
            const callRate = facedBetWithCard > 0 ? (calledGamesWithCard / facedBetWithCard * 100) : 0;
            const callRateElement = document.getElementById(`stats-call-rate-${card}`);
            if(callRateElement) callRateElement.textContent = facedBetWithCard > 0 ? `${callRate.toFixed(2)}%` : '-.--%';
        });
        
        updateReplayList(filteredHistory);
    }
    
    function updateStatsHub() {
        const opponentFilter = elements.statsFilterOpponentAi.value;
        const cardFilter = elements.statsFilterPlayerCard.value;
        
        let filteredHistory = (currentUserData.history || []).filter(log => {
            const opponentMatch = opponentFilter === 'all' || log.opponentAi === opponentFilter;
            const cardMatch = cardFilter === 'all' || log.playerCard === cardFilter;
            return opponentMatch && cardMatch;
        });
        
        displayFilteredStats(filteredHistory);
    }

    function updateReplayList(history) {
        elements.replayList.innerHTML = '';
        history.forEach(log => {
            const li = document.createElement('li');
            const resultClass = log.winner === 'player' ? 'win' : 'lose';
            const resultText = log.winner === 'player' ? '勝利' : '敗北';
            const opponentName = (aiProfiles[log.opponentAi] || {name: 'カスタムAI'}).name;
            li.innerHTML = `
                <span class="replay-info">あなた(${log.playerCard}) vs 相手(${log.opponentCard}) - <strong>${opponentName}</strong></span>
                <span><span class="replay-result ${resultClass}">${resultText}</span></span>`;
            elements.replayList.appendChild(li);
        });
    }

    function countGames(history, filterFn) {
        return history.filter(filterFn).length;
    }

    // --- Game Logic ---
    function initializeGame() {
        state.stats = currentUserData.stats;
        state = { ...state, chips: { player: 1, opponent: 1 }, pot: 2, history: '', isGameOver: false };
        state.isPlayerFirst = ((currentUserData.stats.gamesPlayed || 0) + 1) % 2 !== 0;
        const shuffledDeck = [...DECK].sort(() => Math.random() - 0.5);
        state.cards = {
            player: state.isPlayerFirst ? shuffledDeck[0] : shuffledDeck[1],
            opponent: state.isPlayerFirst ? shuffledDeck[1] : shuffledDeck[0],
        };
        updateDisplay();
        nextTurn();
    }
    
    function nextTurn() {
        if (state.isGameOver) return;
        const isPlayerTurn = (state.isPlayerFirst && state.history.length % 2 === 0) || (!state.isPlayerFirst && state.history.length % 2 !== 0);
        const currentActor = isPlayerTurn ? 'player' : 'opponent';
        const currentAiType = state.aiTypes[currentActor];
        if (currentAiType === 'human') {
            if (state.history.endsWith('b')) {
                showMessage("あなたの番です。コールまたはフォールド。");
                updateActionButtons({ call: true, fold: true });
            } else {
                showMessage(`あなたの番です。ベットまたはチェック。`);
                updateActionButtons({ bet: true, check: true });
            }
        } else {
            showMessage(`${currentActor === 'player' ? 'あなた' : '相手'}(AI)の番です...`);
            updateActionButtons({});
            setTimeout(() => handleAiTurn(currentActor), 1000);
        }
    }

    function handleHumanAction(action) { processAction(action, 'player'); }
    function handleAiTurn(actor) {
        const card = state.cards[actor];
        const decision = getAiDecision(actor, card, state.history, state.isPlayerFirst);
        processAction(decision, actor);
    }
    
    function processAction(action, actor) {
        state.history += action;
        const actorName = actor === 'player' ? (state.aiTypes.player === 'human' ? 'あなた' : 'あなた(AI)') : '相手(AI)';
        showMessage(`${actorName}は「${{b:'ベット',c:'チェック',k:'コール',f:'フォールド'}[action]}」しました。`);
        if (action === 'b' || action === 'k') {
            state.chips[actor]--;
            state.pot++;
        }
        updateDisplay();
        processGameState();
    }
    
    function processGameState() {
        const history = state.history;
        const endStates = ['cc', 'bk', 'cbf', 'cbk'];
        if (history.endsWith('f') || endStates.includes(history)) {
            showdown();
            return;
        }
        setTimeout(nextTurn, 1000);
    }
    
    function showdown() {
        state.isGameOver = true;
        let winner;
        if (state.history.endsWith('f')) {
            const lastActorIsP1 = (state.isPlayerFirst && state.history.length % 2 !== 0) || (!state.isPlayerFirst && state.history.length % 2 === 0);
            winner = lastActorIsP1 ? 'opponent' : 'player';
            showMessage(`${winner === 'player' ? '相手' : 'あなた'}がフォールドしました。`);
        } else {
            winner = CARDS[state.cards.player] > CARDS[state.cards.opponent] ? 'player' : 'opponent';
            showMessage(`ショーダウン！`);
            elements.opponentHand.innerHTML = `<div class="card">${state.cards.opponent}</div>`;
        }
        setTimeout(() => {
            state.chips[winner] += state.pot;
            if (winner === 'player') currentUserData.stats.playerWins++;
            else state.stats.opponentWins++;
            endRound(winner);
        }, 1000);
    }
    
    async function endRound(winner) {
        currentUserData.stats.gamesPlayed++;
        const profit = state.chips.player - 1;
        currentUserData.stats.totalProfit += profit;
        
        const gameData = {
            playerCard: state.cards.player,
            opponentCard: state.cards.opponent,
            history: state.history,
            isPlayerFirst: state.isPlayerFirst,
            winner: winner,
            profit: profit,
            playerAi: state.aiTypes.player,
            opponentAi: state.aiTypes.opponent
        };
        
        // サーバーにゲーム結果を保存
        await saveGameResult(gameData);
        
        // ローカルの履歴も更新
        const logEntry = {
            id: Date.now(),
            ...gameData
        };
        if (!currentUserData.history) currentUserData.history = [];
        currentUserData.history.unshift(logEntry);
        if (currentUserData.history.length > 100) currentUserData.history.pop();
        
        updateActionButtons({});
        elements.newGameButton.classList.remove('hidden');
        updateDisplay();
    }
    
    function getAiDecision(actor, card, history, isPlayerFirst) {
        const settings = currentAiSettings[actor];
        const cardKey = card.toLowerCase();
        const isFirstToAct = (actor === 'player' && isPlayerFirst) || (actor === 'opponent' && !isPlayerFirst);
        if (isFirstToAct) {
            if (history.length === 0) return (Math.random() < settings[`s1_${cardKey}_bet`]) ? 'b' : 'c';
            else return (Math.random() < settings[`s1_${cardKey}_call`]) ? 'k' : 'f';
        } else {
            if (history.endsWith('c')) return (Math.random() < settings[`s2_${cardKey}_bet`]) ? 'b' : 'c';
            else return (Math.random() < settings[`s2_${cardKey}_call`]) ? 'k' : 'f';
        }
    }
    
    // --- Custom AI Settings Panel ---
    function createAndSetupSettingsPanel(actor, settingsObject, onValueChange) {
        const screen = elements[`${actor}SettingsScreen`];
        const settings = { ...settingsObject }; 
        const actorName = { player: 'あなた', opponent: '相手', simP1: 'カスタムAI 1', simP2: 'カスタムAI 2' }[actor];
        const probKeys = Object.keys(aiProfiles.gto).filter(k => k !== 'name');
    
        const createSliderHTML = (position, action) => {
            return ['A', 'K', 'Q'].map(card => {
                const key = `${position}_${card.toLowerCase()}_${action}`;
                const value = Math.round((settings[key] || 0) * 100);
                return `<div class="ai-slider"><span>${card}で${action === 'bet' ? 'ベット' : 'コール'}: <span id="${actor}-${key}-val">${value}</span>%</span><input type="range" id="${actor}-${key}-prob" data-key="${key}" value="${value}"></div>`;
            }).join('');
        };
    
        screen.innerHTML = `<div class="custom-ai-settings"><h3>${actorName}のAI設定</h3><div class="ai-setting-column"><h4>AIが先行の時</h4><div class="ai-setting-group"><h5>最初の行動 (ベットする確率)</h5>${createSliderHTML('s1', 'bet')}</div><div class="ai-setting-group"><h5>自分チェック → 相手ベットへの対応 (コールする確率)</h5>${createSliderHTML('s1', 'call')}</div></div><div class="ai-setting-column"><h4>AIが後攻の時</h4><div class="ai-setting-group"><h5>相手チェック後の行動 (ベットする確率)</h5>${createSliderHTML('s2', 'bet')}</div><div class="ai-setting-group"><h5>相手ベットへの対応 (コールする確率)</h5>${createSliderHTML('s2', 'call')}</div></div><button class="back-to-game-button">戻る</button></div>`;
    
        probKeys.forEach(key => {
            const slider = screen.querySelector(`#${actor}-${key}-prob`);
            const valueSpan = screen.querySelector(`#${actor}-${key}-val`);
            if (slider && valueSpan) {
                slider.addEventListener('input', (event) => {
                    const newValue = parseInt(event.target.value, 10);
                    valueSpan.textContent = newValue;
                    settings[key] = newValue / 100; 
                    if(onValueChange) onValueChange(settings);
                });
            }
        });
        screen.querySelector('.back-to-game-button').addEventListener('click', () => { showSettingsOverlay(actor, false); });
    }

    // --- AI Simulator ---
    function animateEvHistoryChart(games, canvasElement, setChartInstance) {
        const existingChart = Chart.getChart(canvasElement);
        if (existingChart) {
            existingChart.destroy();
        }
        if (games.length === 0) {
            if (setChartInstance) setChartInstance(null);
            return;
        }

        const animationDuration = 1500;
        const chronologicalGames = [...games].reverse();
        const evDataPoints = [];
        let cumulativeProfit = 0;

        chronologicalGames.forEach((log, index) => {
            cumulativeProfit += log.profit;
            evDataPoints.push(cumulativeProfit / (index + 1));
        });

        const ctx = canvasElement.getContext('2d');
        const newChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'EVの推移', data: [], borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.2)', fill: true, tension: 0.1
                }]
            },
            options: {
                animation: false,
                scales: {
                    y: { title: { display: true, text: 'EV (1ゲームあたりの期待利得)' } },
                    x: { title: { display: true, text: 'ゲーム数' } }
                }
            }
        });
        if (setChartInstance) setChartInstance(newChart);
        
        let i = 0;
        const delay = Math.max(animationDuration / evDataPoints.length, 1);

        function addPoint() {
            if (i < evDataPoints.length) {
                newChart.data.labels.push(i + 1);
                newChart.data.datasets[0].data.push(evDataPoints[i]);
                newChart.update();
                i++;
                setTimeout(addPoint, delay);
            }
        }
        addPoint();
    }
    
    function setupSimulator() {
        const baseAiOptions = Object.keys(aiProfiles).map(key => `<option value="${key}">${aiProfiles[key].name}</option>`).join('');
        const p1Options = baseAiOptions + '<option value="custom1">カスタムAI 1</option>';
        const p2Options = baseAiOptions + '<option value="custom2">カスタムAI 2</option>';
        elements.simPlayer1Select.innerHTML = p1Options;
        elements.simPlayer2Select.innerHTML = p2Options;
        elements.simPlayer1Select.value = 'kensjitsu';
        elements.simPlayer2Select.value = 'gto';
    }
    
    function runSimulation() {
        const p1AiKey = elements.simPlayer1Select.value;
        const p2AiKey = elements.simPlayer2Select.value;
        const gameCount = parseInt(elements.simGameCountInput.value, 10);
    
        if (isNaN(gameCount) || gameCount <= 0 || gameCount > 100000) {
            showMessage('有効なゲーム回数 (1～100,000) を入力してください。');
            return;
        }
    
        elements.startSimButton.disabled = true;
        elements.simResultText.innerHTML = `シミュレーション中... (${gameCount}ゲーム)`;
        elements.simResultsContainer.classList.remove('hidden');
    
        setTimeout(() => {
            const p1Settings = p1AiKey === 'custom1' ? simulatorCustomAiSettings.p1 : aiProfiles[p1AiKey];
            const p2Settings = p2AiKey === 'custom2' ? simulatorCustomAiSettings.p2 : aiProfiles[p2AiKey];
            const p1Name = p1AiKey === 'custom1' ? 'カスタムAI 1' : p1Settings.name;
            const p2Name = p2AiKey === 'custom2' ? 'カスタムAI 2' : p2Settings.name;
    
            const theoreticalEV = calculateTheoreticalEV(p1Settings, p2Settings);
    
            let p1Wins = 0;
            let totalP1Profit = 0;
            const simGameLogs = [];
    
            for (let i = 0; i < gameCount; i++) {
                const isP1First = i % 2 === 0;
                const shuffledDeck = [...DECK].sort(() => Math.random() - 0.5);
                const p1Card = isP1First ? shuffledDeck[0] : shuffledDeck[1];
                const p2Card = isP1First ? shuffledDeck[1] : shuffledDeck[0];
                let p1Invested = 1;
                let pot = 2;
                const firstActorIsP1 = isP1First;
                const firstActorSettings = firstActorIsP1 ? p1Settings : p2Settings;
                const firstActorCard = firstActorIsP1 ? p1Card : p2Card;
                const secondActorSettings = !firstActorIsP1 ? p1Settings : p2Settings;
                const secondActorCard = !firstActorIsP1 ? p1Card : p2Card;
                let history = '';
                const action1 = getAiDecisionForSim(firstActorSettings, firstActorCard, history, true);
                history += action1;
                if (action1 === 'b') { pot++; if (firstActorIsP1) p1Invested++; }
                const action2 = getAiDecisionForSim(secondActorSettings, secondActorCard, history, false);
                history += action2;
                if (action2 === 'k') { pot++; if (!firstActorIsP1) p1Invested++; } 
                else if (action2 === 'b'){ pot++; }
                if (history === 'cb') {
                    const action3 = getAiDecisionForSim(firstActorSettings, firstActorCard, history, true);
                    history += action3;
                    if (action3 === 'k') { pot++; if (firstActorIsP1) p1Invested++; }
                }
                let roundWinner;
                if (history.endsWith('f')) {
                    const didP1ActLast = (history.length % 2 !== 0 && isP1First) || (history.length % 2 === 0 && !isP1First);
                    roundWinner = didP1ActLast ? 'p2' : 'p1';
                } else {
                    roundWinner = CARDS[p1Card] > CARDS[p2Card] ? 'p1' : 'p2';
                }
                let gameProfit;
                if (roundWinner === 'p1') { p1Wins++; gameProfit = pot - p1Invested; } 
                else { gameProfit = -p1Invested; }
                totalP1Profit += gameProfit;
                simGameLogs.push({ profit: gameProfit });
            }
            
            const p1WinRate = (p1Wins / gameCount * 100).toFixed(2);
            const p1PracticalEV = (totalP1Profit / gameCount).toFixed(4);
            
            elements.simResultText.innerHTML = `
                <strong>${p1Name} vs ${p2Name}</strong> (${gameCount}ゲーム)<br>
                ${p1Name}の勝利数: ${p1Wins} (${p1WinRate}%)<br>
                <hr style="border-color: rgba(255,255,255,0.2); margin: 8px 0;">
                実践EV (シミュレーション結果): <strong>${p1PracticalEV}</strong><br>
                理論EV (確率からの計算値): <strong>${theoreticalEV.toFixed(4)}</strong>
            `;
            elements.startSimButton.disabled = false;

            animateEvHistoryChart(simGameLogs, elements.simEvChartCanvas, (newChart) => simChart = newChart);
        }, 100);
    }
    
    function calculateTheoreticalEV(p1, p2) {
        let total_ev = 0;
        for (let i = 0; i < DECK.length; i++) {
            for (let j = 0; j < DECK.length; j++) {
                if (i === j) continue;
                total_ev += getPayoff(DECK[i], DECK[j], p1, p2, true);
                total_ev += getPayoff(DECK[i], DECK[j], p1, p2, false);
            }
        }
        return total_ev / 12.0;
    }

    function getPayoff(p1_card, p2_card, p1, p2, p1_is_first) {
        const winner_is_p1 = CARDS[p1_card] > CARDS[p2_card];
        const p1c = p1_card.toLowerCase();
        const p2c = p2_card.toLowerCase();
        const first = p1_is_first ? p1 : p2;
        const second = p1_is_first ? p2 : p1;
        const first_card = p1_is_first ? p1c : p2c;
        const second_card = p1_is_first ? p2c : p1c;
        const prob_p1_bet = first[`s1_${first_card}_bet`];
        const prob_p1_check = 1 - prob_p1_bet;
        const prob_p2_call = second[`s2_${second_card}_call`];
        const prob_p2_fold = 1 - prob_p2_call;
        const prob_p2_bet = second[`s2_${second_card}_bet`];
        const prob_p2_check = 1 - prob_p2_bet;
        const prob_p1_call = first[`s1_${first_card}_call`];
        const prob_p1_fold = 1 - prob_p1_call;
        const payoff_if_p1_bets = prob_p2_call * (winner_is_p1 ? 2 : -2) + prob_p2_fold * (p1_is_first ? 1 : -1);
        const payoff_if_p1_checks_p2_bets = prob_p1_call * (winner_is_p1 ? 2 : -2) + prob_p1_fold * (p1_is_first ? -1 : 1);
        const payoff_if_p1_checks = prob_p2_bet * payoff_if_p1_checks_p2_bets + prob_p2_check * (winner_is_p1 ? 1 : -1);
        return prob_p1_bet * payoff_if_p1_bets + prob_p1_check * payoff_if_p1_checks;
    }

    function getAiDecisionForSim(settings, card, history, isFirstToAct) {
        const cardKey = card.toLowerCase();
        if (isFirstToAct) {
           if (history.length === 0) return (Math.random() < settings[`s1_${cardKey}_bet`]) ? 'b' : 'c';
           else return (Math.random() < settings[`s1_${cardKey}_call`]) ? 'k' : 'f';
       } else {
           if (history.endsWith('c')) return (Math.random() < settings[`s2_${cardKey}_bet`]) ? 'b' : 'c';
           else return (Math.random() < settings[`s2_${cardKey}_call`]) ? 'k' : 'f';
       }
   }

    function calculateAiTendencies(aiSettings) {
        const betKeys = ['s1_a_bet', 's1_k_bet', 's1_q_bet', 's2_a_bet', 's2_k_bet', 's2_q_bet'];
        const callKeys = ['s1_a_call', 's1_k_call', 's1_q_call', 's2_a_call', 's2_k_call', 's2_q_call'];
        const bluffKeys = ['s1_q_bet', 's2_q_bet'];
        const betSum = betKeys.reduce((sum, key) => sum + (aiSettings[key] || 0), 0);
        const callSum = callKeys.reduce((sum, key) => sum + (aiSettings[key] || 0), 0);
        const bluffSum = bluffKeys.reduce((sum, key) => sum + (aiSettings[key] || 0), 0);
        return {
            betFreq: (betSum / betKeys.length) * 100,
            callFreq: (callSum / callKeys.length) * 100,
            bluffFreq: (bluffSum / bluffKeys.length) * 100,
        };
    }

    function displayAiStrategyCard(containerElement, aiSettings, aiName, detailsId) {
        const tendencies = calculateAiTendencies(aiSettings);
        containerElement.innerHTML = '';
        const title = document.createElement('h4');
        title.textContent = aiName;
        containerElement.appendChild(title);
        const createMeter = (labelText, value, color) => {
            const meterDiv = document.createElement('div');
            meterDiv.className = 'tendency-meter';
            const label = document.createElement('label');
            label.textContent = labelText;
            meterDiv.appendChild(label);
            const container = document.createElement('div');
            container.className = 'meter-bar-container';
            const bar = document.createElement('div');
            bar.className = 'meter-bar';
            bar.style.width = `${value.toFixed(1)}%`;
            bar.textContent = `${value.toFixed(1)}%`;
            if (color) bar.style.backgroundColor = color;
            container.appendChild(bar);
            meterDiv.appendChild(container);
            return meterDiv;
        };
        containerElement.appendChild(createMeter('ベット頻度', tendencies.betFreq));
        containerElement.appendChild(createMeter('コール頻度 (vs ベット)', tendencies.callFreq, '#f0ad4e'));
        containerElement.appendChild(createMeter('ブラフ頻度 (Qでベット)', tendencies.bluffFreq, '#d9534f'));
        const detailsButton = document.createElement('button');
        detailsButton.className = 'action-button view-details-button';
        detailsButton.dataset.detailsId = detailsId;
        detailsButton.textContent = '詳細な戦略';
        containerElement.appendChild(detailsButton);
    }

    function showStrategyDetails(aiSettings, aiName) {
        const toPercent = (val) => `${(val * 100).toFixed(1)}%`;
        const tableHTML = `<div class="custom-ai-settings" style="max-width: 500px;"><h3>${aiName}の戦略詳細</h3><table class="strategy-table"><thead><tr><th>状況</th><th>カード</th><th>行動確率</th></tr></thead><tbody><tr><td rowspan="3">先行: 初手</td><td class="card-header">A</td><td>ベット: ${toPercent(aiSettings.s1_a_bet)}</td></tr><tr><td class="card-header">K</td><td>ベット: ${toPercent(aiSettings.s1_k_bet)}</td></tr><tr><td class="card-header">Q</td><td>ベット: ${toPercent(aiSettings.s1_q_bet)}</td></tr><tr><td rowspan="3">先行: C→相手B</td><td class="card-header">A</td><td>コール: ${toPercent(aiSettings.s1_a_call)}</td></tr><tr><td class="card-header">K</td><td>コール: ${toPercent(aiSettings.s1_k_call)}</td></tr><tr><td class="card-header">Q</td><td>コール: ${toPercent(aiSettings.s1_q_call)}</td></tr><tr><td rowspan="3">後攻: 相手C</td><td class="card-header">A</td><td>ベット: ${toPercent(aiSettings.s2_a_bet)}</td></tr><tr><td class="card-header">K</td><td>ベット: ${toPercent(aiSettings.s2_k_bet)}</td></tr><tr><td class="card-header">Q</td><td>ベット: ${toPercent(aiSettings.s2_q_bet)}</td></tr><tr><td rowspan="3">後攻: 相手B</td><td class="card-header">A</td><td>コール: ${toPercent(aiSettings.s2_a_call)}</td></tr><tr><td class="card-header">K</td><td>コール: ${toPercent(aiSettings.s2_k_call)}</td></tr><tr><td class="card-header">Q</td><td>コール: ${toPercent(aiSettings.s2_q_call)}</td></tr></tbody></table><button class="back-to-game-button">閉じる</button></div>`;
        elements.strategyDetailsOverlay.innerHTML = tableHTML;
        elements.strategyDetailsOverlay.classList.add('active');
        elements.strategyDetailsOverlay.querySelector('.back-to-game-button').addEventListener('click', () => {
            elements.strategyDetailsOverlay.classList.remove('active');
        });
    }

    function updateSimulatorStrategyDisplay() {
        const p1AiKey = elements.simPlayer1Select.value;
        const p2AiKey = elements.simPlayer2Select.value;
        const p1Settings = p1AiKey === 'custom1' ? simulatorCustomAiSettings.p1 : aiProfiles[p1AiKey];
        const p2Settings = p2AiKey === 'custom2' ? simulatorCustomAiSettings.p2 : aiProfiles[p2AiKey];
        const p1Name = p1AiKey === 'custom1' ? 'カスタムAI 1' : p1Settings.name;
        const p2Name = p2AiKey === 'custom2' ? 'カスタムAI 2' : p2Settings.name;
        displayAiStrategyCard(elements.simP1StrategyCard, p1Settings, p1Name, 'p1');
        displayAiStrategyCard(elements.simP2StrategyCard, p2Settings, p2Name, 'p2');
    }

    // --- Event Listeners ---
    elements.playerAiTypeSelect.addEventListener('change', async (e) => {
        state.aiTypes.player = e.target.value;
        syncCurrentSettings('player', state.aiTypes.player);
        currentUserData.aiTypes.player = e.target.value;
        await saveAiSettings('player', e.target.value, currentAiSettings.player);
        initializeGame();
    });
    elements.opponentAiTypeSelect.addEventListener('change', async (e) => {
        state.aiTypes.opponent = e.target.value;
        syncCurrentSettings('opponent', state.aiTypes.opponent);
        currentUserData.aiTypes.opponent = e.target.value;
        await saveAiSettings('opponent', e.target.value, currentAiSettings.opponent);
        initializeGame();
    });
    
    elements.newGameButton.addEventListener('click', initializeGame);
    elements.betButton.addEventListener('click', () => handleHumanAction('b'));
    elements.checkButton.addEventListener('click', () => handleHumanAction('c'));
    elements.callButton.addEventListener('click', () => handleHumanAction('k'));
    elements.foldButton.addEventListener('click', () => handleHumanAction('f'));
    
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            showScreen(tab.getAttribute('data-tab'));
        });
    });
    
    elements.clearStatsButton.addEventListener('click', async () => {
        if (window.confirm('本当にあなたのすべての統計と履歴を削除しますか？この操作は元に戻せません。')) {
            try {
                // サーバー側でのデータ削除は今回は実装せず、ローカルのみリセット
                currentUserData.history = [];
                currentUserData.stats = { gamesPlayed: 0, playerWins: 0, opponentWins: 0, totalProfit: 0 };
                state.stats = currentUserData.stats;
                updateStatsHub();
                alert('統計データがリセットされました。');
            } catch (error) {
                console.error('Failed to clear stats:', error);
                alert('統計のリセットに失敗しました。');
            }
        }
    });

    elements.openPlayerSettingsButton.addEventListener('click', () => {
        createAndSetupSettingsPanel('player', currentAiSettings.player, async (newSettings) => {
            elements.playerAiTypeSelect.value = 'custom';
            state.aiTypes.player = 'custom';
            currentAiSettings.player = newSettings;
            currentUserData.aiTypes.player = 'custom';
            currentUserData.customAiSettings.player = { ...newSettings };
            await saveAiSettings('player', 'custom', newSettings);
        });
        showSettingsOverlay('player', true);
    });

    elements.openOpponentSettingsButton.addEventListener('click', () => {
        createAndSetupSettingsPanel('opponent', currentAiSettings.opponent, async (newSettings) => {
            elements.opponentAiTypeSelect.value = 'custom';
            state.aiTypes.opponent = 'custom';
            currentAiSettings.opponent = newSettings;
            currentUserData.aiTypes.opponent = 'custom';
            currentUserData.customAiSettings.opponent = { ...newSettings };
            await saveAiSettings('opponent', 'custom', newSettings);
        });
        showSettingsOverlay('opponent', true);
    });
    
    elements.startSimButton.addEventListener('click', runSimulation);
    elements.simPlayer1Select.addEventListener('change', () => {
        elements.simP1SettingsButton.disabled = elements.simPlayer1Select.value !== 'custom1';
        updateSimulatorStrategyDisplay();
    });
    elements.simPlayer2Select.addEventListener('change', () => {
        elements.simP2SettingsButton.disabled = elements.simPlayer2Select.value !== 'custom2';
        updateSimulatorStrategyDisplay();
    });
    elements.simP1SettingsButton.addEventListener('click', () => {
        createAndSetupSettingsPanel('simP1', simulatorCustomAiSettings.p1, (newSettings) => {
            simulatorCustomAiSettings.p1 = newSettings;
            updateSimulatorStrategyDisplay();
        });
        showSettingsOverlay('simP1', true);
    });
    elements.simP2SettingsButton.addEventListener('click', () => {
        createAndSetupSettingsPanel('simP2', simulatorCustomAiSettings.p2, (newSettings) => {
            simulatorCustomAiSettings.p2 = newSettings;
            updateSimulatorStrategyDisplay();
        });
        showSettingsOverlay('simP2', true);
    });
    document.getElementById('simulator-strategy-display').addEventListener('click', (e) => {
        if (e.target.classList.contains('view-details-button')) {
            const detailsId = e.target.dataset.detailsId;
            const aiKey = (detailsId === 'p1') ? elements.simPlayer1Select.value : elements.simPlayer2Select.value;
            const settings = (aiKey === 'custom1') ? simulatorCustomAiSettings.p1 : (aiKey === 'custom2') ? simulatorCustomAiSettings.p2 : aiProfiles[aiKey];
            const name = (aiKey === 'custom1') ? 'カスタムAI 1' : (aiKey === 'custom2') ? 'カスタムAI 2' : settings.name;
            showStrategyDetails(settings, name);
        }
    });

    // --- Initialization ---
    async function main() {
        elements.initialStartButton.addEventListener('click', () => {
            showScreen('game');
            initializeGame();
        });

        // ユーザー名表示
        document.querySelector('#player-ai-controls > label').textContent = `${currentUser.username}:`;
        
        // サーバーからデータを読み込み
        await loadUserData();

        state.aiTypes = currentUserData.aiTypes;
        elements.playerAiTypeSelect.value = state.aiTypes.player;
        elements.opponentAiTypeSelect.value = state.aiTypes.opponent;
        syncCurrentSettings('player', state.aiTypes.player);
        syncCurrentSettings('opponent', state.aiTypes.opponent);
        
        state.stats = currentUserData.stats;
        // opponentWinsはデータベースから取得した値を使用
        
        initializeFilters();
        setupSimulator();
        
        // ログアウトボタンを追加
        addLogoutButton();
    }

    // ログアウトボタンを追加
    function addLogoutButton() {
        const navTabs = document.querySelector('.nav-tabs');
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'ログアウト';
        logoutBtn.className = 'logout-button';
        logoutBtn.style.cssText = `
            margin-left: auto;
            padding: 8px 16px;
            background-color: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        logoutBtn.addEventListener('click', logout);
        navTabs.appendChild(logoutBtn);
    }

    // モバイル設定アイコンのイベントリスナー
    const mobileSettingsIcon = document.getElementById('mobile-settings-icon');
    if (mobileSettingsIcon) {
        mobileSettingsIcon.addEventListener('click', () => {
            // モバイル用AI設定モーダルを表示
            showMobileAiSettings();
        });
    }

    // モバイル用AI設定モーダル表示関数
    function showMobileAiSettings() {
        // 既存のモーダルがあれば削除
        const existingModal = document.getElementById('mobile-ai-settings-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // モーダル作成
        const modal = document.createElement('div');
        modal.id = 'mobile-ai-settings-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 350px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #333;">AI設定</h3>
                <button id="close-mobile-settings" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">プレイヤーAI:</label>
                <select id="mobile-player-ai-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
                    <option value="human">人間</option>
                    <option value="random">ランダム</option>
                    <option value="conservative">保守的</option>
                    <option value="aggressive">アグレッシブ</option>
                    <option value="tightaggressive">タイトアグレ</option>
                    <option value="gto">GTO AI</option>
                    <option value="custom">カスタムAI</option>
                </select>
                <button id="mobile-player-settings" style="width: 100%; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">プレイヤー詳細設定</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">相手AI:</label>
                <select id="mobile-opponent-ai-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
                    <option value="random">ランダム</option>
                    <option value="conservative">保守的</option>
                    <option value="aggressive">アグレッシブ</option>
                    <option value="tightaggressive">タイトアグレ</option>
                    <option value="gto">GTO AI</option>
                    <option value="custom">カスタムAI</option>
                </select>
                <button id="mobile-opponent-settings" style="width: 100%; padding: 8px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;">相手詳細設定</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 現在の設定値を反映
        const mobilePlayerSelect = modal.querySelector('#mobile-player-ai-select');
        const mobileOpponentSelect = modal.querySelector('#mobile-opponent-ai-select');
        
        mobilePlayerSelect.value = elements.playerAiTypeSelect.value;
        mobileOpponentSelect.value = elements.opponentAiTypeSelect.value;

        // イベントリスナー設定
        modal.querySelector('#close-mobile-settings').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        mobilePlayerSelect.addEventListener('change', async (e) => {
            elements.playerAiTypeSelect.value = e.target.value;
            elements.playerAiTypeSelect.dispatchEvent(new Event('change'));
        });

        mobileOpponentSelect.addEventListener('change', async (e) => {
            elements.opponentAiTypeSelect.value = e.target.value;
            elements.opponentAiTypeSelect.dispatchEvent(new Event('change'));
        });

        modal.querySelector('#mobile-player-settings').addEventListener('click', () => {
            modal.remove();
            elements.openPlayerSettingsButton.click();
        });

        modal.querySelector('#mobile-opponent-settings').addEventListener('click', () => {
            modal.remove();
            elements.openOpponentSettingsButton.click();
        });
    }

    main();
});
