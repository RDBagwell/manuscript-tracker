<?php

namespace App\Http\Controllers;

use App\Enums\QueryEventType;
use App\Http\Requests\StoreQueryEventRequest;
use App\Http\Resources\QueryEventResource;
use App\Http\Resources\QueryResource;
use App\Models\Query;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class QueryEventController extends Controller
{
    /**
     * The single write-path into a query's lifecycle. Appends the event
     * and returns both it and the fully-refreshed thread so clients
     * never need a follow-up fetch to learn the new cached status.
     */
    public function store(StoreQueryEventRequest $request, Query $query): JsonResponse
    {
        $this->authorize('update', $query);

        $validated = $request->validated();

        $event = $query->recordEvent(
            QueryEventType::from($validated['type']),
            isset($validated['happened_at']) ? Carbon::parse($validated['happened_at']) : null,
            $validated['notes'] ?? null,
        );

        $query->load(['events', 'agent.agency', 'manuscript']);

        return response()->json([
            'event' => QueryEventResource::make($event)->resolve(),
            'query' => ['data' => QueryResource::make($query)->resolve()],
        ], 201);
    }
}
