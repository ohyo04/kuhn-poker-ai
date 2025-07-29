/**
 * クーン・ポーカー (AKQ) - メインアプリケーション
 * リファクタリング版
 */

import { DataManager } from './js/modules/DataManager.js';
import { GameEngine } from './js/modules/GameEngine.js';
import { AIManager } from './js/modules/AIManager.js';
import { UIManager } from './js/modules/UIManager.js';
import { StatsManager } from './js/modules/StatsManager.js';
import { SimulatorManager } from './js/modules/SimulatorManager.js';
import { EventManager } from './js/modules/EventManager.js';

/**
 * アプリケーションクラス
 */
class KuhnPokerApp {
    constructor() {
        this.dataManager = null;
        this.gameEngine = null;
        this.aiManager = null;
        this.uiManager = null;
        this.statsManager = null;
        this.simulatorManager = null;
        this.eventManager = null;
        this.isGameInProgress = false;
        this.currentGameState = null;
    }

    /**
     * アプリケーションを初期化
     */
    async initialize() {
        try {
            console.log('KuhnPokerApp初期化開始...');

            // イベントマネージャーを最初に初期化
            this.eventManager = new EventManager();

            // 各マネージャーを初期化
            this.dataManager = new DataManager();
            this.gameEngine = new GameEngine();
            this.aiManager = new AIManager();
            this.uiManager = new UIManager();
            this.statsManager = new StatsManager(this.dataManager, this.uiManager);
            this.simulatorManager = new SimulatorManager(
                this.dataManager, 
                this.gameEngine, 
                this.aiManager, 
                this.uiManager
            );

            // 各マネージャーを初期化
            this.uiManager.initialize();
            await this.statsManager.initialize();
            await this.simulatorManager.initialize();

            // ゲームイベントリスナーを設定
            this.setupGameEventListeners();

            // グローバルアクセス用に設定
            window.gameApp = this;

            console.log('KuhnPokerApp初期化完了');
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.showErrorMessage('アプリケーションの初期化に失敗しました。');
        }
    }

    /**
     * ゲームイベントリスナーを設定
     */
    setupGameEventListeners() {
        // 新しいゲーム開始
        const newGameBtn = document.getElementById('new-game-button');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => this.startNewGame());
        }

        // ゲームアクションボタン
        const betBtn = document.getElementById('bet-button');
        const checkBtn = document.getElementById('check-button');
        const callBtn = document.getElementById('call-button');
        const foldBtn = document.getElementById('fold-button');

        if (betBtn) betBtn.addEventListener('click', () => this.playerAction('b'));
        if (checkBtn) checkBtn.addEventListener('click', () => this.playerAction('c'));
        if (callBtn) callBtn.addEventListener('click', () => this.playerAction('k'));
        if (foldBtn) foldBtn.addEventListener('click', () => this.playerAction('f'));

        // AI設定変更
        const aiSelect = document.getElementById('ai-selector');
        if (aiSelect) {
            aiSelect.addEventListener('change', (e) => {
                this.aiManager.setProfile(e.target.value);
                this.uiManager.showMessage('AIプロファイルを変更しました', 'success');
            });
        }
    }

    /**
     * 新しいゲームを開始
     */
    async startNewGame() {
        try {
            this.isGameInProgress = true;
            
            // ゲームエンジンで新しいゲームを開始
            this.currentGameState = this.gameEngine.startNewGame();
            
            // UIを更新
            this.uiManager.updateGameUI(this.currentGameState);
            this.uiManager.showMessage('新しいゲームが開始されました！', 'info');
            
            console.log('新しいゲーム開始:', this.currentGameState);
        } catch (error) {
            console.error('ゲーム開始エラー:', error);
            this.uiManager.showError('ゲームの開始に失敗しました');
        }
    }

    /**
     * プレイヤーのアクションを処理
     */
    async playerAction(action) {
        if (!this.isGameInProgress || !this.currentGameState) {
            this.uiManager.showMessage('ゲームが開始されていません', 'warning');
            return;
        }

        try {
            // プレイヤーのアクションを処理
            const actionResult = this.gameEngine.playerAction(action);
            this.currentGameState = { ...this.currentGameState, ...actionResult };
            
            // UIを更新
            this.uiManager.updateGameUI(this.currentGameState);
            
            console.log('プレイヤーアクション:', { action, result: actionResult });

            // ゲーム終了チェック
            if (actionResult.isGameOver) {
                await this.endGame();
                return;
            }

            // AIのターンを処理
            setTimeout(() => this.processAITurn(), 1000);
            
        } catch (error) {
            console.error('プレイヤーアクションエラー:', error);
            this.uiManager.showError('アクションの処理に失敗しました');
        }
    }

    /**
     * AIのターンを処理
     */
    async processAITurn() {
        if (!this.isGameInProgress || this.currentGameState.isGameOver) {
            return;
        }

        try {
            // AIのアクションを決定
            const validActions = this.gameEngine.getValidActions();
            const aiAction = this.aiManager.decideAction({
                opponentHand: this.gameEngine.opponentHand,
                actionSequence: this.gameEngine.actionSequence,
                validActions: validActions
            });

            // AIアクションをUIに表示
            this.uiManager.showAIAction(aiAction);

            // AIのアクションを処理
            const actionResult = this.gameEngine.opponentAction(aiAction);
            this.currentGameState = { ...this.currentGameState, ...actionResult };
            
            // UIを更新
            this.uiManager.updateGameUI(this.currentGameState);
            
            console.log('AIアクション:', { action: aiAction, result: actionResult });

            // ゲーム終了チェック
            if (actionResult.isGameOver) {
                setTimeout(() => this.endGame(), 1000);
            }
            
        } catch (error) {
            console.error('AIターンエラー:', error);
            this.uiManager.showError('AIの処理に失敗しました');
        }
    }

    /**
     * ゲーム終了処理
     */
    async endGame() {
        try {
            this.isGameInProgress = false;
            
            // ゲーム結果を取得
            const gameResult = this.currentGameState.gameResult || this.gameEngine.getGameState().gameResult;
            
            // 結果をUIに表示
            this.uiManager.showGameResult(gameResult);
            this.uiManager.updateGameUI(this.currentGameState);
            
            // 統計に記録
            await this.recordGameResult(gameResult);
            
            console.log('ゲーム終了:', gameResult);
            
        } catch (error) {
            console.error('ゲーム終了処理エラー:', error);
        }
    }

    /**
     * ゲーム結果を記録
     */
    async recordGameResult(gameResult) {
        try {
            const gameData = {
                winner: gameResult.winner,
                playerCard: gameResult.playerCard,
                opponentCard: gameResult.opponentCard,
                actionSequence: this.gameEngine.actionSequence,
                payoff: gameResult.payoff,
                timestamp: new Date().toISOString(),
                aiProfile: this.aiManager.getCurrentProfile().name
            };

            // データベースに保存
            await this.dataManager.saveGameResult(gameData);
            
            // 統計を更新
            this.statsManager.addGameResult(gameData);
            
        } catch (error) {
            console.error('ゲーム結果記録エラー:', error);
        }
    }

    /**
     * エラーメッセージを表示
     */
    showErrorMessage(message) {
        console.error('エラー:', message);
        if (this.uiManager) {
            this.uiManager.showError(message);
        } else {
            // UIManagerが利用できない場合のフォールバック
            alert(message);
        }
    }

    /**
     * アプリケーションを開始
     */
    start() {
        console.log('KuhnPokerApp開始');
        // メインゲーム画面を表示
        this.uiManager.showMainGame();
    }

    /**
     * 現在のゲーム状態を取得
     */
    getCurrentGameState() {
        return this.currentGameState;
    }

    /**
     * ゲーム進行中かどうかを確認
     */
    isPlaying() {
        return this.isGameInProgress;
    }

    /**
     * 各マネージャーにアクセスするためのゲッター
     */
    getDataManager() { return this.dataManager; }
    getGameEngine() { return this.gameEngine; }
    getAIManager() { return this.aiManager; }
    getUIManager() { return this.uiManager; }
    getStatsManager() { return this.statsManager; }
    getSimulatorManager() { return this.simulatorManager; }
    getEventManager() { return this.eventManager; }
}

/**
 * アプリケーション開始
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM読み込み完了、アプリを初期化中...');
    
    // グローバルなアプリインスタンスを作成
    window.kuhnPokerApp = new KuhnPokerApp();
    
    try {
        await window.kuhnPokerApp.initialize();
        window.kuhnPokerApp.start();
        console.log('アプリケーション開始完了');
    } catch (error) {
        console.error('アプリケーション開始エラー:', error);
        alert('アプリケーションの開始に失敗しました。ページを再読み込みしてください。');
    }
});

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('グローバルエラー:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未処理のPromise拒否:', event.reason);
    event.preventDefault();
});

export default KuhnPokerApp;
