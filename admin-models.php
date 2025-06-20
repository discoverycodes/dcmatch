<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'currency',
        'status',
        'payment_method',
        'payment_id',
        'wallet_address',
        'pix_key',
        'rejection_reason',
        'processed_at',
        'processed_by',
        'metadata'
    ];

    protected $casts = [
        'metadata' => 'array',
        'processed_at' => 'datetime',
        'amount' => 'decimal:8'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function scopeDeposits($query)
    {
        return $query->where('type', 'deposit');
    }

    public function scopeWithdrawals($query)
    {
        return $query->where('type', 'withdrawal');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function getStatusBadgeAttribute()
    {
        $badges = [
            'pending' => 'bg-yellow-100 text-yellow-800',
            'completed' => 'bg-green-100 text-green-800',
            'failed' => 'bg-red-100 text-red-800',
            'cancelled' => 'bg-gray-100 text-gray-800',
            'rejected' => 'bg-red-100 text-red-800'
        ];

        return $badges[$this->status] ?? 'bg-gray-100 text-gray-800';
    }

    public function getTypeBadgeAttribute()
    {
        $badges = [
            'deposit' => 'bg-blue-100 text-blue-800',
            'withdrawal' => 'bg-purple-100 text-purple-800',
            'payout' => 'bg-green-100 text-green-800',
            'refund' => 'bg-orange-100 text-orange-800'
        ];

        return $badges[$this->type] ?? 'bg-gray-100 text-gray-800';
    }
}

class AdminLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'admin_id',
        'action',
        'target_type',
        'target_id',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent'
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array'
    ];

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function target()
    {
        return $this->morphTo();
    }

    public static function logAction($action, $target = null, $oldValues = [], $newValues = [])
    {
        self::create([
            'admin_id' => auth()->id(),
            'action' => $action,
            'target_type' => $target ? get_class($target) : null,
            'target_id' => $target ? $target->id : null,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
    }
}

class SystemSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'type',
        'description'
    ];

    protected $casts = [
        'value' => 'json'
    ];

    public static function get($key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function set($key, $value, $type = 'string', $description = null)
    {
        return self::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'type' => $type,
                'description' => $description
            ]
        );
    }
}

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type', // 'crypto', 'pix', 'bank'
        'provider', // 'plisio', 'primepag'
        'currency',
        'is_active',
        'min_amount',
        'max_amount',
        'fee_percentage',
        'fee_fixed',
        'config'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'config' => 'array',
        'min_amount' => 'decimal:8',
        'max_amount' => 'decimal:8',
        'fee_percentage' => 'decimal:4',
        'fee_fixed' => 'decimal:8'
    ];

    public function calculateFee($amount)
    {
        $percentageFee = ($amount * $this->fee_percentage) / 100;
        return $percentageFee + $this->fee_fixed;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCrypto($query)
    {
        return $query->where('type', 'crypto');
    }

    public function scopePix($query)
    {
        return $query->where('type', 'pix');
    }
}

class SecurityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'event_type',
        'ip_address',
        'user_agent',
        'country',
        'details',
        'risk_score'
    ];

    protected $casts = [
        'details' => 'array',
        'risk_score' => 'integer'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function logEvent($eventType, $userId = null, $details = [], $riskScore = 0)
    {
        self::create([
            'user_id' => $userId ?: auth()->id(),
            'event_type' => $eventType,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'country' => self::getCountryFromIp(request()->ip()),
            'details' => $details,
            'risk_score' => $riskScore
        ]);
    }

    private static function getCountryFromIp($ip)
    {
        // Implementar integração com serviço de geolocalização
        return 'BR';
    }

    public function getRiskLevelAttribute()
    {
        if ($this->risk_score >= 80) return 'high';
        if ($this->risk_score >= 50) return 'medium';
        return 'low';
    }
}

// Extend User model with admin methods
class User extends \Illuminate\Foundation\Auth\User
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'password',
        'balance',
        'status',
        'is_admin',
        'kyc_status',
        'kyc_documents',
        'last_activity',
        'two_factor_secret',
        'two_factor_enabled'
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret'
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'balance' => 'decimal:8',
        'is_admin' => 'boolean',
        'kyc_documents' => 'array',
        'last_activity' => 'datetime',
        'two_factor_enabled' => 'boolean'
    ];

    public function gameSessions()
    {
        return $this->hasMany(GameSession::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function adminLogs()
    {
        return $this->hasMany(AdminLog::class, 'admin_id');
    }

    public function securityLogs()
    {
        return $this->hasMany(SecurityLog::class);
    }

    public function isAdmin()
    {
        return $this->is_admin;
    }

    public function getStatusBadgeAttribute()
    {
        $badges = [
            'active' => 'bg-green-100 text-green-800',
            'suspended' => 'bg-red-100 text-red-800',
            'inactive' => 'bg-gray-100 text-gray-800',
            'banned' => 'bg-red-100 text-red-800'
        ];

        return $badges[$this->status] ?? 'bg-gray-100 text-gray-800';
    }

    public function getKycStatusBadgeAttribute()
    {
        $badges = [
            'pending' => 'bg-yellow-100 text-yellow-800',
            'approved' => 'bg-green-100 text-green-800',
            'rejected' => 'bg-red-100 text-red-800',
            'not_submitted' => 'bg-gray-100 text-gray-800'
        ];

        return $badges[$this->kyc_status] ?? 'bg-gray-100 text-gray-800';
    }

    public function updateLastActivity()
    {
        $this->update(['last_activity' => now()]);
    }

    public function getTotalProfitLossAttribute()
    {
        $deposits = $this->transactions()->where('type', 'deposit')->where('status', 'completed')->sum('amount');
        $withdrawals = $this->transactions()->where('type', 'withdrawal')->where('status', 'completed')->sum('amount');
        $payouts = $this->transactions()->where('type', 'payout')->sum('amount');
        
        return $deposits - $withdrawals - $payouts;
    }

    public function getWinRateAttribute()
    {
        $totalGames = $this->gameSessions()->count();
        if ($totalGames == 0) return 0;
        
        $wonGames = $this->gameSessions()->where('result', 'won')->count();
        return ($wonGames / $totalGames) * 100;
    }
}