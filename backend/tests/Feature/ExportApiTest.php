<?php

namespace Tests\Feature;

use App\Enums\QueryEventType;
use App\Models\Agent;
use App\Models\Manuscript;
use App\Models\Query;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_csv_export_contains_own_threads_with_header(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $manuscript = Manuscript::factory()->for($me)->create(['title' => 'UNRESOLVED']);
        $agent = Agent::factory()->for($me)->create(['name' => 'Jen Nadol']);
        $query = Query::factory()->for($me)->create([
            'manuscript_id' => $manuscript->id,
            'agent_id' => $agent->id,
        ]);
        $query->recordEvent(QueryEventType::Sent, now()->subDays(10));

        $response = $this->get('/api/export/queries.csv')->assertOk();

        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));

        $csv = $response->streamedContent();
        $this->assertStringContainsString('Manuscript,Agent,Agency,Status', $csv);
        $this->assertStringContainsString('UNRESOLVED', $csv);
        $this->assertStringContainsString('Jen Nadol', $csv);
    }

    public function test_csv_export_is_tenant_scoped(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $theirs = Query::factory()->create();
        $theirs->agent->update(['name' => 'Secret Agent']);

        $csv = $this->get('/api/export/queries.csv')->assertOk()->streamedContent();

        $this->assertStringNotContainsString('Secret Agent', $csv);
    }
}
