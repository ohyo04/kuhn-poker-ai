/**
 * 統計管理モジュール - ゲーム統計とパフォーマンス分析を担当
 */

import { loadFromStorage, saveToStorage, calculateWinRate } from '../utils/helpers.js';

export class StatsManager {
    constructor(dataManager, uiManager) {
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.currentStats = null;
        this.recentGames = [];
        this.performanceMetrics = {};
    }

    /**
     * 統計データの初期化
     */
    async initialize() {
        await this.loadStats();
        this.setupStatsEventListeners();
        console.log('StatsManager初期化完了');
    }

    /**
     * 統計データの読み込み
     */
    async loadStats() {
        try {
            // サーバーから統計データを取得
            const serverStats = await this.dataManager.getStats();
            
            // ローカルの統計データもマージ
            const localStats = this.getLocalStats();
            
            this.currentStats = this.mergeStats(serverStats, localStats);
            this.recentGames = await this.getRecentGames();
            
            // パフォーマンス指標を計算
            this.calculatePerformanceMetrics();
            
            // UIに反映
            this.updateStatsDisplay();
            
            console.log('統計データを読み込みました:', this.currentStats);
        } catch (error) {
            console.error('統計データの読み込みに失敗:', error);
            // エラー時はローカルデータのみ使用
            this.currentStats = this.getLocalStats();
            this.updateStatsDisplay();
        }
    }

    /**
     * ローカル統計データの取得
     */
    getLocalStats() {
        const games = this.dataManager.getLocalGames();
        
        if (games.length === 0) {
            return {
                totalGames: 0,
                playerWins: 0,
                aiWins: 0,
                winRate: 0,
                averageGameLength: 0,
                totalChipsWon: 0,
                totalChipsLost: 0
            };
        }

        const playerWins = games.filter(game => game.winner === 'player').length;
        const aiWins = games.filter(game => game.winner === 'ai').length;
        const totalChipsWon = games
            .filter(game => game.winner === 'player')
            .reduce((sum, game) => sum + Math.abs(game.payoff || 0), 0);
        const totalChipsLost = games
            .filter(game => game.winner === 'ai')
            .reduce((sum, game) => sum + Math.abs(game.payoff || 0), 0);

        return {
            totalGames: games.length,
            playerWins,
            aiWins,
            winRate: calculateWinRate(playerWins, games.length),
            averageGameLength: this.calculateAverageGameLength(games),
            totalChipsWon,
            totalChipsLost
        };
    }

    /**
     * 統計データのマージ
     */
    mergeStats(serverStats, localStats) {
        // サーバー統計が利用できない場合はローカルのみ
        if (!serverStats || Object.keys(serverStats).length === 0) {
            return localStats;
        }

        // 基本的にサーバー統計を優先し、ローカル統計で補完
        return {
            totalGames: serverStats.totalGames || localStats.totalGames,
            playerWins: serverStats.playerWins || localStats.playerWins,
            aiWins: serverStats.aiWins || localStats.aiWins,
            winRate: serverStats.winRate || localStats.winRate,
            averageGameLength: localStats.averageGameLength,
            totalChipsWon: localStats.totalChipsWon,
            totalChipsLost: localStats.totalChipsLost
        };
    }

    /**
     * 最近のゲーム履歴を取得
     */
    async getRecentGames(limit = 20) {
        const games = this.dataManager.getLocalGames();
        return games
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * ゲーム平均長さの計算
     */
    calculateAverageGameLength(games) {
        if (games.length === 0) return 0;
        
        const totalLength = games.reduce((sum, game) => {
            return sum + (game.actionSequence ? game.actionSequence.length : 2);
        }, 0);
        
        return Math.round((totalLength / games.length) * 10) / 10;
    }

    /**
     * パフォーマンス指標の計算
     */
    calculatePerformanceMetrics() {
        if (!this.recentGames || this.recentGames.length === 0) {
            this.performanceMetrics = {};
            return;
        }

        const recent10 = this.recentGames.slice(0, 10);
        const recent5 = this.recentGames.slice(0, 5);

        this.performanceMetrics = {
            recent10WinRate: calculateWinRate(
                recent10.filter(g => g.winner === 'player').length,
                recent10.length
            ),
            recent5WinRate: calculateWinRate(
                recent5.filter(g => g.winner === 'player').length,
                recent5.length
            ),
            longestWinStreak: this.calculateLongestStreak('player'),
            longestLossStreak: this.calculateLongestStreak('ai'),
            currentStreak: this.calculateCurrentStreak(),
            favoriteAction: this.calculateFavoriteAction(),
            winRateByHand: this.calculateWinRateByHand()
        };
    }

    /**
     * 最長連勝/連敗記録の計算
     */
    calculateLongestStreak(winner) {
        if (!this.recentGames || this.recentGames.length === 0) return 0;

        let maxStreak = 0;
        let currentStreak = 0;

        // 古い順に並べて計算
        const chronologicalGames = [...this.recentGames].reverse();

        for (const game of chronologicalGames) {
            if (game.winner === winner) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }

        return maxStreak;
    }

    /**
     * 現在の連勝/連敗記録の計算
     */
    calculateCurrentStreak() {
        if (!this.recentGames || this.recentGames.length === 0) {
            return { type: 'none', count: 0 };
        }

        const lastGame = this.recentGames[0];
        let streakCount = 1;
        const winnerType = lastGame.winner;

        for (let i = 1; i < this.recentGames.length; i++) {
            if (this.recentGames[i].winner === winnerType) {
                streakCount++;
            } else {
                break;
            }
        }

        return {
            type: winnerType === 'player' ? 'win' : 'loss',
            count: streakCount
        };
    }

    /**
     * よく使うアクションの分析
     */
    calculateFavoriteAction() {
        if (!this.recentGames || this.recentGames.length === 0) return null;

        const actionCounts = { 'b': 0, 'c': 0, 'k': 0, 'f': 0 };
        
        this.recentGames.forEach(game => {
            if (game.actionSequence) {
                // プレイヤーのアクションのみを抽出（偶数インデックス）
                for (let i = 0; i < game.actionSequence.length; i += 2) {
                    const action = game.actionSequence[i];
                    if (actionCounts.hasOwnProperty(action)) {
                        actionCounts[action]++;
                    }
                }
            }
        });

        const maxCount = Math.max(...Object.values(actionCounts));
        const favoriteAction = Object.keys(actionCounts).find(
            action => actionCounts[action] === maxCount
        );

        const actionNames = { 'b': 'ベット', 'c': 'チェック', 'k': 'コール', 'f': 'フォールド' };
        
        return {
            action: favoriteAction,
            name: actionNames[favoriteAction],
            count: maxCount,
            percentage: Math.round((maxCount / this.recentGames.length) * 100)
        };
    }

    /**
     * ハンド別勝率の計算
     */
    calculateWinRateByHand() {
        if (!this.recentGames || this.recentGames.length === 0) return {};

        const handStats = { 'A': { wins: 0, total: 0 }, 'K': { wins: 0, total: 0 }, 'Q': { wins: 0, total: 0 } };

        this.recentGames.forEach(game => {
            const hand = game.playerCard;
            if (hand && handStats[hand]) {
                handStats[hand].total++;
                if (game.winner === 'player') {
                    handStats[hand].wins++;
                }
            }
        });

        const result = {};
        Object.keys(handStats).forEach(hand => {
            const stats = handStats[hand];
            result[hand] = {
                winRate: calculateWinRate(stats.wins, stats.total),
                games: stats.total
            };
        });

        return result;
    }

    /**
     * 統計表示の更新
     */
    updateStatsDisplay() {
        if (!this.currentStats) return;

        // 基本統計の更新
        this.uiManager.updateStats(this.currentStats);

        // 詳細統計の更新
        this.updateDetailedStats();

        // パフォーマンス指標の更新
        this.updatePerformanceDisplay();

        // ゲーム履歴の更新
        this.updateGameHistory();
    }

    /**
     * 詳細統計の表示更新
     */
    updateDetailedStats() {
        const elements = {
            'average-game-length': `${this.currentStats.averageGameLength || 0}アクション`,
            'total-chips-won': `${this.currentStats.totalChipsWon || 0}チップ`,
            'total-chips-lost': `${this.currentStats.totalChipsLost || 0}チップ`,
            'net-chips': `${(this.currentStats.totalChipsWon || 0) - (this.currentStats.totalChipsLost || 0)}チップ`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * パフォーマンス指標の表示更新
     */
    updatePerformanceDisplay() {
        if (!this.performanceMetrics) return;

        const elements = {
            'recent-10-winrate': `${this.performanceMetrics.recent10WinRate || 0}%`,
            'recent-5-winrate': `${this.performanceMetrics.recent5WinRate || 0}%`,
            'longest-win-streak': `${this.performanceMetrics.longestWinStreak || 0}連勝`,
            'longest-loss-streak': `${this.performanceMetrics.longestLossStreak || 0}連敗`,
            'current-streak': this.formatCurrentStreak(this.performanceMetrics.currentStreak)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // よく使うアクション
        if (this.performanceMetrics.favoriteAction) {
            const favoriteElement = document.getElementById('favorite-action');
            if (favoriteElement) {
                favoriteElement.textContent = 
                    `${this.performanceMetrics.favoriteAction.name} (${this.performanceMetrics.favoriteAction.percentage}%)`;
            }
        }

        // ハンド別勝率
        this.updateHandWinRates();
    }

    /**
     * 現在の連勝/連敗記録のフォーマット
     */
    formatCurrentStreak(streak) {
        if (!streak || streak.count === 0) return '記録なし';
        
        const type = streak.type === 'win' ? '連勝' : '連敗';
        return `${streak.count}${type}中`;
    }

    /**
     * ハンド別勝率の表示更新
     */
    updateHandWinRates() {
        if (!this.performanceMetrics.winRateByHand) return;

        const handNames = { 'A': 'エース', 'K': 'キング', 'Q': 'クイーン' };
        
        Object.entries(this.performanceMetrics.winRateByHand).forEach(([hand, stats]) => {
            const elementId = `hand-${hand.toLowerCase()}-winrate`;
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = `${handNames[hand]}: ${stats.winRate}% (${stats.games}ゲーム)`;
            }
        });
    }

    /**
     * ゲーム履歴の表示更新
     */
    updateGameHistory() {
        const historyContainer = document.getElementById('game-history-list');
        if (!historyContainer || !this.recentGames) return;

        let html = '';
        
        this.recentGames.slice(0, 10).forEach((game, index) => {
            const resultClass = game.winner === 'player' ? 'win' : 'loss';
            const resultText = game.winner === 'player' ? '勝利' : '敗北';
            const date = new Date(game.timestamp).toLocaleDateString();
            
            html += `
                <div class="game-history-item ${resultClass}">
                    <span class="game-result">${resultText}</span>
                    <span class="game-details">
                        ${game.playerCard} vs ${game.opponentCard} 
                        (${game.actionSequence || 'N/A'})
                    </span>
                    <span class="game-date">${date}</span>
                </div>
            `;
        });

        historyContainer.innerHTML = html || '<p>ゲーム履歴がありません</p>';
    }

    /**
     * 統計イベントリスナーの設定
     */
    setupStatsEventListeners() {
        // データエクスポート
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // データクリア
        const clearBtn = document.getElementById('clear-data-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearData());
        }

        // 統計リフレッシュ
        const refreshBtn = document.getElementById('refresh-stats-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadStats());
        }
    }

    /**
     * データのエクスポート
     */
    exportData() {
        try {
            const data = this.dataManager.exportData();
            if (data) {
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kuhn-poker-stats-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.uiManager.showMessage('データをエクスポートしました', 'success');
            }
        } catch (error) {
            console.error('データエクスポートエラー:', error);
            this.uiManager.showMessage('エクスポートに失敗しました', 'error');
        }
    }

    /**
     * データのクリア
     */
    clearData() {
        if (confirm('すべての統計データを削除しますか？この操作は元に戻せません。')) {
            const result = this.dataManager.clearLocalData();
            if (result.success) {
                this.currentStats = this.getLocalStats();
                this.recentGames = [];
                this.performanceMetrics = {};
                this.updateStatsDisplay();
                this.uiManager.showMessage('データをクリアしました', 'success');
            } else {
                this.uiManager.showMessage('データクリアに失敗しました', 'error');
            }
        }
    }

    /**
     * 新しいゲーム結果の追加
     */
    addGameResult(gameResult) {
        // 最新のゲームを履歴の先頭に追加
        this.recentGames.unshift({
            ...gameResult,
            timestamp: new Date().toISOString()
        });

        // 履歴のサイズ制限
        if (this.recentGames.length > 100) {
            this.recentGames = this.recentGames.slice(0, 100);
        }

        // 統計を再計算
        this.currentStats = this.getLocalStats();
        this.calculatePerformanceMetrics();
        
        // 表示を更新
        this.updateStatsDisplay();
    }

    /**
     * 統計サマリーの取得
     */
    getStatsSummary() {
        return {
            basic: this.currentStats,
            performance: this.performanceMetrics,
            recentGamesCount: this.recentGames.length
        };
    }
}
