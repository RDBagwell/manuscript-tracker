<?php

namespace App\Models;

use App\Models\Agent;
use App\Models\Manuscript;
use App\Models\Query;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Reminder extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'remindable_type',
        'remindable_id',
        'due_at',
        'reason',
        'completed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function remindable(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('completed_at');
    }

    public function scopeDue(Builder $query): Builder
    {
        return $query->pending()->where('due_at', '<=', now());
    }

    public function complete(): void
    {
        $this->update(['completed_at' => now()]);
    }

    /**
     * Human label for whatever this reminder points at.
     * A query reads as "Manuscript → Agent" — the thread, not the row.
     */
    public function targetLabel(): string
    {
        $target = $this->remindable;

        return match (true) {
            $target instanceof Query => sprintf(
                '%s → %s',
                $target->manuscript?->title ?? 'Manuscript',
                $target->agent?->name ?? 'Agent',
            ),
            $target instanceof Manuscript => $target->title,
            $target instanceof Agent => $target->name,
            default => '—',
        };
    }

    public function isDue(): bool
    {
        return $this->completed_at === null
            && $this->due_at->lte(now()->endOfDay());
    }
}
