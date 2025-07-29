/**
 * ユーティリティ関数集
 */

/**
 * 配列をシャッフルする（Fisher-Yates アルゴリズム）
 */
export function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * 要素の表示/非表示を切り替える
 */
export function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

export function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

/**
 * 要素を有効/無効にする
 */
export function enableElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.disabled = false;
    }
}

export function disableElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.disabled = true;
    }
}

/**
 * 要素の内容を設定する
 */
export function setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

export function setElementHTML(elementId, html) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = html;
    }
}

/**
 * CSS クラスを操作する
 */
export function addClass(elementId, className) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add(className);
    }
}

export function removeClass(elementId, className) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove(className);
    }
}

/**
 * 数値の検証とフォーマット
 */
export function isValidProbability(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 1;
}

export function formatProbability(value) {
    return Math.round(parseFloat(value) * 100) / 100;
}

/**
 * 遅延実行
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * デバッグログ
 */
export function debugLog(message, data = null) {
    if (typeof window !== 'undefined' && window.debug) {
        console.log(`[KuhnPoker Debug] ${message}`, data);
    }
}

/**
 * エラーハンドリング
 */
export function handleError(error, context = '') {
    console.error(`[KuhnPoker Error] ${context}:`, error);
    if (typeof window !== 'undefined' && window.gameApp) {
        window.gameApp.eventManager.emit('error', { error, context });
    }
}

/**
 * プレイヤー用勝率計算
 */
export function calculateWinRate(wins, total) {
    return total > 0 ? Math.round((wins / total) * 100) : 0;
}

/**
 * ローカルストレージ操作
 */
export function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Storage save error:', error);
        return false;
    }
}

export function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Storage load error:', error);
        return defaultValue;
    }
}

/**
 * ランダムな配列要素の選択
 */
export function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * オブジェクトのディープコピー
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * カードの日本語表示
 */
export function getCardDisplayName(card) {
    const cardNames = { 'A': 'エース', 'K': 'キング', 'Q': 'クイーン' };
    return cardNames[card] || card;
}

/**
 * ゲーム履歴のフォーマット
 */
export function formatGameHistory(history) {
    return history.map(action => {
        return `${action.player}: ${action.action} (${action.card})`;
    }).join(' → ');
}
