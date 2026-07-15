<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAgentRequest;
use App\Http\Requests\UpdateAgentRequest;
use App\Http\Resources\AgentResource;
use App\Models\Agent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class AgentController extends Controller
{
    /**
     * Supports ?genre=noir filtering — jsonb containment (GIN-indexed on
     * Postgres) via whereJsonContains, which degrades gracefully on sqlite.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $agents = $request->user()->agents()
            ->with('agency')
            ->when(
                $request->query('genre'),
                fn ($query, $genre) => $query->whereJsonContains('genres', $genre),
            )
            ->when(
                $request->has('open'),
                fn ($query) => $query->where('open_to_queries', $request->boolean('open')),
            )
            ->orderBy('name')
            ->get();

        return AgentResource::collection($agents);
    }

    public function store(StoreAgentRequest $request): JsonResponse
    {
        $agent = $request->user()->agents()->create($request->validated());

        return AgentResource::make($agent->load('agency'))->response()->setStatusCode(201);
    }

    public function show(Request $request, Agent $agent): AgentResource
    {
        $this->authorize('view', $agent);

        return AgentResource::make($agent->load(['agency', 'queries']));
    }

    public function update(UpdateAgentRequest $request, Agent $agent): AgentResource
    {
        $this->authorize('update', $agent);

        $agent->update($request->validated());

        return AgentResource::make($agent->load('agency'));
    }

    public function destroy(Agent $agent): Response
    {
        $this->authorize('delete', $agent);

        $agent->delete();

        return response()->noContent();
    }
}
