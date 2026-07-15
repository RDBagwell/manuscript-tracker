<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AgentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_agent_can_be_created_under_own_agency(): void
    {
        $me = User::factory()->create();
        $agency = Agency::factory()->for($me)->create();
        Sanctum::actingAs($me);

        $this->postJson('/api/agents', [
            'name' => 'Jen Nadol',
            'agency_id' => $agency->id,
            'genres' => ['literary fiction', 'noir'],
        ])->assertCreated()->assertJsonPath('data.agency.id', $agency->id);
    }

    public function test_attaching_someone_elses_agency_is_a_validation_error(): void
    {
        $me = User::factory()->create();
        $notMyAgency = Agency::factory()->create();
        Sanctum::actingAs($me);

        $this->postJson('/api/agents', [
            'name' => 'Sneaky Agent',
            'agency_id' => $notMyAgency->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('agency_id');
    }

    public function test_genre_filter_uses_json_containment(): void
    {
        $me = User::factory()->create();
        Agent::factory()->for($me)->create(['name' => 'Noir Agent', 'genres' => ['noir', 'thriller']]);
        Agent::factory()->for($me)->create(['name' => 'Fantasy Agent', 'genres' => ['fantasy']]);

        Sanctum::actingAs($me);

        $this->getJson('/api/agents?genre=noir')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Noir Agent');
    }
}
