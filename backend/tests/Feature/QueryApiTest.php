<?php

namespace Tests\Feature;

use App\Enums\QueryStatus;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Manuscript;
use App\Models\Query;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QueryApiTest extends TestCase
{
    use RefreshDatabase;

    private User $me;

    protected function setUp(): void
    {
        parent::setUp();
        $this->me = User::factory()->create();
        Sanctum::actingAs($this->me);
    }

    private function ownThread(): array
    {
        return [
            Manuscript::factory()->for($this->me)->create(),
            Agent::factory()->for($this->me)->create(),
        ];
    }

    public function test_store_creates_a_queued_thread(): void
    {
        [$manuscript, $agent] = $this->ownThread();

        $this->postJson('/api/queries', [
            'manuscript_id' => $manuscript->id,
            'agent_id' => $agent->id,
            'wave' => 1,
        ])->assertCreated()->assertJsonPath('data.status', 'queued');
    }

    public function test_store_with_sent_at_backfills_the_sent_event(): void
    {
        [$manuscript, $agent] = $this->ownThread();

        $response = $this->postJson('/api/queries', [
            'manuscript_id' => $manuscript->id,
            'agent_id' => $agent->id,
            'sent_at' => '2026-05-12 09:00:00',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'sent')
            ->assertJsonCount(1, 'data.events');

        $this->assertDatabaseHas('query_events', ['type' => 'sent']);
    }

    public function test_duplicate_manuscript_agent_pair_is_a_validation_error(): void
    {
        [$manuscript, $agent] = $this->ownThread();
        Query::factory()->for($this->me)->create([
            'manuscript_id' => $manuscript->id,
            'agent_id' => $agent->id,
        ]);

        $this->postJson('/api/queries', [
            'manuscript_id' => $manuscript->id,
            'agent_id' => $agent->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('agent_id');
    }

    public function test_events_drive_the_status_machine(): void
    {
        [$manuscript, $agent] = $this->ownThread();
        $query = Query::factory()->for($this->me)->create([
            'manuscript_id' => $manuscript->id,
            'agent_id' => $agent->id,
        ]);

        $this->postJson("/api/queries/{$query->id}/events", ['type' => 'sent'])
            ->assertCreated()->assertJsonPath('query.data.status', 'sent');

        $this->postJson("/api/queries/{$query->id}/events", ['type' => 'partial_requested'])
            ->assertCreated()->assertJsonPath('query.data.status', 'partial');

        // A nudge is informational — status must not move.
        $this->postJson("/api/queries/{$query->id}/events", ['type' => 'nudged'])
            ->assertCreated()->assertJsonPath('query.data.status', 'partial');

        $this->postJson("/api/queries/{$query->id}/events", ['type' => 'rejected_form'])
            ->assertCreated()->assertJsonPath('query.data.status', 'rejected');

        $query->refresh();
        $this->assertSame(QueryStatus::Rejected, $query->status);
        $this->assertNotNull($query->closed_at);
        $this->assertSame(4, $query->events()->count());
    }

    public function test_closed_door_warning_fires_for_one_no_agencies(): void
    {
        $agency = Agency::factory()->for($this->me)->oneNoMeansAllNo()->create();
        $colleagueWhoPassed = Agent::factory()->for($this->me)->create(['agency_id' => $agency->id]);
        $newTarget = Agent::factory()->for($this->me)->create(['agency_id' => $agency->id]);
        $manuscript = Manuscript::factory()->for($this->me)->create();

        $rejected = Query::factory()->for($this->me)->create([
            'manuscript_id' => $manuscript->id,
            'agent_id' => $colleagueWhoPassed->id,
        ]);
        $rejected->recordEvent(\App\Enums\QueryEventType::Sent);
        $rejected->recordEvent(\App\Enums\QueryEventType::RejectedForm);

        $response = $this->postJson('/api/queries', [
            'manuscript_id' => $manuscript->id,
            'agent_id' => $newTarget->id,
        ]);

        $response->assertCreated();
        $this->assertNotEmpty($response->json('meta.warnings'));
    }

    public function test_events_on_someone_elses_query_are_forbidden(): void
    {
        $theirQuery = Query::factory()->create();

        $this->postJson("/api/queries/{$theirQuery->id}/events", ['type' => 'sent'])
            ->assertForbidden();

        $this->assertSame(0, $theirQuery->events()->count());
    }

    public function test_cross_user_ids_in_store_are_validation_errors(): void
    {
        $notMyManuscript = Manuscript::factory()->create();
        $myAgent = Agent::factory()->for($this->me)->create();

        $this->postJson('/api/queries', [
            'manuscript_id' => $notMyManuscript->id,
            'agent_id' => $myAgent->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('manuscript_id');
    }
}
