<?php

namespace App\Models;

use App\Enums\ManuscriptCategory;
use App\Enums\ManuscriptStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Manuscript extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'genre',
        'category',
        'word_count',
        'status',
        'pitch',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'category' => ManuscriptCategory::class,
            'status' => ManuscriptStatus::class,
            'word_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function queries(): HasMany
    {
        return $this->hasMany(Query::class);
    }

    public function templates(): HasMany
    {
        return $this->hasMany(Template::class);
    }

    public function reminders(): MorphMany
    {
        return $this->morphMany(Reminder::class, 'remindable');
    }

    /**
     * Queries still in play — not rejected, closed, or withdrawn.
     */
    public function openQueries(): HasMany
    {
        return $this->queries()->whereNull('closed_at');
    }
}
