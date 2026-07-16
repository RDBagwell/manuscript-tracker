<?php

namespace App\Http\Controllers;

use App\Enums\QueryEventType;
use App\Enums\QueryStatus;
use App\Http\Requests\StoreQueryRequest;
use App\Http\Requests\UpdateQueryRequest;
use App\Http\Resources\QueryResource;
use App\Models\Query;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class QueryController extends Controller
{
    use \App\Http\Controllers\Concerns\AppliesSorting;

    public function index(Request $request): AnonymousResourceCollection
    {
        $queries = $request->user()->queries()
            ->with(['agent.agency', 'manuscript'])
            ->when(
                $request->query('manuscript_id'),
                fn ($q, $id) => $q->where('manuscript_id', $id),
            )
            ->when(
                $request->query('status'),
                fn ($q, $status) => $q->where('status', $status),
            )
            ->when(
                $request->boolean('open'),
                fn ($q) => $q->whereNull('closed_at'),
            );

        $sorted = $this->applySort(
            $queries,
            $request,
            ['sent_at', 'status', 'wave', 'created_at'],
            'sent_at',
        )->get();

        return QueryResource::collection($sorted);
    }

    public function store(StoreQueryRequest $request): JsonResponse
    {
        $query = $request->user()->queries()->create(
            $request->safe()->except('sent_at'),
        );

        // Optional backfill: creating a thread for a query already sent
        // (real life rarely starts at "queued") runs through the same
        // event machine as everything else.
        if ($sentAt = $request->date('sent_at')) {
            $query->recordEvent(QueryEventType::Sent, $sentAt);
        }

        $query->refresh()->load(['events', 'agent.agency', 'manuscript']);

        return QueryResource::make($query)
            ->additional(['meta' => ['warnings' => $this->warningsFor($query)]])
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Query $query): QueryResource
    {
        $this->authorize('view', $query);

        return QueryResource::make(
            $query->load(['events', 'agent.agency', 'manuscript']),
        );
    }

    public function update(UpdateQueryRequest $request, Query $query): QueryResource
    {
        $this->authorize('update', $query);

        $query->update($request->validated());

        return QueryResource::make($query->load(['events', 'agent.agency', 'manuscript']));
    }

    public function destroy(Query $query): Response
    {
        $this->authorize('delete', $query);

        $query->delete();

        return response()->noContent();
    }

    /**
     * Non-blocking advisories. Deliberately warnings rather than
     * validation failures: the tracker should surface "are you sure?"
     * moments, not overrule the author's judgment.
     *
     * @return list<string>
     */
    private function warningsFor(Query $query): array
    {
        $warnings = [];
        $agent = $query->agent;
        $agency = $agent->agency;

        if ($agency?->hasClosedDoorFor($query->manuscript)) {
            $warnings[] = sprintf(
                '%s has a "one no means all no" policy and another %s agent has already rejected %s.',
                $agency->name,
                $agency->name,
                $query->manuscript->title,
            );
        }

        if (! $agent->open_to_queries) {
            $warnings[] = sprintf('%s is currently marked closed to queries.', $agent->name);
        }

        $alreadyOffered = $query->manuscript->queries()
            ->where('status', QueryStatus::Offer)
            ->whereKeyNot($query->id)
            ->exists();

        if ($alreadyOffered) {
            $warnings[] = sprintf(
                'An offer is already on the table for %s — new queries should probably be offer-notification nudges instead.',
                $query->manuscript->title,
            );
        }

        return $warnings;
    }
}
