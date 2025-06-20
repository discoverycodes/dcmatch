<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GameSession;
use Illuminate\Support\Facades\Auth;

class GameController extends Controller
{
    public function index()
    {
        return view('game');
    }
    
    public function getUserBalance()
    {
        $user = Auth::user();
        return response()->json(['balance' => number_format($user->balance, 2, '.', '')]);
    }
    
    public function startGame(Request $request)
    {
        $request->validate([
            'betAmount' => 'required|numeric|min:0.01'
        ]);
        
        $user = Auth::user();
        
        if ($user->balance < $request->betAmount) {
            return response()->json(['error' => 'Saldo insuficiente'], 400);
        }
        
        $session = GameSession::create([
            'user_id' => $user->id,
            'bet_amount' => $request->betAmount,
            'status' => 'active',
        ]);
        
        // Deduz o valor da aposta do saldo
        $user->decrement('balance', $request->betAmount);
        
        return response()->json(['sessionId' => $session->id]);
    }
    
    public function updateResult(Request $request, $sessionId)
    {
        $request->validate([
            'won' => 'required|boolean',
            'matchedPairs' => 'required|integer|min:0|max:8'
        ]);
        
        $session = GameSession::findOrFail($sessionId);
        
        if ($session->status !== 'active') {
            return response()->json(['error' => 'Game session already completed'], 400);
        }
        
        if ($session->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        $winAmount = 0;
        if ($request->won && $request->matchedPairs === 8) {
            $winAmount = $session->bet_amount * 2;
            $session->user->increment('balance', $winAmount);
        }
        
        $session->update([
            'status' => 'completed',
            'result' => $request->won ? 'won' : 'lost',
            'win_amount' => $winAmount,
            'matched_pairs' => $request->matchedPairs,
            'completed_at' => now(),
        ]);
        
        return response()->json([
            'success' => true,
            'winAmount' => $winAmount,
            'newBalance' => number_format($session->user->fresh()->balance, 2, '.', '')
        ]);
    }
    
    public function getGameHistory()
    {
        $sessions = GameSession::where('user_id', Auth::id())
            ->where('status', 'completed')
            ->orderBy('completed_at', 'desc')
            ->limit(10)
            ->get();
            
        return response()->json($sessions);
    }
}