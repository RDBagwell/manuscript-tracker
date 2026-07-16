<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreManuscriptRequest;
use App\Http\Requests\UpdateManuscriptRequest;
use App\Http\Resources\ManuscriptResource;
use App\Models\Manuscript;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ManuscriptController extends Controller
{
    use \App\Http\Controllers\Concerns\AppliesSorting;

    public function index(Request $request): AnonymousResourceCollection
    {
        $manuscripts = $this->applySort(
            $request->user()->manuscripts()->withCount('queries'),
            $request,
            ['title', 'word_count', 'status', 'created_at'],
            'created_at',
        )->get();

        return ManuscriptResource::collection($manuscripts);
    }

    public function store(StoreManuscriptRequest $request): JsonResponse
    {
        $manuscript = $request->user()->manuscripts()->create($request->validated());

        return ManuscriptResource::make($manuscript)->response()->setStatusCode(201);
    }

    public function show(Request $request, Manuscript $manuscript): ManuscriptResource
    {
        $this->authorize('view', $manuscript);

        return ManuscriptResource::make($manuscript->load('queries.events'));
    }

    public function update(UpdateManuscriptRequest $request, Manuscript $manuscript): ManuscriptResource
    {
        $this->authorize('update', $manuscript);

        $manuscript->update($request->validated());

        return ManuscriptResource::make($manuscript);
    }

    public function destroy(Manuscript $manuscript): Response
    {
        $this->authorize('delete', $manuscript);

        $manuscript->delete();

        return response()->noContent();
    }
}
