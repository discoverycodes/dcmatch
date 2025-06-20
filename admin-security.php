<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SecurityLog;
use App\Models\AdminLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SecurityController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'admin']);
    }

    public function index()
    {
        $securityStats = $this->getSecurityStats();
        $recentThreats = $this->getRecentThreats();
        $blockedIPs = $this->getBlockedIPs();
        $riskAnalysis = $this->getRiskAnalysis();
        
        return view('admin.security.index', compact('securityStats', 'recentThreats', 'blockedIPs', 'riskAnalysis'));
    }

    private function getSecurityStats()
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $thisWeek = Carbon::now()->startOfWeek();
        
        return [
            'total_threats_today' => SecurityLog::whereDate('created_at', $today)
                ->where('risk_score', '>=', 50)->count(),
            'total_threats_yesterday' => SecurityLog::whereDate('created_at', $yesterday)
                ->where('risk_score', '>=', 50)->count(),
            'high_risk_events' => SecurityLog::where('risk_score', '>=', 80)
                ->whereDate('created_at', '>=', $thisWeek)->count(),
            'blocked_ips_count' => Cache::get('blocked_ips', collect())->count(),
            'failed_logins_today' => SecurityLog::whereDate('created_at', $today)
                ->where('event_type', 'failed_login')->count(),
            'suspicious_transactions' => $this->getSuspiciousTransactions(),
            'admin_actions_today' => AdminLog::whereDate('created_at', $today)->count(),
        ];
    }

    private function getRecentThreats()
    {
        return SecurityLog::with('user')
            ->where('risk_score', '>=', 50)
            ->latest()
            ->take(20)
            ->get();
    }

    private function getBlockedIPs()
    {
        $blockedIPs = Cache::get('blocked_ips', collect());
        return $blockedIPs->map(function ($data, $ip) {
            return [
                'ip' => $ip,
                'reason' => $data['reason'] ?? 'Unknown',
                'blocked_at' => $data['blocked_at'] ?? now(),
                'expires_at' => $data['expires_at'] ?? null,
                'country' => $this->getCountryFromIP($ip)
            ];
        });
    }

    private function getRiskAnalysis()
    {
        $riskEvents = SecurityLog::selectRaw('
            event_type,
            COUNT(*) as count,
            AVG(risk_score) as avg_risk_score,
            MAX(risk_score) as max_risk_score
        ')
        ->where('created_at', '>=', Carbon::now()->subDays(7))
        ->groupBy('event_type')
        ->orderByDesc('count')
        ->get();

        $ipAnalysis = SecurityLog::selectRaw('
            ip_address,
            COUNT(*) as events_count,
            AVG(risk_score) as avg_risk_score,
            MAX(created_at) as last_event
        ')
        ->where('created_at', '>=', Carbon::now()->subDays(7))
        ->where('risk_score', '>=', 30)
        ->groupBy('ip_address')
        ->orderByDesc('avg_risk_score')
        ->take(10)
        ->get();

        return [
            'risk_events' => $riskEvents,
            'ip_analysis' => $ipAnalysis
        ];
    }

    private function getSuspiciousTransactions()
    {
        return DB::table('transactions')
            ->where('created_at', '>=', Carbon::now()->subDay())
            ->where(function($query) {
                $query->where('amount', '>', 10000) // Large amounts
                      ->orWhere('status', 'failed');
            })
            ->count();
    }

    public function logs(Request $request)
    {
        $query = SecurityLog::with('user')->latest();
        
        if ($request->event_type) {
            $query->where('event_type', $request->event_type);
        }
        
        if ($request->risk_level) {
            switch ($request->risk_level) {
                case 'high':
                    $query->where('risk_score', '>=', 80);
                    break;
                case 'medium':
                    $query->whereBetween('risk_score', [50, 79]);
                    break;
                case 'low':
                    $query->where('risk_score', '<', 50);
                    break;
            }
        }
        
        if ($request->ip_address) {
            $query->where('ip_address', 'LIKE', "%{$request->ip_address}%");
        }
        
        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        
        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        
        $logs = $query->paginate(50);
        $eventTypes = SecurityLog::distinct()->pluck('event_type');
        
        return view('admin.security.logs', compact('logs', 'eventTypes'));
    }

    public function audit(Request $request)
    {
        $query = AdminLog::with(['admin', 'target'])->latest();
        
        if ($request->admin_id) {
            $query->where('admin_id', $request->admin_id);
        }
        
        if ($request->action) {
            $query->where('action', 'LIKE', "%{$request->action}%");
        }
        
        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        
        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        
        $auditLogs = $query->paginate(50);
        $admins = User::where('is_admin', true)->get();
        
        return view('admin.security.audit', compact('auditLogs', 'admins'));
    }

    public function blockIp(Request $request)
    {
        $request->validate([
            'ip_address' => 'required|ip',
            'reason' => 'required|string|max:255',
            'duration' => 'required|integer|min:1|max:8760' // Max 1 year
        ]);

        $blockedIPs = Cache::get('blocked_ips', collect());
        
        $blockedIPs[$request->ip_address] = [
            'reason' => $request->reason,
            'blocked_at' => now(),
            'expires_at' => now()->addHours($request->duration),
            'blocked_by' => auth()->id()
        ];
        
        Cache::forever('blocked_ips', $blockedIPs);
        
        // Log the action
        AdminLog::logAction('ip_blocked', null, [], [
            'ip_address' => $request->ip_address,
            'reason' => $request->reason,
            'duration' => $request->duration
        ]);
        
        // Add to security log
        SecurityLog::logEvent('ip_blocked', null, [
            'blocked_ip' => $request->ip_address,
            'reason' => $request->reason
        ], 100);
        
        return back()->with('success', "IP {$request->ip_address} foi bloqueado com sucesso.");
    }

    public function unblockIp(Request $request)
    {
        $request->validate([
            'ip_address' => 'required|ip'
        ]);

        $blockedIPs = Cache::get('blocked_ips', collect());
        
        if ($blockedIPs->has($request->ip_address)) {
            $blockedIPs = $blockedIPs->forget($request->ip_address);
            Cache::forever('blocked_ips', $blockedIPs);
            
            // Log the action
            AdminLog::logAction('ip_unblocked', null, [], [
                'ip_address' => $request->ip_address
            ]);
            
            return back()->with('success', "IP {$request->ip_address} foi desbloqueado com sucesso.");
        }
        
        return back()->with('error', 'IP não encontrado na lista de bloqueados.');
    }

    public function failedLogins(Request $request)
    {
        $query = SecurityLog::where('event_type', 'failed_login');
        
        if ($request->ip_address) {
            $query->where('ip_address', 'LIKE', "%{$request->ip_address}%");
        }
        
        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        
        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        
        $failedLogins = $query->latest()->paginate(50);
        
        // Get statistics
        $stats = [
            'total_today' => SecurityLog::where('event_type', 'failed_login')
                ->whereDate('created_at', Carbon::today())->count(),
            'unique_ips_today' => SecurityLog::where('event_type', 'failed_login')
                ->whereDate('created_at', Carbon::today())
                ->distinct('ip_address')->count(),
            'top_attacking_ips' => SecurityLog::where('event_type', 'failed_login')
                ->where('created_at', '>=', Carbon::now()->subDays(7))
                ->selectRaw('ip_address, COUNT(*) as attempts')
                ->groupBy('ip_address')
                ->orderByDesc('attempts')
                ->take(10)
                ->get()
        ];
        
        return view('admin.security.failed-logins', compact('failedLogins', 'stats'));
    }

    public function suspicious(Request $request)
    {
        // Get suspicious activities
        $suspiciousUsers = User::whereHas('securityLogs', function($query) {
            $query->where('created_at', '>=', Carbon::now()->subDays(7))
                  ->where('risk_score', '>=', 70);
        })->withCount(['securityLogs as high_risk_events' => function($query) {
            $query->where('created_at', '>=', Carbon::now()->subDays(7))
                  ->where('risk_score', '>=', 70);
        }])->orderByDesc('high_risk_events')->take(20)->get();

        $suspiciousTransactions = DB::table('transactions')
            ->join('users', 'transactions.user_id', '=', 'users.id')
            ->where('transactions.created_at', '>=', Carbon::now()->subDays(7))
            ->where(function($query) {
                $query->where('transactions.amount', '>', 5000) // Large amounts
                      ->orWhere('transactions.status', 'failed');
            })
            ->select([
                'transactions.*',
                'users.name as user_name',
                'users.email as user_email'
            ])
            ->orderByDesc('transactions.created_at')
            ->take(50)
            ->get();

        $patterns = $this->detectSuspiciousPatterns();
        
        return view('admin.security.suspicious', compact('suspiciousUsers', 'suspiciousTransactions', 'patterns'));
    }

    private function detectSuspiciousPatterns()
    {
        $patterns = [];
        
        // Pattern 1: Multiple accounts from same IP
        $multipleAccountsIP = DB::table('users')
            ->join('security_logs', 'users.id', '=', 'security_logs.user_id')
            ->selectRaw('security_logs.ip_address, COUNT(DISTINCT users.id) as user_count')
            ->where('security_logs.created_at', '>=', Carbon::now()->subDays(7))
            ->groupBy('security_logs.ip_address')
            ->having('user_count', '>', 3)
            ->orderByDesc('user_count')
            ->get();

        if ($multipleAccountsIP->count() > 0) {
            $patterns[] = [
                'type' => 'multiple_accounts_same_ip',
                'severity' => 'high',
                'description' => 'Múltiplas contas do mesmo IP',
                'data' => $multipleAccountsIP
            ];
        }
        
        // Pattern 2: Rapid successive transactions
        $rapidTransactions = DB::table('transactions')
            ->selectRaw('user_id, COUNT(*) as transaction_count')
            ->where('created_at', '>=', Carbon::now()->subHour())
            ->groupBy('user_id')
            ->having('transaction_count', '>', 10)
            ->get();

        if ($rapidTransactions->count() > 0) {
            $patterns[] = [
                'type' => 'rapid_transactions',
                'severity' => 'medium',
                'description' => 'Transações muito rápidas',
                'data' => $rapidTransactions
            ];
        }
        
        // Pattern 3: Unusual betting patterns
        $unusualBetting = DB::table('game_sessions')
            ->selectRaw('user_id, AVG(bet_amount) as avg_bet, COUNT(*) as games_count')
            ->where('created_at', '>=', Carbon::now()->subDay())
            ->groupBy('user_id')
            ->having('avg_bet', '>', 1000)
            ->having('games_count', '>', 20)
            ->get();

        if ($unusualBetting->count() > 0) {
            $patterns[] = [
                'type' => 'unusual_betting',
                'severity' => 'medium',
                'description' => 'Padrões de apostas incomuns',
                'data' => $unusualBetting
            ];
        }
        
        return $patterns;
    }

    private function getCountryFromIP($ip)
    {
        // Implement geolocation service integration
        // For now, return default
        return 'Unknown';
    }
}