<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\GameSession;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'admin']);
    }

    public function index()
    {
        $stats = $this->getDashboardStats();
        $recentTransactions = $this->getRecentTransactions();
        $gameStats = $this->getGameStats();
        $userGrowth = $this->getUserGrowthData();
        
        return view('admin.dashboard', compact('stats', 'recentTransactions', 'gameStats', 'userGrowth'));
    }

    private function getDashboardStats()
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();

        return [
            'total_users' => User::count(),
            'new_users_today' => User::whereDate('created_at', $today)->count(),
            'new_users_yesterday' => User::whereDate('created_at', $yesterday)->count(),
            
            'total_games' => GameSession::count(),
            'games_today' => GameSession::whereDate('created_at', $today)->count(),
            'games_yesterday' => GameSession::whereDate('created_at', $yesterday)->count(),
            
            'total_revenue' => Transaction::where('type', 'deposit')->sum('amount'),
            'revenue_today' => Transaction::where('type', 'deposit')->whereDate('created_at', $today)->sum('amount'),
            'revenue_yesterday' => Transaction::where('type', 'deposit')->whereDate('created_at', $yesterday)->sum('amount'),
            
            'total_payouts' => Transaction::where('type', 'payout')->sum('amount'),
            'payouts_today' => Transaction::where('type', 'payout')->whereDate('created_at', $today)->sum('amount'),
            
            'pending_withdrawals' => Transaction::where('type', 'withdrawal')->where('status', 'pending')->count(),
            'pending_withdrawals_amount' => Transaction::where('type', 'withdrawal')->where('status', 'pending')->sum('amount'),
            
            'house_edge' => $this->calculateHouseEdge(),
            'active_users_24h' => User::where('last_activity', '>=', Carbon::now()->subDay())->count(),
        ];
    }

    private function getRecentTransactions()
    {
        return Transaction::with('user')
            ->latest()
            ->take(10)
            ->get();
    }

    private function getGameStats()
    {
        return [
            'total_games' => GameSession::count(),
            'won_games' => GameSession::where('result', 'won')->count(),
            'lost_games' => GameSession::where('result', 'lost')->count(),
            'average_bet' => GameSession::avg('bet_amount'),
            'biggest_win' => GameSession::where('result', 'won')->max('win_amount'),
            'games_by_hour' => $this->getGamesByHour(),
        ];
    }

    private function getUserGrowthData()
    {
        return User::selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();
    }

    private function getGamesByHour()
    {
        return GameSession::selectRaw('HOUR(created_at) as hour, COUNT(*) as count')
            ->whereDate('created_at', Carbon::today())
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();
    }

    private function calculateHouseEdge()
    {
        $totalBets = GameSession::sum('bet_amount');
        $totalPayouts = GameSession::where('result', 'won')->sum('win_amount');
        
        if ($totalBets == 0) return 0;
        
        return (($totalBets - $totalPayouts) / $totalBets) * 100;
    }

    // Gerenciamento de Usuários
    public function users(Request $request)
    {
        $query = User::with(['gameSessions', 'transactions']);
        
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'LIKE', "%{$request->search}%")
                  ->orWhere('email', 'LIKE', "%{$request->search}%")
                  ->orWhere('id', $request->search);
            });
        }
        
        if ($request->status) {
            $query->where('status', $request->status);
        }
        
        $users = $query->paginate(25);
        
        return view('admin.users.index', compact('users'));
    }

    public function userDetails($id)
    {
        $user = User::with(['gameSessions', 'transactions'])->findOrFail($id);
        $userStats = $this->getUserStats($user);
        
        return view('admin.users.show', compact('user', 'userStats'));
    }

    private function getUserStats($user)
    {
        return [
            'total_games' => $user->gameSessions->count(),
            'won_games' => $user->gameSessions->where('result', 'won')->count(),
            'total_bet' => $user->gameSessions->sum('bet_amount'),
            'total_won' => $user->gameSessions->where('result', 'won')->sum('win_amount'),
            'total_deposits' => $user->transactions->where('type', 'deposit')->sum('amount'),
            'total_withdrawals' => $user->transactions->where('type', 'withdrawal')->sum('amount'),
            'profit_loss' => $user->transactions->where('type', 'deposit')->sum('amount') - 
                            $user->transactions->where('type', 'withdrawal')->sum('amount'),
        ];
    }

    // Gerenciamento de Transações
    public function transactions(Request $request)
    {
        $query = Transaction::with('user');
        
        if ($request->type) {
            $query->where('type', $request->type);
        }
        
        if ($request->status) {
            $query->where('status', $request->status);
        }
        
        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        
        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        
        $transactions = $query->latest()->paginate(25);
        
        return view('admin.transactions.index', compact('transactions'));
    }

    public function approveWithdrawal($id)
    {
        $transaction = Transaction::findOrFail($id);
        
        if ($transaction->type !== 'withdrawal' || $transaction->status !== 'pending') {
            return back()->with('error', 'Transação inválida');
        }
        
        // Processar saque aqui (integração com APIs de pagamento)
        $transaction->update([
            'status' => 'completed',
            'processed_at' => now(),
            'processed_by' => auth()->id()
        ]);
        
        return back()->with('success', 'Saque aprovado com sucesso');
    }

    public function rejectWithdrawal(Request $request, $id)
    {
        $transaction = Transaction::findOrFail($id);
        
        if ($transaction->type !== 'withdrawal' || $transaction->status !== 'pending') {
            return back()->with('error', 'Transação inválida');
        }
        
        // Devolver saldo ao usuário
        $user = $transaction->user;
        $user->increment('balance', $transaction->amount);
        
        $transaction->update([
            'status' => 'rejected',
            'rejection_reason' => $request->reason,
            'processed_at' => now(),
            'processed_by' => auth()->id()
        ]);
        
        return back()->with('success', 'Saque rejeitado e saldo devolvido');
    }

    // Configurações do Sistema
    public function settings()
    {
        $settings = [
            'min_bet' => setting('min_bet', 1),
            'max_bet' => setting('max_bet', 1000),
            'win_multiplier' => setting('win_multiplier', 2),
            'game_time_limit' => setting('game_time_limit', 60),
            'game_move_limit' => setting('game_move_limit', 100),
            'min_withdrawal' => setting('min_withdrawal', 10),
            'max_withdrawal' => setting('max_withdrawal', 10000),
            'house_edge_target' => setting('house_edge_target', 5),
        ];
        
        return view('admin.settings', compact('settings'));
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'min_bet' => 'required|numeric|min:0.01',
            'max_bet' => 'required|numeric|min:1',
            'win_multiplier' => 'required|numeric|min:1.1',
            'game_time_limit' => 'required|integer|min:10',
            'game_move_limit' => 'required|integer|min:10',
            'min_withdrawal' => 'required|numeric|min:1',
            'max_withdrawal' => 'required|numeric|min:10',
            'house_edge_target' => 'required|numeric|min:0|max:50',
        ]);
        
        foreach ($validated as $key => $value) {
            setting([$key => $value]);
        }
        
        return back()->with('success', 'Configurações atualizadas com sucesso');
    }

    // Relatórios
    public function reports()
    {
        $dailyStats = $this->getDailyStats();
        $monthlyStats = $this->getMonthlyStats();
        
        return view('admin.reports', compact('dailyStats', 'monthlyStats'));
    }

    private function getDailyStats()
    {
        return GameSession::selectRaw('
            DATE(created_at) as date,
            COUNT(*) as total_games,
            SUM(bet_amount) as total_bets,
            SUM(CASE WHEN result = "won" THEN win_amount ELSE 0 END) as total_payouts,
            COUNT(CASE WHEN result = "won" THEN 1 END) as won_games
        ')
        ->where('created_at', '>=', Carbon::now()->subDays(30))
        ->groupBy('date')
        ->orderBy('date', 'desc')
        ->get();
    }

    private function getMonthlyStats()
    {
        return GameSession::selectRaw('
            YEAR(created_at) as year,
            MONTH(created_at) as month,
            COUNT(*) as total_games,
            SUM(bet_amount) as total_bets,
            SUM(CASE WHEN result = "won" THEN win_amount ELSE 0 END) as total_payouts
        ')
        ->where('created_at', '>=', Carbon::now()->subMonths(12))
        ->groupBy('year', 'month')
        ->orderBy('year', 'desc')
        ->orderBy('month', 'desc')
        ->get();
    }
}