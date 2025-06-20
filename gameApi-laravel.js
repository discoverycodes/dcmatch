// API configuration for Laravel integration
const API_BASE = window.Laravel?.appUrl || window.location.origin;

export async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': window.Laravel?.csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...options.headers,
        },
        credentials: 'same-origin',
        ...options,
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Request failed';
        
        try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
            errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
}

export interface GameSession {
  id: string;
  betAmount: number;
  status: 'active' | 'completed';
  result?: 'won' | 'lost';
  winAmount?: number;
  createdAt: string;
}

export async function createGameSession(betAmount) {
    const data = await apiRequest('/api/game/memory/start', {
        method: 'POST',
        body: JSON.stringify({ betAmount }),
    });
    return data.sessionId;
}

export async function updateGameResult(sessionId, won, matchedPairs) {
    return apiRequest(`/api/game/memory/result/${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ won, matchedPairs }),
    });
}

export async function getGameHistory() {
    return apiRequest('/api/game/memory/history');
}

export async function getUserBalance() {
    const data = await apiRequest('/api/user/balance');
    return parseFloat(data.balance);
}