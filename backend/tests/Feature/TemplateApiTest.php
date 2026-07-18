<?php

namespace Tests\Feature;

use App\Models\Manuscript;
use App\Models\Template;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TemplateApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_is_scoped_and_filters_by_type(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $me->templates()->create([
            'type' => 'query_letter', 'name' => 'Mine QL', 'body' => 'Dear agent,',
        ]);
        $me->templates()->create([
            'type' => 'bio', 'name' => 'Mine Bio', 'body' => 'Robert writes.',
        ]);

        $other = User::factory()->create();
        $other->templates()->create([
            'type' => 'query_letter', 'name' => 'Not mine', 'body' => 'x',
        ]);

        $this->getJson('/api/templates?type=query_letter')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Mine QL')
            ->assertJsonMissing(['name' => 'Not mine']);
    }

    public function test_store_links_a_manuscript_and_validates_the_type_enum(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $manuscript = Manuscript::factory()->for($me)->create(['title' => 'UNRESOLVED']);

        $this->postJson('/api/templates', [
            'name' => 'UNRESOLVED master query',
            'type' => 'query_letter',
            'manuscript_id' => $manuscript->id,
            'body' => 'Dear [Agent], …',
        ])->assertCreated()
            ->assertJsonPath('data.manuscript.title', 'UNRESOLVED');

        $this->postJson('/api/templates', [
            'name' => 'Bad type', 'type' => 'sonnet', 'body' => 'x',
        ])->assertUnprocessable()->assertJsonValidationErrors('type');
    }

    public function test_store_rejects_someone_elses_manuscript(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $theirs = Manuscript::factory()->create();

        $this->postJson('/api/templates', [
            'name' => 'Sneaky', 'type' => 'synopsis',
            'manuscript_id' => $theirs->id, 'body' => 'x',
        ])->assertUnprocessable()->assertJsonValidationErrors('manuscript_id');
    }

    public function test_update_and_destroy_respect_ownership(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $mine = $me->templates()->create([
            'type' => 'bio', 'name' => 'Bio', 'body' => 'v1',
        ]);
        $theirs = Template::query()->create([
            'user_id' => User::factory()->create()->id,
            'type' => 'bio', 'name' => 'Their bio', 'body' => 'x',
        ]);

        $this->putJson("/api/templates/{$mine->id}", ['body' => 'v2'])
            ->assertOk()
            ->assertJsonPath('data.body', 'v2');

        $this->putJson("/api/templates/{$theirs->id}", ['body' => 'hijack'])
            ->assertForbidden();

        $this->deleteJson("/api/templates/{$mine->id}")->assertNoContent();
        $this->assertDatabaseMissing('templates', ['id' => $mine->id]);
    }
}
