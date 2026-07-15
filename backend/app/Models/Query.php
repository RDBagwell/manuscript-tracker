<?php

namespace App\Models;

use App\Enums\QueryEventType;
use App\Enums\QueryStatus;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Query extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'manuscript_id',
        'agent_id',
        'status',
        'personalization',
        'materials',
        'wave',
        'sent_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => QueryStatus::class,
            'wave' => 'integer',
            'sent_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function manuscript(): BelongsTo
    {
        return $this->belongsTo(Manuscript::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(QueryEvent::class)->orderBy('happened_at');
    }

    public function reminders(): MorphMany
    {
        return $this->morphMany(Reminder::class, 'remindable');
    }

    /**
     * The single write-path for query state. Appends an immutable event,
     * then refreshes the cached status / sent_at / closed_at.
     *
     * Events are the source of truth; the columns this touches are a cache.
     */
    public function recordEvent(
        QueryEventType $type,
        ?CarbonInterface $happenedAt = null,
        ?string $notes = null,
    ): QueryEvent {
        $event = $this->events()->create([
            'type' => $type,
            'happened_at' => $happenedAt ?? now(),
            'notes' => $notes,
        ]);

        if ($resulting = $type->resultingStatus()) {
            $this->status = $resulting;
        }

        if ($type === QueryEventType::Sent && $this->sent_at === null) {
            $this->sent_at = $event->happened_at;
        }

        // Keep closed_at in sync with terminal states — and clear it if a
        // later event reopens the thread (e.g. an R&R after a rejection).
        if ($this->status?->isClosed()) {
            $this->closed_at ??= $event->happened_at;
        } else {
            $this->closed_at = null;
        }

        $this->save();

        return $event;
    }

    /**
     * Days waiting: sent -> closed, or sent -> now for open threads.
     */
    public function daysOut(): ?int
    {
        if ($this->sent_at === null) {
            return null;
        }

        return (int) $this->sent_at->diffInDays($this->closed_at ?? now());
    }
}
