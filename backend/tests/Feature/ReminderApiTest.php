<?php

namespace Tests\Feature;

use App\Models\Manuscript;
use App\Models\Query;
use App\Models\Reminder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReminderApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_pending_reminders_soonest_first(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $manuscript = Manuscript::factory()->for($me)->create();
        $manuscript->reminders()->create([
            'user_id' => $me->id, 'due_at' => now()->addDays(30), 'reason' => 'Later',
        ]);
        $manuscript->reminders()->create([
            'user_id' => $me->id, 'due_at' => now()->addDay(), 'reason' => 'Sooner',
        ]);

        $theirs = Manuscript::factory()->create();
        $theirs->reminders()->create([
            'user_id' => $theirs->user_id, 'due_at' => now(), 'reason' => 'Not mine',
        ]);

        $this->getJson('/api/reminders')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.reason', 'Sooner')
            ->assertJsonMissing(['reason' => 'Not mine']);
    }

    public function test_store_creates_a_reminder_against_own_query_with_alias_morph(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $manuscript = Manuscript::factory()->for($me)->create(['title' => 'UNRESOLVED']);
        $query = Query::factory()->for($me)->create([
            'manuscript_id' => $manuscript->id,
        ]);

        $this->postJson('/api/reminders', [
            'remindable_type' => 'query',
            'remindable_id' => $query->id,
            'due_at' => now()->addWeeks(3)->toDateString(),
            'reason' => 'Nudge on the partial',
        ])->assertCreated()
            ->assertJsonPath('data.remindable_type', 'query');

        $this->assertDatabaseHas('reminders', [
            'remindable_type' => 'query',
            'remindable_id' => $query->id,
        ]);
    }

    public function test_store_rejects_targets_owned_by_someone_else(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $theirManuscript = Manuscript::factory()->create();

        $this->postJson('/api/reminders', [
            'remindable_type' => 'manuscript',
            'remindable_id' => $theirManuscript->id,
            'due_at' => now()->addWeek()->toDateString(),
            'reason' => 'Should not exist',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('remindable_id');
    }

    public function test_complete_stamps_completed_at(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $manuscript = Manuscript::factory()->for($me)->create();
        $reminder = $manuscript->reminders()->create([
            'user_id' => $me->id, 'due_at' => now(), 'reason' => 'Do the thing',
        ]);

        $this->postJson("/api/reminders/{$reminder->id}/complete")
            ->assertOk();

        $this->assertNotNull($reminder->fresh()->completed_at);
    }

    public function test_snooze_via_update_moves_due_at(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $manuscript = Manuscript::factory()->for($me)->create();
        $reminder = $manuscript->reminders()->create([
            'user_id' => $me->id, 'due_at' => now(), 'reason' => 'Snoozable',
        ]);

        $newDue = now()->addWeek();

        $this->putJson("/api/reminders/{$reminder->id}", [
            'due_at' => $newDue->toISOString(),
        ])->assertOk();

        $this->assertTrue($reminder->fresh()->due_at->isSameDay($newDue));
    }
}
