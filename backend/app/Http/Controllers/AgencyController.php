<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAgencyRequest;
use App\Http\Requests\UpdateAgencyRequest;
use App\Http\Resources\AgencyResource;
use App\Models\Agency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class AgencyController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return AgencyResource::collection(
            $request->user()->agencies()->with('agents')->orderBy('name')->get(),
        );
    }

    public function store(StoreAgencyRequest $request): JsonResponse
    {
        $agency = $request->user()->agencies()->create($request->validated());

        return AgencyResource::make($agency)->response()->setStatusCode(201);
    }

    public function show(Request $request, Agency $agency): AgencyResource
    {
        $this->authorize('view', $agency);

        return AgencyResource::make($agency->load('agents'));
    }

    public function update(UpdateAgencyRequest $request, Agency $agency): AgencyResource
    {
        $this->authorize('update', $agency);

        $agency->update($request->validated());

        return AgencyResource::make($agency);
    }

    public function destroy(Agency $agency): Response
    {
        $this->authorize('delete', $agency);

        $agency->delete();

        return response()->noContent();
    }
}
