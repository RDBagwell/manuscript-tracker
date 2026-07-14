<?php

namespace App\Models;

use App\Enums\QueryEventType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QueryEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'query_id',
        'type',
        'happened_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'type' => QueryEventType::class,
            'happened_at' => 'datetime',
        ];
    }

    /**
     * Named queryThread rather than query: Model::query() is static in the
     * Eloquent base class, and PHP fatals if a subclass redeclares it as an
     * instance method. Explicit FK because the name no longer implies it.
     */
    public function queryThread(): BelongsTo
    {
        return $this->belongsTo(Query::class, 'query_id');
    }
}
