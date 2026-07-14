<?php

namespace App\Models;

use App\Enums\QueryStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Agency extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'website',
        'one_no_means_all_no',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'one_no_means_all_no' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function agents(): HasMany
    {
        return $this->hasMany(Agent::class);
    }

    /**
     * True when this agency has a "one no means all no" policy AND any of
     * its agents has already rejected this manuscript. Powers the warning
     * when queueing a colleague of someone who passed.
     *
     * Deliberately counts explicit rejections only — a closed-no-response
     * is ambiguous enough that blocking a colleague on it would be wrong.
     */
    public function hasClosedDoorFor(Manuscript $manuscript): bool
    {
        if (! $this->one_no_means_all_no) {
            return false;
        }

        return Query::where('manuscript_id', $manuscript->id)
            ->whereIn('agent_id', $this->agents()->select('id'))
            ->where('status', QueryStatus::Rejected)
            ->exists();
    }
}
