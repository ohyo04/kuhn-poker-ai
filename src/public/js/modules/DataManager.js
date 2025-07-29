/**
 * データ管理モジュール - API通信とデータ永続化を担当
 */

export class DataManager {
    constructor() {
        this.baseURL = '/api';
        this.isOnline = true;
        this.initializeOfflineMode();
    }

    /**
     * オフラインモード対応の初期化
     */
    initializeOfflineMode() {
        // オフライン検出
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.isOnline = true;
                console.log('オンラインモードに切り替わりました');
            });
            
            window.addEventListener('offline', () => {
                this.isOnline = false;
                console.log('オフラインモードに切り替わりました');
            });
        }
    }

    /**
     * ゲーム記録を保存
     */
    async saveGameResult(gameData) {
        try {
            if (this.isOnline) {
                const response = await fetch(`${this.baseURL}/games`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gameData)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.json();
            } else {
                // オフライン時はローカルストレージに保存
                return this.saveGameResultOffline(gameData);
            }
        } catch (error) {
            console.error('ゲーム結果の保存に失敗:', error);
            // フォールバックとしてローカル保存
            return this.saveGameResultOffline(gameData);
        }
    }

    /**
     * オフライン時のゲーム結果保存
     */
    saveGameResultOffline(gameData) {
        try {
            const games = this.getLocalGames();
            const gameWithId = {
                ...gameData,
                id: Date.now(),
                timestamp: new Date().toISOString(),
                offline: true
            };
            
            games.push(gameWithId);
            localStorage.setItem('kuhn_poker_games', JSON.stringify(games));
            
            return { success: true, id: gameWithId.id };
        } catch (error) {
            console.error('ローカル保存に失敗:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * ローカルゲーム記録を取得
     */
    getLocalGames() {
        try {
            const games = localStorage.getItem('kuhn_poker_games');
            return games ? JSON.parse(games) : [];
        } catch (error) {
            console.error('ローカルゲーム記録の取得に失敗:', error);
            return [];
        }
    }

    /**
     * 統計データを取得
     */
    async getStats() {
        try {
            if (this.isOnline) {
                const response = await fetch(`${this.baseURL}/stats`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } else {
                return this.getStatsOffline();
            }
        } catch (error) {
            console.error('統計データの取得に失敗:', error);
            return this.getStatsOffline();
        }
    }

    /**
     * オフライン時の統計データ計算
     */
    getStatsOffline() {
        const games = this.getLocalGames();
        
        if (games.length === 0) {
            return {
                totalGames: 0,
                playerWins: 0,
                aiWins: 0,
                winRate: 0
            };
        }

        const playerWins = games.filter(game => game.winner === 'player').length;
        const aiWins = games.filter(game => game.winner === 'ai').length;
        
        return {
            totalGames: games.length,
            playerWins,
            aiWins,
            winRate: Math.round((playerWins / games.length) * 100)
        };
    }

    /**
     * AI vs AI シミュレーション結果を保存
     */
    async saveSimulationResult(simulationData) {
        try {
            if (this.isOnline) {
                const response = await fetch(`${this.baseURL}/simulations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(simulationData)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.json();
            } else {
                return this.saveSimulationResultOffline(simulationData);
            }
        } catch (error) {
            console.error('シミュレーション結果の保存に失敗:', error);
            return this.saveSimulationResultOffline(simulationData);
        }
    }

    /**
     * オフライン時のシミュレーション結果保存
     */
    saveSimulationResultOffline(simulationData) {
        try {
            const simulations = this.getLocalSimulations();
            const simulationWithId = {
                ...simulationData,
                id: Date.now(),
                timestamp: new Date().toISOString(),
                offline: true
            };
            
            simulations.push(simulationWithId);
            localStorage.setItem('kuhn_poker_simulations', JSON.stringify(simulations));
            
            return { success: true, id: simulationWithId.id };
        } catch (error) {
            console.error('ローカルシミュレーション保存に失敗:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * ローカルシミュレーション記録を取得
     */
    getLocalSimulations() {
        try {
            const simulations = localStorage.getItem('kuhn_poker_simulations');
            return simulations ? JSON.parse(simulations) : [];
        } catch (error) {
            console.error('ローカルシミュレーション記録の取得に失敗:', error);
            return [];
        }
    }

    /**
     * シミュレーション統計を取得
     */
    async getSimulationStats() {
        try {
            if (this.isOnline) {
                const response = await fetch(`${this.baseURL}/simulation-stats`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } else {
                return this.getSimulationStatsOffline();
            }
        } catch (error) {
            console.error('シミュレーション統計の取得に失敗:', error);
            return this.getSimulationStatsOffline();
        }
    }

    /**
     * オフライン時のシミュレーション統計計算
     */
    getSimulationStatsOffline() {
        const simulations = this.getLocalSimulations();
        
        if (simulations.length === 0) {
            return { simulations: [] };
        }

        return {
            simulations: simulations.map(sim => ({
                id: sim.id,
                ai1_name: sim.ai1_name,
                ai2_name: sim.ai2_name,
                ai1_wins: sim.ai1_wins,
                ai2_wins: sim.ai2_wins,
                total_games: sim.total_games,
                timestamp: sim.timestamp
            }))
        };
    }

    /**
     * 全てのローカルデータをクリア
     */
    clearLocalData() {
        try {
            localStorage.removeItem('kuhn_poker_games');
            localStorage.removeItem('kuhn_poker_simulations');
            return { success: true };
        } catch (error) {
            console.error('ローカルデータのクリアに失敗:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * データのエクスポート
     */
    exportData() {
        try {
            const games = this.getLocalGames();
            const simulations = this.getLocalSimulations();
            
            const data = {
                games,
                simulations,
                exportDate: new Date().toISOString()
            };
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('データエクスポートに失敗:', error);
            return null;
        }
    }

    /**
     * データのインポート
     */
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.games && Array.isArray(data.games)) {
                localStorage.setItem('kuhn_poker_games', JSON.stringify(data.games));
            }
            
            if (data.simulations && Array.isArray(data.simulations)) {
                localStorage.setItem('kuhn_poker_simulations', JSON.stringify(data.simulations));
            }
            
            return { success: true };
        } catch (error) {
            console.error('データインポートに失敗:', error);
            return { success: false, error: error.message };
        }
    }
}
