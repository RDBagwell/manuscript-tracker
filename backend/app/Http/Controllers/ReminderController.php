<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AppliesSorting;
use App\Http\Requests\StoreReminderRequest;
use App\Http\Requests\UpdateReminderRequest;
use App\Http\Resources\ReminderResource;
use App\Models\Query;
use App\Models\Reminder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ReminderController extends Controller
{
    use AppliesSorting;

    /**
     * Query targets need their manuscript + agent for the label.
     */
    private function morphLoad(): array
    {
        return [
            'remindable' => function (MorphTo $morphTo): void {
                $morphTo->morphWith([
                    Query::class => ['manuscript', 'agent'],
                ]);
            },
        ];
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $reminders = $request->user()->reminders()->with($this->morphLoad());

        match ($request->query('filter', 'pending')) {
            'completed' => $reminders->whereNotNull('completed_at'),
            'all' => $reminders,
            default => $reminders->pending(),
        };

        $reminders = $this->applySort(
            $reminders,
            $request,
            ['due_at', 'created_at'],
            'due_at',
            'asc',
        )->get();

        return ReminderResource::collection($reminders);
    }

    public function store(StoreReminderRequest $request): JsonResponse
    {
        $validated = $request->validated();

        /** @var class-string<\Illuminate\Database\Eloquent\Model> $class */
        $class = Relation::getMorphedModel($validated['remindable_type']);

        // Ownership already validated by the request's exists-where rule.
        $target = $class::query()->findOrFail($validated['remindable_id']);

        $reminder = $target->reminders()->create([
            'user_id' => $request->user()->id,
            'due_at' => $validated['due_at'],
            'reason' => $validated['reason'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return ReminderResource::make($reminder->load($this->morphLoad()))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateReminderRequest $request, Reminder $reminder): ReminderResource
    {
        $this->authorize('update', $reminder);

        $reminder->update($request->validated());

        return ReminderResource::make($reminder->load($this->morphLoad()));
    }

    public function complete(Request $request, Reminder $reminder): ReminderResource
    {
        $this->authorize('update', $reminder);

        $reminder->complete();

        return ReminderResource::make($reminder->load($this->morphLoad()));
    }

    public function destroy(Reminder $reminder): Response
    {
        $this->authorize('delete', $reminder);

        $reminder->delete();

        return response()->noContent();
    }
}
