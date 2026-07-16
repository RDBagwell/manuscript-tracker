<?php

namespace Tests\Feature;

use App\Models\Manuscript;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ManuscriptApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_only_the_users_own_manuscripts(): void
    {
        $me = User::factory()->create();
        $someoneElse = User::factory()->create();

        Manuscript::factory()->count(2)->for($me)->create();
        Manuscript::factory()->for($someoneElse)->create(['title' => 'NOT MINE']);

        Sanctum::actingAs($me);

        $this->getJson('/api/manuscripts')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissing(['title' => 'NOT MINE']);
    }

    public function test_store_creates_a_manuscript_owned_by_the_caller(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $this->postJson('/api/manuscripts', [
            'title' => 'UNRESOLVED',
            'genre' => 'Literary noir',
            'category' => 'adult',
            'word_count' => 62000,
            'status' => 'querying',
        ])->assertCreated()->assertJsonPath('data.title', 'UNRESOLVED');

        $this->assertDatabaseHas('manuscripts', [
            'title' => 'UNRESOLVED',
            'user_id' => $me->id,
        ]);
    }

    public function test_store_rejects_invalid_enum_values(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/manuscripts', [
            'title' => 'BAD ENUM',
            'status' => 'definitely_not_a_status',
        ])->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_users_cannot_see_or_modify_others_manuscripts(): void
    {
        $theirs = Manuscript::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/manuscripts/{$theirs->id}")->assertForbidden();
        $this->putJson("/api/manuscripts/{$theirs->id}", ['title' => 'HIJACKED'])->assertForbidden();
        $this->deleteJson("/api/manuscripts/{$theirs->id}")->assertForbidden();

        $this->assertDatabaseHas('manuscripts', ['id' => $theirs->id, 'title' => $theirs->title]);
    }

    public function test_update_and_destroy_work_on_own_manuscripts(): void
    {
        $me = User::factory()->create();
        $manuscript = Manuscript::factory()->for($me)->create();
        Sanctum::actingAs($me);

        $this->putJson("/api/manuscripts/{$manuscript->id}", ['status' => 'shelved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'shelved');

        $this->deleteJson("/api/manuscripts/{$manuscript->id}")->assertNoContent();
        $this->assertDatabaseMissing('manuscripts', ['id' => $manuscript->id]);
    }

    public function test_index_sorts_by_title_when_requested(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        Manuscript::factory()->for($me)->create(['title' => 'Zeta Protocol']);
        Manuscript::factory()->for($me)->create(['title' => 'Alpha Wake']);

        $this->getJson('/api/manuscripts?sort=title&dir=asc')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Alpha Wake')
            ->assertJsonPath('data.1.title', 'Zeta Protocol');
    }
}
