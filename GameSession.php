<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GameSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'bet_amount',
        'status',
        'result',
        'win_amount',
        'matched_pairs',
        'completed_at',
    ];

    protected $casts = [
        'bet_amount' => 'decimal:2',
        'win_amount' => 'decimal:2',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeWins($query)
    {
        return $query->where('result', 'won');
    }

    public function scopeLosses($query)
    {
        return $query->where('result', 'lost');
    }
}