<?php

namespace App\Http\Controllers;

use App\Enums\QueryEventType;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    /**
     * The whole querying campaign as one flat CSV — the spreadsheet
     * this app replaced, exportable for anyone who still wants it.
     */
    public function queries(Request $request): StreamedResponse
    {
        $queries = $request->user()->queries()
            ->with(['manuscript', 'agent.agency', 'events'])
            ->orderBy('sent_at')
            ->get();

        $agentSilent = [
            QueryEventType::Sent,
            QueryEventType::MaterialsSent,
            QueryEventType::Nudged,
        ];

        return response()->streamDownload(function () use ($queries, $agentSilent): void {
            $out = fopen('php://output', 'w');

            // UTF-8 BOM so Excel opens it with correct encoding.
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Manuscript', 'Agent', 'Agency', 'Status', 'Wave',
                'Sent', 'First response', 'Closed', 'Days out',
                'Events', 'Last event', 'Last event at',
                'Personalization', 'Materials',
            ]);

            foreach ($queries as $query) {
                $firstResponse = $query->events->first(
                    fn ($e) => ! in_array($e->type, $agentSilent, true),
                );
                $last = $query->events->last();

                fputcsv($out, [
                    $query->manuscript?->title,
                    $query->agent?->name,
                    $query->agent?->agency?->name,
                    $query->status->label(),
                    $query->wave,
                    $query->sent_at?->toDateString(),
                    $firstResponse?->happened_at?->toDateString(),
                    $query->closed_at?->toDateString(),
                    $query->daysOut(),
                    $query->events->count(),
                    $last?->type->label(),
                    $last?->happened_at?->toDateString(),
                    $query->personalization,
                    $query->materials,
                ]);
            }

            fclose($out);
        }, 'queries-'.now()->toDateString().'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
