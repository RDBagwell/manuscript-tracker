<?php

namespace Database\Seeders;

use App\Enums\ManuscriptCategory;
use App\Enums\ManuscriptStatus;
use App\Enums\QueryEventType;
use App\Enums\TemplateType;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Manuscript;
use App\Models\Query;
use App\Models\Template;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Seeds the real UNRESOLVED wave-1 querying data (May 2026).
 *
 * Fully idempotent: every row is firstOrCreate on its natural key, and
 * events append only when their thread is first created. The entrypoint
 * runs this under `set -e` when SEED_DATABASE=true — a re-run must never
 * be able to kill a boot or duplicate history.
 */
class UnresolvedWaveSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'robert@example.test'],
            ['name' => 'Robert Bagwell', 'password' => 'password'],
        );

        // ── Manuscripts ────────────────────────────────────────────────

        $unresolved = Manuscript::firstOrCreate([
            'user_id' => $user->id,
            'title' => 'UNRESOLVED',
        ], [
            'genre' => 'Literary noir',
            'category' => ManuscriptCategory::Adult,
            'word_count' => 62000,
            'status' => ManuscriptStatus::Querying,
            'pitch' => 'Homicide detective Trey Burgess works cold cases that are, unknown to him, the unresolved pieces of his own life.',
            'notes' => 'Wave 1 sent May 2026. Partial out with Jen Nadol (Unter).',
        ]);

        Manuscript::firstOrCreate([
            'user_id' => $user->id,
            'title' => 'SUSTAINED COHERENCE',
        ], [
            'genre' => 'Linked speculative story collection',
            'category' => ManuscriptCategory::Adult,
            'word_count' => 24658,
            'status' => ManuscriptStatus::Shelved,
            'pitch' => 'The working archive of the Bureau of Sustained Coherence.',
            'notes' => 'Query strategy drafted; pairs structurally with UNRESOLVED. Offer to agents who rep collections.',
        ]);

        $atlas = Manuscript::firstOrCreate([
            'user_id' => $user->id,
            'title' => 'PROJECT ATLAS',
        ], [
            'genre' => 'Techno-thriller',
            'category' => ManuscriptCategory::Adult,
            'word_count' => 94000,
            'status' => ManuscriptStatus::Querying,
            'pitch' => 'Pen-tester Jamie Brooks versus an AI system making global decisions.',
            'notes' => 'Query-ready per final polish pass. First wave not yet assembled.',
        ]);

        Manuscript::firstOrCreate([
            'user_id' => $user->id,
            'title' => 'IT COMES BACK',
        ], [
            'genre' => 'Literary speculative',
            'category' => ManuscriptCategory::Adult,
            'word_count' => 67000,
            'status' => ManuscriptStatus::Production,
            'pitch' => 'Grief and the partial recovery of the dead.',
            'notes' => 'KDP production. Awaiting final page count for spine width and wrap assembly.',
        ]);

        // ── Agencies (keyed on the exact unique that once exploded) ────

        $unter = Agency::firstOrCreate([
            'user_id' => $user->id,
            'name' => 'The Unter Agency',
        ], [
            'website' => 'https://theunteragency.com',
            'one_no_means_all_no' => false,
            'notes' => 'Policy not confirmed — verify before querying a second Unter agent.',
        ]);

        $andreaBrown = Agency::firstOrCreate([
            'user_id' => $user->id,
            'name' => 'Andrea Brown Literary Agency',
        ], [
            'website' => 'https://www.andreabrownlit.com',
            'one_no_means_all_no' => true,
            'notes' => 'ABLA states a no from one agent is a no from the agency.',
        ]);

        $writersHouse = Agency::firstOrCreate([
            'user_id' => $user->id,
            'name' => 'Writers House',
        ], [
            'website' => 'https://www.writershouse.com',
            'one_no_means_all_no' => false,
            'notes' => 'One agent at a time. Verify current re-query policy before approaching a colleague.',
        ]);

        // ── Agents ─────────────────────────────────────────────────────

        $nadol = Agent::firstOrCreate([
            'user_id' => $user->id,
            'name' => 'Jen Nadol',
        ], [
            'agency_id' => $unter->id,
            'open_to_queries' => true,
            'notes' => 'Requested first 50 pages one day after query. Materials sent as Word attachment.',
        ]);

        $soloway = Agent::firstOrCreate([
            'user_id' => $user->id,
            'name' => 'Jennifer March Soloway',
        ], [
            'agency_id' => $andreaBrown->id,
            'open_to_queries' => true,
            'notes' => 'Backfill MSWL notes from wave-1 research.',
        ]);

        $shane = Agent::firstOrCreate([
            'user_id' => $user->id,
            'name' => 'Alec Shane',
        ], [
            'agency_id' => $writersHouse->id,
            'open_to_queries' => true,
            'notes' => 'Backfill MSWL notes from wave-1 research.',
        ]);

        $ramsay = Agent::firstOrCreate([
            'user_id' => $user->id,
            'name' => 'Jo Ramsay',
        ], [
            'agency_id' => null,
            'open_to_queries' => true,
            'notes' => 'Agency not recorded — fill in. Backfill MSWL notes.',
        ]);

        $evans = Agent::firstOrCreate([
            'user_id' => $user->id,
            'name' => 'Kiya Evans',
        ], [
            'agency_id' => null,
            'open_to_queries' => true,
            'notes' => 'Agency not recorded — fill in. Backfill MSWL notes.',
        ]);

        // ── Wave 1 queries ─────────────────────────────────────────────

        $sentAt = Carbon::parse('2026-05-12 09:00:00');
        $nadolQuery = null;

        foreach ([$nadol, $soloway, $shane, $ramsay, $evans] as $agent) {
            $query = Query::firstOrCreate([
                'manuscript_id' => $unresolved->id,
                'agent_id' => $agent->id,
            ], [
                'user_id' => $user->id,
                'personalization' => 'Tailored per wave-1 packet — see sent letter.',
                'materials' => 'Query letter per agent guidelines.',
                'wave' => 1,
            ]);

            // Events append: only write history the first time around.
            if ($query->wasRecentlyCreated) {
                $query->recordEvent(QueryEventType::Sent, $sentAt);
            }

            if ($agent->is($nadol)) {
                $nadolQuery = $query;
            }
        }

        // Nadol's partial — recorded once, guarded by event count so a
        // re-seed against an existing thread can't double the log.
        if ($nadolQuery && $nadolQuery->events()->count() <= 1) {
            $nadolQuery->recordEvent(
                QueryEventType::PartialRequested,
                Carbon::parse('2026-05-13 10:00:00'),
                'First 50 pages requested as Word attachment.',
            );

            $nadolQuery->recordEvent(
                QueryEventType::MaterialsSent,
                Carbon::parse('2026-05-13 14:00:00'),
                'First 50 pages sent.',
            );
        }

        // ── Reminders ──────────────────────────────────────────────────

        if ($nadolQuery) {
            $nadolQuery->reminders()->firstOrCreate([
                'reason' => 'Status check on Nadol partial (~3 months since materials sent).',
            ], [
                'user_id' => $user->id,
                'due_at' => Carbon::parse('2026-08-13 09:00:00'),
            ]);
        }

        $atlas->reminders()->firstOrCreate([
            'reason' => 'Assemble ATLAS wave-1 agent list.',
        ], [
            'user_id' => $user->id,
            'due_at' => Carbon::parse('2026-07-20 09:00:00'),
        ]);

        // ── Templates ──────────────────────────────────────────────────

        Template::firstOrCreate([
            'user_id' => $user->id,
            'name' => 'UNRESOLVED master query',
        ], [
            'manuscript_id' => $unresolved->id,
            'type' => TemplateType::QueryLetter,
            'body' => '[Paste the master UNRESOLVED query letter here — personalization block at top, bio paragraph at bottom.]',
        ]);

        Template::firstOrCreate([
            'user_id' => $user->id,
            'name' => 'Author bio',
        ], [
            'manuscript_id' => null,
            'type' => TemplateType::Bio,
            'body' => '[Paste the polished bio paragraph here — usable across manuscripts.]',
        ]);
    }
}
