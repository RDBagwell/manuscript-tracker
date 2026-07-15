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
    public function index(Request $request): AnonymousResourceCollection
    {
        return ManuscriptResource::collection(
            $request->user()->manuscripts()->latest()->get(),
        );
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
