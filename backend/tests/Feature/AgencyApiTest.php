<?php

namespace Tests\Feature;

use App\Enums\QueryEventType;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Manuscript;
use App\Models\Query;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AgencyApiTest extends TestCase
{
    use RefreshDatabase;

    private User $me;

    protected function setUp(): void
    {
        parent::setUp();
        $this->me = User::factory()->create();
        Sanctum::actingAs($this->me);
    }

    public function test_index_returns_only_own_agencies_with_their_agents(): void
    {
        $mine = Agency::factory()->for($this->me)->create(['name' => 'Harbor Lit']);
        Agent::factory()->for($this->me)->create(['agency_id' => $mine->id]);
        Agency::factory()->create(['name' => 'Not Mine Literary']);

        $this->getJson('/api/agencies')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Harbor Lit')
            ->assertJsonCount(1, 'data.0.agents')
            ->assertJsonMissing(['name' => 'Not Mine Literary']);
    }

    public function test_store_creates_an_agency_owned_by_the_caller(): void
    {
        $this->postJson('/api/agencies', [
            'name' => 'Harbor Lit',
            'website' => 'https://harborlit.example',
            'one_no_means_all_no' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Harbor Lit')
            ->assertJsonPath('data.one_no_means_all_no', true);

        $this->assertDatabaseHas('agencies', [
            'user_id' => $this->me->id,
            'name' => 'Harbor Lit',
        ]);
    }

    public function test_show_update_and_destroy_work_on_own_agencies(): void
    {
        $agency = Agency::factory()->for($this->me)->create();

        $this->getJson("/api/agencies/{$agency->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $agency->id);

        $this->putJson("/api/agencies/{$agency->id}", ['notes' => 'Closed until spring'])
            ->assertOk()
            ->assertJsonPath('data.notes', 'Closed until spring');

        $this->deleteJson("/api/agencies/{$agency->id}")->assertNoContent();
        $this->assertModelMissing($agency);
    }

    public function test_users_cannot_see_edit_or_delete_others_agencies(): void
    {
        $theirs = Agency::factory()->create(['name' => 'Their Agency']);

        $this->getJson("/api/agencies/{$theirs->id}")->assertForbidden();
        $this->putJson("/api/agencies/{$theirs->id}", ['name' => 'Hijacked'])->assertForbidden();
        $this->deleteJson("/api/agencies/{$theirs->id}")->assertForbidden();

        $this->assertDatabaseHas('agencies', ['id' => $theirs->id, 'name' => 'Their Agency']);
    }

    public function test_name_must_be_unique_per_user(): void
    {
        Agency::factory()->for($this->me)->create(['name' => 'Harbor Lit']);

        $this->postJson('/api/agencies', ['name' => 'Harbor Lit'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_another_users_agency_name_does_not_collide(): void
    {
        Agency::factory()->create(['name' => 'Harbor Lit']);

        $this->postJson('/api/agencies', ['name' => 'Harbor Lit'])->assertCreated();
    }

    public function test_update_may_keep_its_own_name_but_not_take_a_siblings(): void
    {
        $agency = Agency::factory()->for($this->me)->create(['name' => 'Harbor Lit']);
        Agency::factory()->for($this->me)->create(['name' => 'Lantern Agency']);

        $this->putJson("/api/agencies/{$agency->id}", ['name' => 'Harbor Lit'])
            ->assertOk();

        $this->putJson("/api/agencies/{$agency->id}", ['name' => 'Lantern Agency'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_deleting_an_agency_keeps_its_agents_and_their_threads(): void
    {
        $agency = Agency::factory()->for($this->me)->create();
        $agent = Agent::factory()->for($this->me)->create(['agency_id' => $agency->id]);
        $query = Query::factory()->for($this->me)->create([
            'agent_id' => $agent->id,
            'manuscript_id' => Manuscript::factory()->for($this->me),
        ]);

        $this->deleteJson("/api/agencies/{$agency->id}")->assertNoContent();

        // agency_id is nullOnDelete: the agent becomes independent rather
        // than vanishing, and the correspondence history stays intact.
        $this->assertNull($agent->fresh()->agency_id);
        $this->assertModelExists($query);
    }

    public function test_closed_door_advisory_follows_the_agency_policy_flag(): void
    {
        $agency = Agency::factory()->for($this->me)->oneNoMeansAllNo()->create(['name' => 'Harbor Lit']);
        [$manuscript, $colleague] = $this->rejectedBy($agency);

        $response = $this->postJson('/api/queries', [
            'manuscript_id' => $manuscript->id,
            'agent_id' => $colleague->id,
        ]);

        // An advisory, not a roadblock: the thread is created regardless.
        $response->assertCreated();
        $this->assertCount(1, $response->json('meta.warnings'));
        $this->assertStringContainsString('Harbor Lit', $response->json('meta.warnings.0'));

        // Flip the policy off and a second colleague gets no warning.
        $this->putJson("/api/agencies/{$agency->id}", ['one_no_means_all_no' => false])
            ->assertOk();
        $another = Agent::factory()->for($this->me)->create(['agency_id' => $agency->id]);

        $this->postJson('/api/queries', [
            'manuscript_id' => $manuscript->id,
            'agent_id' => $another->id,
        ])->assertCreated()->assertJsonPath('meta.warnings', []);
    }

    public function test_closed_door_advisory_ignores_closed_no_response(): void
    {
        $agency = Agency::factory()->for($this->me)->oneNoMeansAllNo()->create();
        [$manuscript, $colleague] = $this->rejectedBy($agency, QueryEventType::ClosedNoResponse);

        $this->postJson('/api/queries', [
            'manuscript_id' => $manuscript->id,
            'agent_id' => $colleague->id,
        ])->assertCreated()->assertJsonPath('meta.warnings', []);
    }

    public function test_closed_agent_advisory_is_a_warning_not_an_error(): void
    {
        $closed = Agent::factory()->for($this->me)->create([
            'name' => 'Jen Nadol',
            'open_to_queries' => false,
        ]);

        $this->postJson('/api/queries', [
            'manuscript_id' => Manuscript::factory()->for($this->me)->create()->id,
            'agent_id' => $closed->id,
        ])
            ->assertCreated()
            ->assertJsonPath('meta.warnings.0', 'Jen Nadol is currently marked closed to queries.');
    }

    /**
     * One agent at $agency closes a thread on a fresh manuscript with
     * $outcome. Returns the manuscript and an untouched colleague.
     *
     * @return array{Manuscript, Agent}
     */
    private function rejectedBy(Agency $agency, QueryEventType $outcome = QueryEventType::RejectedForm): array
    {
        $manuscript = Manuscript::factory()->for($this->me)->create();
        $passed = Agent::factory()->for($this->me)->create(['agency_id' => $agency->id]);
        $colleague = Agent::factory()->for($this->me)->create(['agency_id' => $agency->id]);

        $thread = Query::factory()->for($this->me)->create([
            'manuscript_id' => $manuscript->id,
            'agent_id' => $passed->id,
        ]);
        $thread->recordEvent(QueryEventType::Sent);
        $thread->recordEvent($outcome);

        return [$manuscript, $colleague];
    }
}
