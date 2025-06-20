<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return redirect()->route('login');
        }

        if (!auth()->user()->isAdmin()) {
            abort(403, 'Acesso negado. Apenas administradores podem acessar esta área.');
        }

        // Log admin access
        \App\Models\SecurityLog::logEvent('admin_access', auth()->id(), [
            'route' => $request->route()->getName(),
            'url' => $request->fullUrl(),
            'method' => $request->method()
        ]);

        return $next($request);
    }
}

class SecurityMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();
        $ip = $request->ip();
        
        // Check for suspicious activity
        $riskScore = $this->calculateRiskScore($request, $user);
        
        if ($riskScore >= 80) {
            \App\Models\SecurityLog::logEvent('high_risk_access', $user?->id, [
                'risk_score' => $riskScore,
                'reasons' => $this->getRiskReasons($request, $user)
            ], $riskScore);
            
            // Block high-risk requests
            abort(429, 'Acesso temporariamente bloqueado por motivos de segurança.');
        }
        
        if ($riskScore >= 50) {
            \App\Models\SecurityLog::logEvent('medium_risk_access', $user?->id, [
                'risk_score' => $riskScore
            ], $riskScore);
        }

        return $next($request);
    }

    private function calculateRiskScore(Request $request, $user = null): int
    {
        $score = 0;
        
        // Check IP reputation
        if ($this->isHighRiskIP($request->ip())) {
            $score += 30;
        }
        
        // Check for rapid requests
        if ($this->hasRapidRequests($request, $user)) {
            $score += 25;
        }
        
        // Check unusual patterns
        if ($this->hasUnusualUserAgent($request)) {
            $score += 15;
        }
        
        // Check for multiple failed attempts
        if ($this->hasMultipleFailedAttempts($request, $user)) {
            $score += 20;
        }
        
        // Check for unusual time access
        if ($this->isUnusualTimeAccess()) {
            $score += 10;
        }
        
        return $score;
    }

    private function isHighRiskIP(string $ip): bool
    {
        // Implement IP reputation check
        // This could integrate with external services like AbuseIPDB
        $knownBadIPs = cache()->get("bad_ips", []);
        return in_array($ip, $knownBadIPs);
    }

    private function hasRapidRequests(Request $request, $user = null): bool
    {
        $key = 'requests_' . ($user ? $user->id : $request->ip());
        $requests = cache()->get($key, 0);
        
        cache()->put($key, $requests + 1, 60); // 1 minute window
        
        return $requests > 100; // More than 100 requests per minute
    }

    private function hasUnusualUserAgent(Request $request): bool
    {
        $userAgent = $request->userAgent();
        
        // Check for bot patterns
        $botPatterns = ['bot', 'crawler', 'spider', 'scraper'];
        foreach ($botPatterns as $pattern) {
            if (stripos($userAgent, $pattern) !== false) {
                return true;
            }
        }
        
        return false;
    }

    private function hasMultipleFailedAttempts(Request $request, $user = null): bool
    {
        $key = 'failed_attempts_' . ($user ? $user->id : $request->ip());
        $attempts = cache()->get($key, 0);
        
        return $attempts >= 5; // 5 or more failed attempts
    }

    private function isUnusualTimeAccess(): bool
    {
        $hour = now()->hour;
        // Flagging access between 2 AM and 6 AM as unusual
        return $hour >= 2 && $hour <= 6;
    }

    private function getRiskReasons(Request $request, $user = null): array
    {
        $reasons = [];
        
        if ($this->isHighRiskIP($request->ip())) {
            $reasons[] = 'High risk IP address';
        }
        
        if ($this->hasRapidRequests($request, $user)) {
            $reasons[] = 'Rapid successive requests';
        }
        
        if ($this->hasUnusualUserAgent($request)) {
            $reasons[] = 'Unusual user agent';
        }
        
        if ($this->hasMultipleFailedAttempts($request, $user)) {
            $reasons[] = 'Multiple failed attempts';
        }
        
        if ($this->isUnusualTimeAccess()) {
            $reasons[] = 'Access during unusual hours';
        }
        
        return $reasons;
    }
}

class RateLimitMiddleware
{
    public function handle(Request $request, Closure $next, int $maxAttempts = 60, int $decayMinutes = 1): Response
    {
        $key = $this->resolveRequestSignature($request);
        
        if ($this->tooManyAttempts($key, $maxAttempts, $decayMinutes)) {
            return $this->buildException($key, $maxAttempts, $decayMinutes);
        }
        
        $this->hit($key, $decayMinutes);
        
        $response = $next($request);
        
        return $this->addHeaders($response, $maxAttempts, $this->calculateRemainingAttempts($key, $maxAttempts));
    }

    protected function resolveRequestSignature(Request $request): string
    {
        if ($user = $request->user()) {
            return sha1($user->getAuthIdentifier() . '|' . $request->ip());
        }
        
        return sha1($request->ip());
    }

    protected function tooManyAttempts(string $key, int $maxAttempts, int $decayMinutes): bool
    {
        return cache()->get($key, 0) >= $maxAttempts;
    }

    protected function hit(string $key, int $decayMinutes): int
    {
        $value = cache()->get($key, 0) + 1;
        cache()->put($key, $value, $decayMinutes * 60);
        return $value;
    }

    protected function calculateRemainingAttempts(string $key, int $maxAttempts): int
    {
        return max(0, $maxAttempts - cache()->get($key, 0));
    }

    protected function buildException(string $key, int $maxAttempts, int $decayMinutes): Response
    {
        $retryAfter = cache()->get($key . ':timer', $decayMinutes * 60);
        
        return response()->json([
            'message' => 'Too many requests.',
            'retry_after' => $retryAfter
        ], 429)->withHeaders([
            'Retry-After' => $retryAfter,
            'X-RateLimit-Limit' => $maxAttempts,
            'X-RateLimit-Remaining' => 0,
        ]);
    }

    protected function addHeaders(Response $response, int $maxAttempts, int $remainingAttempts): Response
    {
        return $response->withHeaders([
            'X-RateLimit-Limit' => $maxAttempts,
            'X-RateLimit-Remaining' => $remainingAttempts,
        ]);
    }
}

class TwoFactorMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();
        
        if (!$user) {
            return redirect()->route('login');
        }

        // Check if user has 2FA enabled
        if ($user->two_factor_enabled && !session('2fa_verified')) {
            // Redirect to 2FA verification page
            return redirect()->route('auth.2fa.verify');
        }

        return $next($request);
    }
}

class MaintenanceMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $maintenanceMode = \App\Models\SystemSetting::get('maintenance_mode', false);
        
        if ($maintenanceMode && !auth()->user()?->isAdmin()) {
            return response()->view('maintenance', [], 503);
        }

        return $next($request);
    }
}

class AuditMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();
        
        // Log sensitive actions
        if ($this->shouldLog($request)) {
            \App\Models\AdminLog::logAction(
                $this->getActionName($request),
                null,
                [],
                $request->except(['password', 'password_confirmation', '_token'])
            );
        }

        $response = $next($request);

        // Log response if needed
        if ($this->shouldLogResponse($request, $response)) {
            \App\Models\AdminLog::logAction(
                $this->getActionName($request) . '_response',
                null,
                [],
                ['status' => $response->getStatusCode()]
            );
        }

        return $response;
    }

    private function shouldLog(Request $request): bool
    {
        $sensitiveRoutes = [
            'admin.users.suspend',
            'admin.users.ban',
            'admin.transactions.approve',
            'admin.transactions.reject',
            'admin.settings.update'
        ];

        return in_array($request->route()?->getName(), $sensitiveRoutes);
    }

    private function shouldLogResponse(Request $request, Response $response): bool
    {
        return $response->getStatusCode() >= 400;
    }

    private function getActionName(Request $request): string
    {
        return $request->route()?->getName() ?? $request->method() . '_' . $request->path();
    }
}