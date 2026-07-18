<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AppliesSorting;
use App\Http\Requests\StoreTemplateRequest;
use App\Http\Requests\UpdateTemplateRequest;
use App\Http\Resources\TemplateResource;
use App\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TemplateController extends Controller
{
    use AppliesSorting;

    public function index(Request $request): AnonymousResourceCollection
    {
        $templates = $request->user()->templates()
            ->with('manuscript')
            ->when(
                $request->query('type'),
                fn ($q, $type) => $q->where('type', $type),
            )
            ->when(
                $request->filled('manuscript_id'),
                fn ($q) => $request->query('manuscript_id') === 'general'
                    ? $q->whereNull('manuscript_id')
                    : $q->where('manuscript_id', $request->query('manuscript_id')),
            );

        $templates = $this->applySort(
            $templates,
            $request,
            ['name', 'type', 'updated_at', 'created_at'],
            'updated_at',
        )->get();

        return TemplateResource::collection($templates);
    }

    public function store(StoreTemplateRequest $request): JsonResponse
    {
        $template = $request->user()->templates()->create($request->validated());

        return TemplateResource::make($template->load('manuscript'))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateTemplateRequest $request, Template $template): TemplateResource
    {
        $this->authorize('update', $template);

        $template->update($request->validated());

        return TemplateResource::make($template->load('manuscript'));
    }

    public function destroy(Template $template): Response
    {
        $this->authorize('delete', $template);

        $template->delete();

        return response()->noContent();
    }
}
