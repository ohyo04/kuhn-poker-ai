/**
 * UI管理モジュール - ユーザーインターフェースの操作を担当
 */

import { UI_ELEMENTS, ACTION_NAMES } from '../config/constants.js';
import { 
    showElement, hideElement, enableElement, disableElement,
    setElementText, setElementHTML, addClass, removeClass,
    getCardDisplayName
} from '../utils/helpers.js';

export class UIManager {
    constructor() {
        this.currentScreen = 'start-screen';
        this.animationDuration = 300;
        this.isAnimating = false;
        this.messageQueue = [];
    }

    /**
     * 初期化
     */
    initialize() {
        this.setupEventListeners();
        this.showScreen('start-screen');
        console.log('UIManager初期化完了');
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // ゲーム画面ナビゲーション
        this.addClickListener('start-game-btn', () => this.showMainGame());
        this.addClickListener('show-stats-btn', () => this.showStatsHub());
        this.addClickListener('show-simulator-btn', () => this.showSimulator());
        
        // 戻るボタン
        this.addClickListener('back-to-main-btn', () => this.showMainGame());
        this.addClickListener('back-to-start-btn', () => this.showScreen('start-screen'));
        this.addClickListener('stats-back-btn', () => this.showScreen('start-screen'));
        this.addClickListener('simulator-back-btn', () => this.showScreen('start-screen'));

        // レスポンシブメニュー
        this.setupMobileMenu();
    }

    /**
     * クリックリスナーを追加
     */
    addClickListener(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', handler);
        }
    }

    /**
     * モバイルメニューの設定
     */
    setupMobileMenu() {
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.style.display = mobileMenu.style.display === 'block' ? 'none' : 'block';
            });
        }
    }

    /**
     * 画面表示の切り替え
     */
    showScreen(screenId) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        // すべての画面を非表示
        Object.values(UI_ELEMENTS.SCREENS).forEach(id => {
            hideElement(id);
        });

        // 指定された画面を表示
        setTimeout(() => {
            showElement(screenId);
            this.currentScreen = screenId;
            this.isAnimating = false;
            
            // 画面に応じた初期化処理
            this.onScreenChange(screenId);
        }, 100);
    }

    /**
     * 画面変更時の処理
     */
    onScreenChange(screenId) {
        switch (screenId) {
            case 'main-game-container':
                this.refreshGameUI();
                break;
            case 'stats-hub-screen':
                this.refreshStatsUI();
                break;
            case 'simulator-screen':
                this.refreshSimulatorUI();
                break;
        }
    }

    /**
     * メインゲーム画面を表示
     */
    showMainGame() {
        this.showScreen('main-game-container');
    }

    /**
     * 統計ハブ画面を表示
     */
    showStatsHub() {
        this.showScreen('stats-hub-screen');
    }

    /**
     * シミュレータ画面を表示
     */
    showSimulator() {
        this.showScreen('simulator-screen');
    }

    /**
     * ゲームUIの更新
     */
    updateGameUI(gameState) {
        const {
            playerHand,
            opponentHand,
            playerPot,
            opponentPot,
            totalPot,
            isGameOver,
            gamePhase
        } = gameState;

        // ハンドの表示
        this.updatePlayerHand(playerHand);
        this.updateOpponentHand(opponentHand, isGameOver);

        // ポットの表示
        this.updatePots(playerPot, opponentPot, totalPot);

        // ボタンの状態更新
        this.updateActionButtons(gameState);

        // ゲームフェーズの表示
        this.updateGamePhase(gamePhase);
    }

    /**
     * プレイヤーハンドの表示更新
     */
    updatePlayerHand(hand) {
        if (hand) {
            setElementText(UI_ELEMENTS.DISPLAYS.PLAYER_HAND, getCardDisplayName(hand));
            addClass(UI_ELEMENTS.DISPLAYS.PLAYER_HAND, 'card-revealed');
        } else {
            setElementText(UI_ELEMENTS.DISPLAYS.PLAYER_HAND, '？');
            removeClass(UI_ELEMENTS.DISPLAYS.PLAYER_HAND, 'card-revealed');
        }
    }

    /**
     * 対戦相手ハンドの表示更新
     */
    updateOpponentHand(hand, revealed = false) {
        if (revealed && hand) {
            setElementText(UI_ELEMENTS.DISPLAYS.OPPONENT_HAND, getCardDisplayName(hand));
            addClass(UI_ELEMENTS.DISPLAYS.OPPONENT_HAND, 'card-revealed');
        } else {
            setElementText(UI_ELEMENTS.DISPLAYS.OPPONENT_HAND, '？');
            removeClass(UI_ELEMENTS.DISPLAYS.OPPONENT_HAND, 'card-revealed');
        }
    }

    /**
     * ポット表示の更新
     */
    updatePots(playerPot, opponentPot, totalPot) {
        setElementText(UI_ELEMENTS.DISPLAYS.PLAYER_CHIPS, `${playerPot}チップ`);
        setElementText(UI_ELEMENTS.DISPLAYS.OPPONENT_CHIPS, `${opponentPot}チップ`);
        setElementText(UI_ELEMENTS.DISPLAYS.POT_AMOUNT, `ポット: ${totalPot}チップ`);
    }

    /**
     * アクションボタンの状態更新
     */
    updateActionButtons(gameState) {
        const { isGameOver, gamePhase, currentPlayer } = gameState;
        
        // 全ボタンを一旦無効化
        Object.values(UI_ELEMENTS.BUTTONS).forEach(buttonId => {
            if (buttonId !== 'new-game-button') {
                disableElement(buttonId);
            }
        });

        if (isGameOver) {
            // ゲーム終了時は新しいゲームボタンのみ有効
            enableElement(UI_ELEMENTS.BUTTONS.NEW_GAME);
        } else if (gamePhase === 'player_action' && currentPlayer === 'player') {
            // プレイヤーのターン時は有効なアクションボタンを有効化
            const validActions = gameState.validActions || [];
            
            validActions.forEach(action => {
                switch (action) {
                    case 'b':
                        enableElement(UI_ELEMENTS.BUTTONS.BET);
                        break;
                    case 'c':
                        enableElement(UI_ELEMENTS.BUTTONS.CHECK);
                        break;
                    case 'k':
                        enableElement(UI_ELEMENTS.BUTTONS.CALL);
                        break;
                    case 'f':
                        enableElement(UI_ELEMENTS.BUTTONS.FOLD);
                        break;
                }
            });
        }
    }

    /**
     * ゲームフェーズの表示更新
     */
    updateGamePhase(phase) {
        let phaseText = '';
        
        switch (phase) {
            case 'dealing':
                phaseText = 'カードを配っています...';
                break;
            case 'player_action':
                phaseText = 'あなたのターンです';
                break;
            case 'opponent_action':
                phaseText = '相手が考えています...';
                break;
            case 'game_over':
                phaseText = 'ゲーム終了';
                break;
            default:
                phaseText = '';
        }

        const phaseElement = document.getElementById('game-phase');
        if (phaseElement) {
            setElementText('game-phase', phaseText);
        }
    }

    /**
     * メッセージの表示
     */
    showMessage(message, type = 'info', duration = 3000) {
        const messageArea = document.getElementById(UI_ELEMENTS.DISPLAYS.MESSAGE_AREA);
        if (!messageArea) return;

        // メッセージ要素の作成
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${type}`;
        messageElement.textContent = message;

        // メッセージを追加
        messageArea.appendChild(messageElement);

        // アニメーション効果
        setTimeout(() => {
            addClass(messageElement.id, 'message-show');
        }, 10);

        // 自動削除
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, duration);
    }

    /**
     * ゲーム結果の表示
     */
    showGameResult(result) {
        const { winner, reason, payoff, playerCard, opponentCard } = result;
        
        let message = '';
        let messageType = '';

        if (winner === 'player') {
            message = `勝利！ ${reason} (+${Math.abs(payoff)}チップ)`;
            messageType = 'success';
        } else {
            message = `敗北... ${reason} (${payoff}チップ)`;
            messageType = 'error';
        }

        this.showMessage(message, messageType, 5000);

        // カード情報も表示
        const cardMessage = `あなた: ${getCardDisplayName(playerCard)}, 相手: ${getCardDisplayName(opponentCard)}`;
        setTimeout(() => {
            this.showMessage(cardMessage, 'info', 4000);
        }, 1000);
    }

    /**
     * AIアクションの表示
     */
    showAIAction(action) {
        const actionName = ACTION_NAMES[action] || action;
        this.showMessage(`相手の行動: ${actionName}`, 'info', 2000);
    }

    /**
     * ローディング表示
     */
    showLoading(elementId, message = '読み込み中...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div class="loading">${message}</div>`;
        }
    }

    /**
     * エラー表示
     */
    showError(message, elementId = null) {
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = `<div class="error">${message}</div>`;
            }
        } else {
            this.showMessage(message, 'error', 5000);
        }
    }

    /**
     * 統計表示の更新
     */
    updateStats(stats) {
        const elements = {
            'total-games': stats.totalGames || 0,
            'player-wins': stats.playerWins || 0,
            'ai-wins': stats.aiWins || 0,
            'win-rate': `${stats.winRate || 0}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            setElementText(id, value);
        });
    }

    /**
     * シミュレーション結果の表示
     */
    updateSimulationResults(results) {
        const resultsContainer = document.getElementById('simulation-results');
        if (!resultsContainer || !results) return;

        let html = '<h3>シミュレーション結果</h3>';
        
        results.forEach((result, index) => {
            html += `
                <div class="simulation-result">
                    <h4>対戦 ${index + 1}: ${result.ai1_name} vs ${result.ai2_name}</h4>
                    <p>${result.ai1_name}: ${result.ai1_wins}勝</p>
                    <p>${result.ai2_name}: ${result.ai2_wins}勝</p>
                    <p>総ゲーム数: ${result.total_games}</p>
                    <p>勝率: ${result.ai1_name} ${Math.round((result.ai1_wins / result.total_games) * 100)}%</p>
                </div>
            `;
        });

        setElementHTML('simulation-results', html);
    }

    /**
     * UI要素の再描画
     */
    refreshGameUI() {
        // ゲーム画面の要素を初期状態にリセット
        this.updatePlayerHand(null);
        this.updateOpponentHand(null, false);
        this.updatePots(1, 1, 2);
        this.updateGamePhase('dealing');
        
        // ボタンを初期状態に
        Object.values(UI_ELEMENTS.BUTTONS).forEach(buttonId => {
            disableElement(buttonId);
        });
        
        enableElement(UI_ELEMENTS.BUTTONS.NEW_GAME);
    }

    /**
     * 統計UIの再描画
     */
    refreshStatsUI() {
        // 統計データの再読み込みをトリガー
        if (window.gameApp && window.gameApp.statsManager) {
            window.gameApp.statsManager.loadStats();
        }
    }

    /**
     * シミュレータUIの再描画
     */
    refreshSimulatorUI() {
        // シミュレータの初期化をトリガー
        if (window.gameApp && window.gameApp.simulatorManager) {
            window.gameApp.simulatorManager.initializeUI();
        }
    }

    /**
     * アニメーション効果の追加
     */
    addAnimation(elementId, animationClass, duration = 1000) {
        const element = document.getElementById(elementId);
        if (element) {
            addClass(elementId, animationClass);
            
            setTimeout(() => {
                removeClass(elementId, animationClass);
            }, duration);
        }
    }

    /**
     * レスポンシブ対応の確認
     */
    checkResponsive() {
        const isMobile = window.innerWidth <= 768;
        const body = document.body;
        
        if (isMobile) {
            body.classList.add('mobile-view');
        } else {
            body.classList.remove('mobile-view');
        }
        
        return isMobile;
    }
}
