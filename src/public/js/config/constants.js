/**
 * ゲーム定数の定義
 */

// カードの強さ定義
export const CARDS = { 'A': 3, 'K': 2, 'Q': 1 };

// デッキ構成
export const DECK = ['A', 'K', 'Q'];

// AI プロファイル定義
export const AI_PROFILES = {
    kensjitsu: { 
        name: "堅実", 
        s1_a_bet: 0.8, s1_k_bet: 0.0, s1_q_bet: 0.1, 
        s1_a_call: 1.0, s1_k_call: 0.1, s1_q_call: 0.0, 
        s2_a_bet: 1.0, s2_k_bet: 0.0, s2_q_bet: 0.1, 
        s2_a_call: 1.0, s2_k_call: 0.2, s2_q_call: 0.0 
    },
    kiai: { 
        name: "気合太郎", 
        s1_a_bet: 1.0, s1_k_bet: 0.8, s1_q_bet: 0.7, 
        s1_a_call: 1.0, s1_k_call: 0.9, s1_q_call: 0.8, 
        s2_a_bet: 1.0, s2_k_bet: 0.8, s2_q_bet: 0.7, 
        s2_a_call: 1.0, s2_k_call: 0.9, s2_q_call: 0.8 
    },
    mitaiman: { 
        name: "フロップ見たいマン", 
        s1_a_bet: 0.2, s1_k_bet: 0.1, s1_q_bet: 0.0, 
        s1_a_call: 1.0, s1_k_call: 0.9, s1_q_call: 0.9, 
        s2_a_bet: 0.2, s2_k_bet: 0.1, s2_q_bet: 0.0, 
        s2_a_call: 1.0, s2_k_call: 0.9, s2_q_call: 0.9 
    },
    tightaggressive: { 
        name: "タイトアグレ", 
        s1_a_bet: 1.0, s1_k_bet: 0.1, s1_q_bet: 0.8, 
        s1_a_call: 1.0, s1_k_call: 0.0, s1_q_call: 0.0, 
        s2_a_bet: 1.0, s2_k_bet: 0.1, s2_q_bet: 0.8, 
        s2_a_call: 1.0, s2_k_call: 0.0, s2_q_call: 0.0 
    },
    gto: { 
        name: "GTO AI", 
        s1_a_bet: 0.5, s1_k_bet: 0.333, s1_q_bet: 0.333, 
        s1_a_call: 1.0, s1_k_call: 0.333, s1_q_call: 0.0, 
        s2_a_bet: 1.0, s2_k_bet: 0.0, s2_q_bet: 0.6, 
        s2_a_call: 1.0, s2_k_call: 0.0, s2_q_call: 0.0 
    }
};

// ゲーム終了状態
export const END_STATES = ['cc', 'bk', 'cbf', 'cbk'];

// アクション定義
export const ACTIONS = {
    BET: 'b',
    CHECK: 'c',
    CALL: 'k',
    FOLD: 'f'
};

// アクション名（日本語）
export const ACTION_NAMES = {
    'b': 'ベット',
    'c': 'チェック',
    'k': 'コール',
    'f': 'フォールド'
};

// UI要素のIDマッピング
export const UI_ELEMENTS = {
    SCREENS: {
        START: 'start-screen',
        MAIN_GAME: 'main-game-container',
        STATS_HUB: 'stats-hub-screen',
        SIMULATOR: 'simulator-screen'
    },
    BUTTONS: {
        BET: 'bet-button',
        CHECK: 'check-button',
        CALL: 'call-button',
        FOLD: 'fold-button',
        NEW_GAME: 'new-game-button'
    },
    DISPLAYS: {
        PLAYER_HAND: 'player-hand',
        OPPONENT_HAND: 'opponent-hand',
        PLAYER_CHIPS: 'player-chips',
        OPPONENT_CHIPS: 'opponent-chips',
        POT_AMOUNT: 'pot-amount',
        MESSAGE_AREA: 'message-area'
    }
};

// デフォルト設定
export const DEFAULT_CUSTOM_AI_SETTINGS = {
    name: "カスタムAI",
    s1_a_bet: 0.8, s1_k_bet: 0.0, s1_q_bet: 0.1,
    s1_a_call: 1.0, s1_k_call: 0.1, s1_q_call: 0.0,
    s2_a_bet: 1.0, s2_k_bet: 0.0, s2_q_bet: 0.1,
    s2_a_call: 1.0, s2_k_call: 0.2, s2_q_call: 0.0
};
