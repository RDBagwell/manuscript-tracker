<?php

namespace App\Models;

use App\Enums\SubmissionMethod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Agent extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'agency_id',
        'name',
        'email',
        'title',
        'open_to_queries',
        'genres',
        'mswl',
        'submission_method',
        'guidelines',
        'response_window_days',
        'links',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'open_to_queries' => 'boolean',
            'genres' => 'array',
            'links' => 'array',
            'submission_method' => SubmissionMethod::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }

    public function queries(): HasMany
    {
        return $this->hasMany(Query::class);
    }

    public function reminders(): MorphMany
    {
        return $this->morphMany(Reminder::class, 'remindable');
    }
}
