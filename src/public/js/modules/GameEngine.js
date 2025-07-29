/**
 * ゲームエンジン - クーンポーカーのゲームロジックを管理
 */

import { CARDS, DECK, END_STATES, ACTIONS } from '../config/constants.js';
import { shuffle, debugLog } from '../utils/helpers.js';

export class GameEngine {
    constructor() {
        this.reset();
    }

    /**
     * ゲーム状態をリセット
     */
    reset() {
        this.playerHand = null;
        this.opponentHand = null;
        this.currentPlayerPot = 1;
        this.currentOpponentPot = 1;
        this.actionSequence = '';
        this.gamePhase = 'dealing';
        this.currentPlayer = 'player';
        this.gameResult = null;
        this.winner = null;
        this.hands = [];
        this.isGameOver = false;
        
        debugLog('ゲームエンジンがリセットされました');
    }

    /**
     * 新しいゲームを開始
     */
    startNewGame() {
        this.reset();
        this.dealCards();
        this.gamePhase = 'player_action';
        
        debugLog('新しいゲームが開始されました', {
            playerHand: this.playerHand,
            opponentHand: this.opponentHand
        });
        
        return {
            playerHand: this.playerHand,
            opponentHand: null, // 対戦相手の手札は隠す
            playerPot: this.currentPlayerPot,
            opponentPot: this.currentOpponentPot,
            totalPot: this.currentPlayerPot + this.currentOpponentPot,
            gamePhase: this.gamePhase,
            currentPlayer: this.currentPlayer
        };
    }

    /**
     * カードを配る
     */
    dealCards() {
        const shuffledDeck = shuffle(DECK);
        this.playerHand = shuffledDeck[0];
        this.opponentHand = shuffledDeck[1];
        this.hands = [this.playerHand, this.opponentHand];
        
        debugLog('カードが配られました', {
            player: this.playerHand,
            opponent: this.opponentHand
        });
    }

    /**
     * プレイヤーのアクションを処理
     */
    playerAction(action) {
        if (this.isGameOver || this.gamePhase !== 'player_action') {
            throw new Error('無効なゲーム状態でのアクション');
        }

        debugLog('プレイヤーアクション', { action, currentState: this.actionSequence });

        // アクションを記録
        this.actionSequence += action;
        
        // アクションに応じてポットを更新
        if (action === ACTIONS.BET) {
            this.currentPlayerPot = 2;
        }

        // ゲーム終了チェック
        if (this.isTerminalState()) {
            return this.endGame();
        }

        // 対戦相手のターンに移行
        this.gamePhase = 'opponent_action';
        this.currentPlayer = 'opponent';

        return {
            action,
            actionSequence: this.actionSequence,
            playerPot: this.currentPlayerPot,
            opponentPot: this.currentOpponentPot,
            totalPot: this.currentPlayerPot + this.currentOpponentPot,
            gamePhase: this.gamePhase,
            currentPlayer: this.currentPlayer,
            isGameOver: this.isGameOver
        };
    }

    /**
     * 対戦相手のアクションを処理
     */
    opponentAction(action) {
        if (this.isGameOver || this.gamePhase !== 'opponent_action') {
            throw new Error('無効なゲーム状態での対戦相手アクション');
        }

        debugLog('対戦相手アクション', { action, currentState: this.actionSequence });

        // アクションを記録
        this.actionSequence += action;
        
        // アクションに応じてポットを更新
        if (action === ACTIONS.BET) {
            this.currentOpponentPot = 2;
        } else if (action === ACTIONS.CALL) {
            this.currentOpponentPot = this.currentPlayerPot;
        }

        // ゲーム終了チェック
        if (this.isTerminalState()) {
            return this.endGame();
        }

        // プレイヤーのターンに戻る（2回目のアクション）
        this.gamePhase = 'player_action';
        this.currentPlayer = 'player';

        return {
            action,
            actionSequence: this.actionSequence,
            playerPot: this.currentPlayerPot,
            opponentPot: this.currentOpponentPot,
            totalPot: this.currentPlayerPot + this.currentOpponentPot,
            gamePhase: this.gamePhase,
            currentPlayer: this.currentPlayer,
            isGameOver: this.isGameOver
        };
    }

    /**
     * ゲーム終了状態かチェック
     */
    isTerminalState() {
        return END_STATES.includes(this.actionSequence);
    }

    /**
     * ゲームを終了し結果を計算
     */
    endGame() {
        this.isGameOver = true;
        this.gamePhase = 'game_over';
        
        const result = this.calculateGameResult();
        this.gameResult = result;
        this.winner = result.winner;

        debugLog('ゲーム終了', {
            actionSequence: this.actionSequence,
            result: result,
            playerHand: this.playerHand,
            opponentHand: this.opponentHand
        });

        return {
            ...result,
            actionSequence: this.actionSequence,
            playerHand: this.playerHand,
            opponentHand: this.opponentHand,
            playerPot: this.currentPlayerPot,
            opponentPot: this.currentOpponentPot,
            totalPot: this.currentPlayerPot + this.currentOpponentPot,
            gamePhase: this.gamePhase,
            isGameOver: this.isGameOver
        };
    }

    /**
     * ゲーム結果を計算
     */
    calculateGameResult() {
        const sequence = this.actionSequence;
        let winner, reason, payoff;

        debugLog('結果計算開始', {
            sequence,
            playerHand: this.playerHand,
            opponentHand: this.opponentHand
        });

        if (sequence === 'cc') {
            // 両者チェック -> ショーダウン
            if (CARDS[this.playerHand] > CARDS[this.opponentHand]) {
                winner = 'player';
                payoff = 1;
                reason = 'ショーダウンでプレイヤーの勝利';
            } else {
                winner = 'opponent';
                payoff = -1;
                reason = 'ショーダウンで対戦相手の勝利';
            }
        } else if (sequence === 'bk' || sequence === 'cbk') {
            // ベット -> コール または チェック -> ベット -> コール -> ショーダウン
            if (CARDS[this.playerHand] > CARDS[this.opponentHand]) {
                winner = 'player';
                payoff = 2;
                reason = 'ショーダウンでプレイヤーの勝利';
            } else {
                winner = 'opponent';
                payoff = -2;
                reason = 'ショーダウンで対戦相手の勝利';
            }
        } else if (sequence === 'cbf') {
            // チェック -> ベット -> フォールド
            winner = 'player';
            payoff = 1;
            reason = '対戦相手がフォールド';
        } else if (sequence.endsWith('f')) {
            // フォールドで終了
            if (sequence === 'bf') {
                winner = 'opponent';
                payoff = -1;
                reason = 'プレイヤーがフォールド';
            } else {
                winner = 'player';
                payoff = 1;
                reason = '対戦相手がフォールド';
            }
        } else {
            // 想定外のケース
            console.error('想定外のアクションシーケンス:', sequence);
            winner = 'opponent';
            payoff = 0;
            reason = 'エラー';
        }

        return {
            winner,
            payoff,
            reason,
            playerCard: this.playerHand,
            opponentCard: this.opponentHand,
            finalPot: this.currentPlayerPot + this.currentOpponentPot
        };
    }

    /**
     * 現在のゲーム状態を取得
     */
    getGameState() {
        return {
            playerHand: this.playerHand,
            opponentHand: this.isGameOver ? this.opponentHand : null,
            playerPot: this.currentPlayerPot,
            opponentPot: this.currentOpponentPot,
            totalPot: this.currentPlayerPot + this.currentOpponentPot,
            actionSequence: this.actionSequence,
            gamePhase: this.gamePhase,
            currentPlayer: this.currentPlayer,
            isGameOver: this.isGameOver,
            gameResult: this.gameResult
        };
    }

    /**
     * 有効なアクションを取得
     */
    getValidActions() {
        if (this.isGameOver) {
            return [];
        }

        if (this.gamePhase === 'player_action' || this.gamePhase === 'opponent_action') {
            const sequence = this.actionSequence;
            
            if (sequence === '') {
                // 最初のアクション：ベットかチェック
                return [ACTIONS.BET, ACTIONS.CHECK];
            } else if (sequence === 'b') {
                // ベットに対して：コールかフォールド
                return [ACTIONS.CALL, ACTIONS.FOLD];
            } else if (sequence === 'c') {
                // チェックに対して：ベットかチェック
                return [ACTIONS.BET, ACTIONS.CHECK];
            } else if (sequence === 'cb') {
                // チェック -> ベットに対して：コールかフォールド
                return [ACTIONS.CALL, ACTIONS.FOLD];
            }
        }

        return [];
    }

    /**
     * ゲーム履歴を取得（デバッグ用）
     */
    getGameHistory() {
        return {
            playerHand: this.playerHand,
            opponentHand: this.opponentHand,
            actionSequence: this.actionSequence,
            finalPots: {
                player: this.currentPlayerPot,
                opponent: this.currentOpponentPot
            },
            result: this.gameResult
        };
    }
}
