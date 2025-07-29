/**
 * シミュレータ管理モジュール - AI vs AI シミュレーションを担当
 */

import { AI_PROFILES, ACTIONS } from '../config/constants.js';
import { delay, debugLog } from '../utils/helpers.js';

export class SimulatorManager {
    constructor(dataManager, gameEngine, aiManager, uiManager) {
        this.dataManager = dataManager;
        this.gameEngine = gameEngine;
        this.aiManager = aiManager;
        this.uiManager = uiManager;
        
        this.isRunning = false;
        this.currentSimulation = null;
        this.simulationResults = [];
        this.simulationHistory = [];
    }

    /**
     * 初期化
     */
    async initialize() {
        this.setupSimulatorUI();
        await this.loadSimulationHistory();
        console.log('SimulatorManager初期化完了');
    }

    /**
     * シミュレータUIの初期化
     */
    setupSimulatorUI() {
        this.populateAISelectors();
        this.setupEventListeners();
        this.updateSimulationDisplay();
    }

    /**
     * AIセレクターにオプションを追加
     */
    populateAISelectors() {
        const ai1Select = document.getElementById('ai1-select');
        const ai2Select = document.getElementById('ai2-select');
        
        if (!ai1Select || !ai2Select) return;

        // セレクターをクリア
        ai1Select.innerHTML = '';
        ai2Select.innerHTML = '';

        // AIプロファイルを追加
        Object.entries(AI_PROFILES).forEach(([key, profile]) => {
            const option1 = new Option(profile.name, key);
            const option2 = new Option(profile.name, key);
            
            ai1Select.appendChild(option1);
            ai2Select.appendChild(option2);
        });

        // デフォルト選択
        ai1Select.value = 'kensjitsu';
        ai2Select.value = 'kiai';
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // シミュレーション開始ボタン
        const startBtn = document.getElementById('start-simulation-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startSimulation());
        }

        // シミュレーション停止ボタン
        const stopBtn = document.getElementById('stop-simulation-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopSimulation());
        }

        // バッチシミュレーション開始ボタン
        const batchBtn = document.getElementById('start-batch-simulation-btn');
        if (batchBtn) {
            batchBtn.addEventListener('click', () => this.startBatchSimulation());
        }

        // 結果クリアボタン
        const clearBtn = document.getElementById('clear-simulation-results-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearResults());
        }

        // シミュレーション速度スライダー
        const speedSlider = document.getElementById('simulation-speed');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                this.updateSimulationSpeed(e.target.value);
            });
        }
    }

    /**
     * シミュレーションの開始
     */
    async startSimulation() {
        if (this.isRunning) {
            this.uiManager.showMessage('シミュレーション実行中です', 'warning');
            return;
        }

        const config = this.getSimulationConfig();
        if (!config) return;

        this.isRunning = true;
        this.updateSimulationButtons();

        try {
            const result = await this.runSimulation(config);
            this.addSimulationResult(result);
            this.uiManager.showMessage('シミュレーション完了', 'success');
        } catch (error) {
            console.error('シミュレーションエラー:', error);
            this.uiManager.showMessage('シミュレーションでエラーが発生しました', 'error');
        } finally {
            this.isRunning = false;
            this.updateSimulationButtons();
        }
    }

    /**
     * シミュレーション設定の取得
     */
    getSimulationConfig() {
        const ai1Select = document.getElementById('ai1-select');
        const ai2Select = document.getElementById('ai2-select');
        const gamesInput = document.getElementById('simulation-games');

        if (!ai1Select || !ai2Select || !gamesInput) {
            this.uiManager.showMessage('設定要素が見つかりません', 'error');
            return null;
        }

        const ai1Profile = ai1Select.value;
        const ai2Profile = ai2Select.value;
        const numberOfGames = parseInt(gamesInput.value, 10);

        if (!AI_PROFILES[ai1Profile] || !AI_PROFILES[ai2Profile]) {
            this.uiManager.showMessage('無効なAIプロファイルが選択されています', 'error');
            return null;
        }

        if (isNaN(numberOfGames) || numberOfGames < 1 || numberOfGames > 10000) {
            this.uiManager.showMessage('ゲーム数は1から10000の間で設定してください', 'error');
            return null;
        }

        return {
            ai1Profile,
            ai2Profile,
            numberOfGames,
            ai1Name: AI_PROFILES[ai1Profile].name,
            ai2Name: AI_PROFILES[ai2Profile].name
        };
    }

    /**
     * シミュレーションの実行
     */
    async runSimulation(config) {
        const { ai1Profile, ai2Profile, numberOfGames, ai1Name, ai2Name } = config;
        
        let ai1Wins = 0;
        let ai2Wins = 0;
        const gameDetails = [];
        
        this.currentSimulation = {
            config,
            progress: 0,
            ai1Wins: 0,
            ai2Wins: 0,
            startTime: Date.now()
        };

        const progressElement = document.getElementById('simulation-progress');
        const statusElement = document.getElementById('simulation-status');

        for (let gameNum = 1; gameNum <= numberOfGames; gameNum++) {
            if (!this.isRunning) {
                // シミュレーション停止が要求された
                break;
            }

            // ゲームを実行
            const gameResult = await this.simulateSingleGame(ai1Profile, ai2Profile);
            
            if (gameResult.winner === 'ai1') {
                ai1Wins++;
                this.currentSimulation.ai1Wins = ai1Wins;
            } else {
                ai2Wins++;
                this.currentSimulation.ai2Wins = ai2Wins;
            }

            gameDetails.push(gameResult);

            // 進捗の更新
            this.currentSimulation.progress = Math.round((gameNum / numberOfGames) * 100);
            
            if (progressElement) {
                progressElement.textContent = `${this.currentSimulation.progress}%`;
            }
            
            if (statusElement) {
                statusElement.textContent = 
                    `${gameNum}/${numberOfGames} - ${ai1Name}: ${ai1Wins}, ${ai2Name}: ${ai2Wins}`;
            }

            // UIの更新とパフォーマンス調整
            if (gameNum % 100 === 0 || gameNum === numberOfGames) {
                await delay(1); // UI更新のための短い遅延
            }
        }

        const endTime = Date.now();
        const duration = endTime - this.currentSimulation.startTime;

        const result = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ai1_profile: ai1Profile,
            ai2_profile: ai2Profile,
            ai1_name: ai1Name,
            ai2_name: ai2Name,
            ai1_wins: ai1Wins,
            ai2_wins: ai2Wins,
            total_games: ai1Wins + ai2Wins,
            duration: duration,
            win_rate_ai1: Math.round((ai1Wins / (ai1Wins + ai2Wins)) * 100),
            game_details: gameDetails.slice(0, 100) // 最初の100ゲームの詳細のみ保存
        };

        // 結果をデータベースに保存
        await this.dataManager.saveSimulationResult(result);

        return result;
    }

    /**
     * 単一ゲームのシミュレーション
     */
    async simulateSingleGame(ai1Profile, ai2Profile) {
        // ゲームエンジンをリセット
        this.gameEngine.reset();
        const gameState = this.gameEngine.startNewGame();

        debugLog('シミュレーションゲーム開始', {
            ai1: ai1Profile,
            ai2: ai2Profile,
            hands: [gameState.playerHand, this.gameEngine.opponentHand]
        });

        let currentPlayer = 'ai1'; // AI1が先手
        let actionCount = 0;
        const maxActions = 10; // 無限ループ防止

        while (!this.gameEngine.isGameOver && actionCount < maxActions) {
            const validActions = this.gameEngine.getValidActions();
            
            if (validActions.length === 0) break;

            let action;
            let actionResult;

            if (currentPlayer === 'ai1') {
                // AI1のターン（プレイヤー側として扱う）
                action = this.aiManager.decideActionForSimulation(
                    gameState.playerHand,
                    this.gameEngine.actionSequence,
                    validActions,
                    ai1Profile
                );
                
                actionResult = this.gameEngine.playerAction(action);
                currentPlayer = 'ai2';
            } else {
                // AI2のターン（対戦相手側として扱う）
                action = this.aiManager.decideActionForSimulation(
                    this.gameEngine.opponentHand,
                    this.gameEngine.actionSequence,
                    validActions,
                    ai2Profile
                );
                
                actionResult = this.gameEngine.opponentAction(action);
                currentPlayer = 'ai1';
            }

            debugLog('シミュレーションアクション', {
                player: currentPlayer === 'ai2' ? 'ai1' : 'ai2',
                action,
                sequence: this.gameEngine.actionSequence
            });

            actionCount++;

            // ゲーム終了チェック
            if (actionResult.isGameOver) {
                break;
            }
        }

        // 勝者の決定（ゲームエンジンの観点からプレイヤー=AI1, 対戦相手=AI2）
        const gameResult = this.gameEngine.getGameState().gameResult;
        const winner = gameResult.winner === 'player' ? 'ai1' : 'ai2';

        return {
            winner,
            ai1_hand: gameState.playerHand,
            ai2_hand: this.gameEngine.opponentHand,
            action_sequence: this.gameEngine.actionSequence,
            payoff: gameResult.payoff,
            reason: gameResult.reason
        };
    }

    /**
     * バッチシミュレーションの開始
     */
    async startBatchSimulation() {
        if (this.isRunning) {
            this.uiManager.showMessage('シミュレーション実行中です', 'warning');
            return;
        }

        const profiles = Object.keys(AI_PROFILES);
        const batchResults = [];
        
        this.isRunning = true;
        this.updateSimulationButtons();

        try {
            // すべての組み合わせをテスト
            for (let i = 0; i < profiles.length; i++) {
                for (let j = i + 1; j < profiles.length; j++) {
                    if (!this.isRunning) break;

                    const config = {
                        ai1Profile: profiles[i],
                        ai2Profile: profiles[j],
                        numberOfGames: 1000,
                        ai1Name: AI_PROFILES[profiles[i]].name,
                        ai2Name: AI_PROFILES[profiles[j]].name
                    };

                    this.uiManager.showMessage(
                        `${config.ai1Name} vs ${config.ai2Name} を実行中...`, 
                        'info'
                    );

                    const result = await this.runSimulation(config);
                    batchResults.push(result);
                }
            }

            if (batchResults.length > 0) {
                this.addBatchResults(batchResults);
                this.uiManager.showMessage('バッチシミュレーション完了', 'success');
            }
        } catch (error) {
            console.error('バッチシミュレーションエラー:', error);
            this.uiManager.showMessage('バッチシミュレーションでエラーが発生しました', 'error');
        } finally {
            this.isRunning = false;
            this.updateSimulationButtons();
        }
    }

    /**
     * シミュレーションの停止
     */
    stopSimulation() {
        if (this.isRunning) {
            this.isRunning = false;
            this.uiManager.showMessage('シミュレーションを停止中...', 'info');
        }
    }

    /**
     * シミュレーション結果の追加
     */
    addSimulationResult(result) {
        this.simulationResults.push(result);
        this.simulationHistory.unshift(result); // 履歴の先頭に追加
        
        // 履歴のサイズ制限
        if (this.simulationHistory.length > 50) {
            this.simulationHistory = this.simulationHistory.slice(0, 50);
        }
        
        this.updateSimulationDisplay();
    }

    /**
     * バッチ結果の追加
     */
    addBatchResults(results) {
        this.simulationResults.push(...results);
        this.simulationHistory.unshift(...results);
        
        // 履歴のサイズ制限
        if (this.simulationHistory.length > 50) {
            this.simulationHistory = this.simulationHistory.slice(0, 50);
        }
        
        this.updateSimulationDisplay();
    }

    /**
     * シミュレーション表示の更新
     */
    updateSimulationDisplay() {
        this.updateResultsTable();
        this.updateSimulationSummary();
        this.updateSimulationButtons();
    }

    /**
     * 結果テーブルの更新
     */
    updateResultsTable() {
        const tableBody = document.getElementById('simulation-results-table-body');
        if (!tableBody) return;

        if (this.simulationHistory.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">シミュレーション結果がありません</td></tr>';
            return;
        }

        let html = '';
        this.simulationHistory.slice(0, 20).forEach(result => {
            const date = new Date(result.timestamp).toLocaleDateString();
            const duration = Math.round(result.duration / 1000);
            
            html += `
                <tr>
                    <td>${result.ai1_name} vs ${result.ai2_name}</td>
                    <td>${result.total_games}</td>
                    <td>${result.ai1_wins} (${result.win_rate_ai1}%)</td>
                    <td>${result.ai2_wins} (${100 - result.win_rate_ai1}%)</td>
                    <td>${duration}秒</td>
                    <td>${date}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
    }

    /**
     * シミュレーション概要の更新
     */
    updateSimulationSummary() {
        const summaryElement = document.getElementById('simulation-summary');
        if (!summaryElement) return;

        if (this.simulationHistory.length === 0) {
            summaryElement.innerHTML = '<p>まだシミュレーションが実行されていません。</p>';
            return;
        }

        const totalSimulations = this.simulationHistory.length;
        const totalGames = this.simulationHistory.reduce((sum, result) => sum + result.total_games, 0);
        const averageDuration = Math.round(
            this.simulationHistory.reduce((sum, result) => sum + result.duration, 0) / 
            this.simulationHistory.length / 1000
        );

        // AIプロファイル別の勝率分析
        const profileStats = this.calculateProfileStats();

        let html = `
            <h3>シミュレーション概要</h3>
            <p>総シミュレーション数: ${totalSimulations}</p>
            <p>総ゲーム数: ${totalGames}</p>
            <p>平均実行時間: ${averageDuration}秒</p>
            <h4>AIプロファイル別勝率</h4>
        `;

        Object.entries(profileStats).forEach(([profileName, stats]) => {
            html += `<p>${profileName}: ${stats.winRate}% (${stats.totalGames}ゲーム)</p>`;
        });

        summaryElement.innerHTML = html;
    }

    /**
     * プロファイル別統計の計算
     */
    calculateProfileStats() {
        const profileStats = {};

        this.simulationHistory.forEach(result => {
            // AI1の統計
            if (!profileStats[result.ai1_name]) {
                profileStats[result.ai1_name] = { wins: 0, totalGames: 0 };
            }
            profileStats[result.ai1_name].wins += result.ai1_wins;
            profileStats[result.ai1_name].totalGames += result.total_games;

            // AI2の統計
            if (!profileStats[result.ai2_name]) {
                profileStats[result.ai2_name] = { wins: 0, totalGames: 0 };
            }
            profileStats[result.ai2_name].wins += result.ai2_wins;
            profileStats[result.ai2_name].totalGames += result.total_games;
        });

        // 勝率を計算
        Object.keys(profileStats).forEach(profileName => {
            const stats = profileStats[profileName];
            stats.winRate = Math.round((stats.wins / stats.totalGames) * 100);
        });

        return profileStats;
    }

    /**
     * ボタン状態の更新
     */
    updateSimulationButtons() {
        const startBtn = document.getElementById('start-simulation-btn');
        const stopBtn = document.getElementById('stop-simulation-btn');
        const batchBtn = document.getElementById('start-batch-simulation-btn');

        if (this.isRunning) {
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
            if (batchBtn) batchBtn.disabled = true;
        } else {
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
            if (batchBtn) batchBtn.disabled = false;
        }
    }

    /**
     * シミュレーション速度の更新
     */
    updateSimulationSpeed(speed) {
        // 将来的にシミュレーション速度の調整に使用
        console.log('シミュレーション速度設定:', speed);
    }

    /**
     * 結果のクリア
     */
    clearResults() {
        if (confirm('すべてのシミュレーション結果を削除しますか？')) {
            this.simulationResults = [];
            this.simulationHistory = [];
            this.updateSimulationDisplay();
            this.uiManager.showMessage('シミュレーション結果をクリアしました', 'success');
        }
    }

    /**
     * シミュレーション履歴の読み込み
     */
    async loadSimulationHistory() {
        try {
            const stats = await this.dataManager.getSimulationStats();
            if (stats && stats.simulations) {
                this.simulationHistory = stats.simulations;
                this.updateSimulationDisplay();
            }
        } catch (error) {
            console.error('シミュレーション履歴の読み込みエラー:', error);
        }
    }

    /**
     * 現在のシミュレーション状態を取得
     */
    getCurrentSimulationState() {
        return {
            isRunning: this.isRunning,
            currentSimulation: this.currentSimulation,
            resultsCount: this.simulationResults.length,
            historyCount: this.simulationHistory.length
        };
    }
}
