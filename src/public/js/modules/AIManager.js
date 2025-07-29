/**
 * AI管理モジュール - AI戦略とアクション決定を担当
 */

import { AI_PROFILES, ACTIONS, CARDS } from '../config/constants.js';
import { debugLog } from '../utils/helpers.js';

export class AIManager {
    constructor() {
        this.currentProfile = AI_PROFILES.kensjitsu;
        this.customProfile = null;
        this.debugMode = false;
    }

    /**
     * AIプロファイルを設定
     */
    setProfile(profileKey) {
        if (AI_PROFILES[profileKey]) {
            this.currentProfile = AI_PROFILES[profileKey];
            debugLog('AIプロファイル変更', { 
                profileKey, 
                profileName: this.currentProfile.name 
            });
            return true;
        }
        return false;
    }

    /**
     * カスタムAIプロファイルを設定
     */
    setCustomProfile(profileData) {
        // 必要なパラメータがすべて含まれているかチェック
        const requiredParams = [
            's1_a_bet', 's1_k_bet', 's1_q_bet',
            's1_a_call', 's1_k_call', 's1_q_call',
            's2_a_bet', 's2_k_bet', 's2_q_bet',
            's2_a_call', 's2_k_call', 's2_q_call'
        ];

        for (const param of requiredParams) {
            if (typeof profileData[param] !== 'number' || 
                profileData[param] < 0 || profileData[param] > 1) {
                throw new Error(`無効なパラメータ: ${param}`);
            }
        }

        this.customProfile = {
            name: profileData.name || 'カスタムAI',
            ...profileData
        };

        this.currentProfile = this.customProfile;
        
        debugLog('カスタムAIプロファイル設定', { 
            profileName: this.customProfile.name,
            profile: this.customProfile
        });

        return true;
    }

    /**
     * 現在のプロファイルを取得
     */
    getCurrentProfile() {
        return { ...this.currentProfile };
    }

    /**
     * 利用可能なプロファイル一覧を取得
     */
    getAvailableProfiles() {
        return Object.entries(AI_PROFILES).map(([key, profile]) => ({
            key,
            name: profile.name
        }));
    }

    /**
     * AIのアクションを決定
     */
    decideAction(gameState) {
        const { opponentHand, actionSequence, validActions } = gameState;
        
        if (!opponentHand || !validActions || validActions.length === 0) {
            throw new Error('無効なゲーム状態');
        }

        debugLog('AI行動決定開始', {
            hand: opponentHand,
            sequence: actionSequence,
            validActions: validActions,
            profile: this.currentProfile.name
        });

        // 現在の状況を分析
        const situation = this.analyzeSituation(actionSequence);
        const action = this.getActionFromStrategy(opponentHand, situation, validActions);

        debugLog('AI行動決定完了', {
            situation,
            selectedAction: action,
            hand: opponentHand
        });

        return action;
    }

    /**
     * ゲーム状況を分析
     */
    analyzeSituation(actionSequence) {
        if (actionSequence === '') {
            return 'first_action';
        } else if (actionSequence === 'b') {
            return 'facing_bet';
        } else if (actionSequence === 'c') {
            return 'after_check';
        } else if (actionSequence === 'cb') {
            return 'facing_second_bet';
        }
        
        return 'unknown';
    }

    /**
     * 戦略に基づいてアクションを選択
     */
    getActionFromStrategy(hand, situation, validActions) {
        const profile = this.currentProfile;
        let actionProbabilities = {};

        // 状況とハンドに基づく戦略選択
        if (situation === 'first_action') {
            // 最初のアクション（ベットかチェック）
            const betProb = profile[`s1_${hand.toLowerCase()}_bet`];
            actionProbabilities[ACTIONS.BET] = betProb;
            actionProbabilities[ACTIONS.CHECK] = 1 - betProb;
        } else if (situation === 'facing_bet' || situation === 'facing_second_bet') {
            // ベットに対する反応（コールかフォールド）
            const callProb = profile[`s1_${hand.toLowerCase()}_call`];
            actionProbabilities[ACTIONS.CALL] = callProb;
            actionProbabilities[ACTIONS.FOLD] = 1 - callProb;
        } else if (situation === 'after_check') {
            // チェック後のアクション（ベットかチェック）
            const betProb = profile[`s2_${hand.toLowerCase()}_bet`];
            actionProbabilities[ACTIONS.BET] = betProb;
            actionProbabilities[ACTIONS.CHECK] = 1 - betProb;
        }

        // 有効なアクションのみでの確率を正規化
        const validProbabilities = {};
        let totalProb = 0;

        for (const action of validActions) {
            if (actionProbabilities[action] !== undefined) {
                validProbabilities[action] = actionProbabilities[action];
                totalProb += actionProbabilities[action];
            }
        }

        // 確率に基づいてアクションを選択
        const randomValue = Math.random() * totalProb;
        let cumulative = 0;

        for (const [action, prob] of Object.entries(validProbabilities)) {
            cumulative += prob;
            if (randomValue <= cumulative) {
                return action;
            }
        }

        // フォールバック：最初の有効なアクション
        return validActions[0];
    }

    /**
     * AI vs AI ゲーム用のアクション決定
     */
    decideActionForSimulation(hand, actionSequence, validActions, profileKey = null) {
        const originalProfile = this.currentProfile;
        
        // 指定されたプロファイルを一時的に設定
        if (profileKey && AI_PROFILES[profileKey]) {
            this.currentProfile = AI_PROFILES[profileKey];
        }

        try {
            const gameState = {
                opponentHand: hand,
                actionSequence,
                validActions
            };

            const action = this.decideAction(gameState);
            return action;
        } finally {
            // 元のプロファイルに戻す
            this.currentProfile = originalProfile;
        }
    }

    /**
     * プロファイルの戦略分析
     */
    analyzeProfile(profileKey = null) {
        const profile = profileKey ? AI_PROFILES[profileKey] : this.currentProfile;
        
        if (!profile) {
            throw new Error('無効なプロファイル');
        }

        const analysis = {
            name: profile.name,
            aggressiveness: this.calculateAggressiveness(profile),
            tightness: this.calculateTightness(profile),
            bluffing: this.calculateBluffing(profile),
            strengths: [],
            weaknesses: []
        };

        // 強みと弱みを分析
        if (analysis.aggressiveness > 0.7) {
            analysis.strengths.push('積極的なベッティング');
        } else if (analysis.aggressiveness < 0.3) {
            analysis.weaknesses.push('消極的すぎる');
        }

        if (analysis.tightness > 0.7) {
            analysis.strengths.push('選択的なハンド選択');
        } else if (analysis.tightness < 0.3) {
            analysis.weaknesses.push('ルースすぎるプレイ');
        }

        if (analysis.bluffing > 0.5) {
            analysis.strengths.push('効果的なブラフ');
        }

        return analysis;
    }

    /**
     * 積極性を計算
     */
    calculateAggressiveness(profile) {
        const betActions = [
            profile.s1_a_bet, profile.s1_k_bet, profile.s1_q_bet,
            profile.s2_a_bet, profile.s2_k_bet, profile.s2_q_bet
        ];
        
        return betActions.reduce((sum, val) => sum + val, 0) / betActions.length;
    }

    /**
     * タイトネスを計算
     */
    calculateTightness(profile) {
        // 弱いハンド（Q）での慎重さ
        const weakHandCaution = 1 - (profile.s1_q_bet + profile.s1_q_call + 
                                     profile.s2_q_bet + profile.s2_q_call) / 4;
        return weakHandCaution;
    }

    /**
     * ブラフ頻度を計算
     */
    calculateBluffing(profile) {
        // クイーン（最弱ハンド）でのベット頻度
        return (profile.s1_q_bet + profile.s2_q_bet) / 2;
    }

    /**
     * 戦略的アドバイスを生成
     */
    getStrategicAdvice(recentGames) {
        if (!recentGames || recentGames.length === 0) {
            return ['より多くのゲームをプレイして分析データを蓄積しましょう'];
        }

        const advice = [];
        const playerWinRate = recentGames.filter(g => g.winner === 'player').length / recentGames.length;

        if (playerWinRate < 0.3) {
            advice.push('AIに対してより積極的にプレイしてみましょう');
            advice.push('強いハンド（A, K）では積極的にベットを検討してください');
        } else if (playerWinRate > 0.7) {
            advice.push('現在の戦略は効果的です！');
            advice.push('AIのパターンを把握できているようです');
        }

        // AIプロファイル別のアドバイス
        const profileName = this.currentProfile.name;
        switch (profileName) {
            case '堅実':
                advice.push('堅実なAIに対してはブラフが効果的です');
                break;
            case '気合太郎':
                advice.push('アグレッシブなAIには慎重なプレイが有効です');
                break;
            case 'フロップ見たいマン':
                advice.push('パッシブなAIには積極的にベットしましょう');
                break;
        }

        return advice;
    }

    /**
     * デバッグモードの切り替え
     */
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        debugLog('AIデバッグモード', { enabled: this.debugMode });
        return this.debugMode;
    }
}
