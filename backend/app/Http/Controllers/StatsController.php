<?php

namespace App\Http\Controllers;

use App\Enums\QueryEventType;
use App\Models\Manuscript;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Burn-down analytics computed from the event stream. Collection-based
 * on purpose: the dataset is dozens of rows, and readable definitions
 * beat clever SQL at this scale. The definitions ARE the feature:
 *
 * - sent thread     sent_at is set
 * - response        first event where the agent spoke — a request,
 *                   offer, or rejection. Nudges, materials, and CNR
 *                   are author-side; silence is not a response.
 * - request         partial, full, or revise & resubmit
 * - rates           denominator is sent threads; null when none sent
 */
class StatsController extends Controller
{
    private const RESPONSE_EVENTS = [
        QueryEventType::PartialRequested,
        QueryEventType::FullRequested,
        QueryEventType::ReviseResubmit,
        QueryEventType::Offer,
        QueryEventType::RejectedForm,
        QueryEventType::RejectedPersonal,
    ];

    private const REQUEST_EVENTS = [
        QueryEventType::PartialRequested,
        QueryEventType::FullRequested,
        QueryEventType::ReviseResubmit,
    ];

    private const REJECTION_EVENTS = [
        QueryEventType::RejectedForm,
        QueryEventType::RejectedPersonal,
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $manuscripts = $request->user()->manuscripts()
            ->with(['queries.events', 'queries.agent'])
            ->orderBy('title')
            ->get();

        return response()->json([
            'data' => [
                'generated_at' => now()->toISOString(),
                'overall' => $this->statsFor($manuscripts->flatMap->queries),
                'manuscripts' => $manuscripts->map(fn (Manuscript $m) => [
                    'id' => $m->id,
                    'title' => $m->title,
                    'status' => $m->status->value,
                ] + $this->statsFor($m->queries))->values(),
            ],
        ]);
    }

    private function statsFor(Collection $queries): array
    {
        $sent = $queries->filter(fn ($q) => $q->sent_at !== null);
        $sentCount = $sent->count();

        $responded = $sent->filter(
            fn ($q) => $this->firstEventOf($q, self::RESPONSE_EVENTS) !== null,
        );
        $requested = $sent->filter(
            fn ($q) => $this->firstEventOf($q, self::REQUEST_EVENTS) !== null,
        );

        $firstResponseDays = $responded
            ->map(fn ($q) => $q->sent_at->diffInDays(
                $this->firstEventOf($q, self::RESPONSE_EVENTS)->happened_at,
            ))
            ->filter(fn ($d) => $d >= 0);

        $rejectionDays = $sent
            ->map(function ($q) {
                $rejection = $this->firstEventOf($q, self::REJECTION_EVENTS);

                return $rejection
                    ? $q->sent_at->diffInDays($rejection->happened_at)
                    : null;
            })
            ->filter(fn ($d) => $d !== null && $d >= 0);

        return [
            'totals' => [
                'threads' => $queries->count(),
                'sent' => $sentCount,
                'open' => $sent->whereNull('closed_at')->count(),
            ],
            'outcomes' => [
                'requests' => $requested->count(),
                'offers' => $sent->filter(
                    fn ($q) => $this->firstEventOf($q, [QueryEventType::Offer]) !== null,
                )->count(),
                'rejections' => $sent->filter(
                    fn ($q) => $this->firstEventOf($q, self::REJECTION_EVENTS) !== null,
                )->count(),
                'no_response' => $sent->filter(
                    fn ($q) => $q->status->value === 'no_response',
                )->count(),
            ],
            'rates' => [
                'request_rate' => $sentCount ? round($requested->count() / $sentCount, 3) : null,
                'response_rate' => $sentCount ? round($responded->count() / $sentCount, 3) : null,
            ],
            'latency' => [
                'avg_days_to_first_response' => $firstResponseDays->isNotEmpty()
                    ? round($firstResponseDays->avg(), 1) : null,
                'avg_days_to_rejection' => $rejectionDays->isNotEmpty()
                    ? round($rejectionDays->avg(), 1) : null,
            ],
            'status_counts' => $queries
                ->countBy(fn ($q) => $q->status->value)
                ->toArray(),
            'open_threads' => $sent
                ->whereNull('closed_at')
                ->map(fn ($q) => [
                    'agent' => $q->agent?->name ?? '—',
                    'days' => $q->daysOut() ?? 0,
                ])
                ->sortByDesc('days')
                ->values()
                ->all(),
        ];
    }

    private function firstEventOf($query, array $types): ?object
    {
        return $query->events->first(
            fn ($event) => in_array($event->type, $types, true),
        );
    }
}
