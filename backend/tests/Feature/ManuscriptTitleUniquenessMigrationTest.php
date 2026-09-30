<?php

namespace Tests\Feature;

use App\Enums\QueryEventType;
use App\Models\Agent;
use App\Models\Manuscript;
use App\Models\Query;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

/**
 * Replays the old seeder's restart loop: stacks of same-title copies
 * with nothing attached, beside the one copy that holds the history.
 */
class ManuscriptTitleUniquenessMigrationTest extends TestCase
{
    use RefreshDatabase;

    private Migration $migration;

    protected function setUp(): void
    {
        parent::setUp();
        $this->migration = require database_path(
            'migrations/2026_09_30_000001_add_unique_title_per_user_to_manuscripts.php',
        );
        $this->migration->down();
    }

    public function test_orphan_copies_are_removed_and_the_original_keeps_its_history(): void
    {
        $user = User::factory()->create();
        $original = Manuscript::factory()->for($user)->create(['title' => 'UNRESOLVED']);
        $thread = Query::factory()->for($user)->create([
            'manuscript_id' => $original->id,
            'agent_id' => Agent::factory()->for($user),
        ]);
        $thread->recordEvent(QueryEventType::Sent);
        $atlas = Manuscript::factory()->for($user)->create(['title' => 'PROJECT ATLAS']);
        $atlas->reminders()->create(['user_id' => $user->id, 'due_at' => now(), 'reason' => 'Build list']);

        // Three restarts' worth of empty copies.
        foreach (range(1, 3) as $_) {
            Manuscript::factory()->for($user)->create(['title' => 'UNRESOLVED']);
            Manuscript::factory()->for($user)->create(['title' => 'PROJECT ATLAS']);
        }
        // Another author's same title is not a duplicate.
        $theirs = Manuscript::factory()->create(['title' => 'UNRESOLVED']);

        $this->migration->up();

        $this->assertSame(
            [$original->id, $atlas->id],
            Manuscript::where('user_id', $user->id)->orderBy('id')->pluck('id')->all(),
        );
        $this->assertModelExists($theirs);
        $this->assertSame(1, $original->queries()->count());

        $this->expectException(QueryException::class);
        Manuscript::factory()->for($user)->create(['title' => 'UNRESOLVED']);
    }

    public function test_it_refuses_to_guess_between_copies_that_both_hold_data(): void
    {
        $user = User::factory()->create();
        foreach (range(1, 2) as $_) {
            Query::factory()->for($user)->create([
                'manuscript_id' => Manuscript::factory()->for($user)->create(['title' => 'IT COMES BACK']),
                'agent_id' => Agent::factory()->for($user),
            ]);
        }

        try {
            $this->migration->up();
            $this->fail('Expected the migration to stop on duplicates that hold data.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('"IT COMES BACK"', $e->getMessage());
        }

        $this->assertSame(2, Manuscript::where('title', 'IT COMES BACK')->count());
    }
}
