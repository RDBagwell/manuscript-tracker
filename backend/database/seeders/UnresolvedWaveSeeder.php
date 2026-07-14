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
 * Dates are approximate — adjust sent/request dates to match your
 * records. Statuses are written through Query::recordEvent(), so a
 * successful seed also proves the event -> status machine works.
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

        $unresolved = Manuscript::create([
            'user_id' => $user->id,
            'title' => 'UNRESOLVED',
            'genre' => 'Literary noir',
            'category' => ManuscriptCategory::Adult,
            'word_count' => 62000,
            'status' => ManuscriptStatus::Querying,
            'pitch' => 'Homicide detective Trey Burgess works cold cases that are, unknown to him, the unresolved pieces of his own life.',
            'notes' => 'Wave 1 sent May 2026. Partial out with Jen Nadol (Unter).',
        ]);

        Manuscript::create([
            'user_id' => $user->id,
            'title' => 'SUSTAINED COHERENCE',
            'genre' => 'Linked speculative story collection',
            'category' => ManuscriptCategory::Adult,
            'word_count' => 24658,
            'status' => ManuscriptStatus::Shelved,
            'pitch' => 'The working archive of the Bureau of Sustained Coherence.',
            'notes' => 'Query strategy drafted; pairs structurally with UNRESOLVED. Offer to agents who rep collections.',
        ]);

        Manuscript::create([
            'user_id' => $user->id,
            'title' => 'PROJECT ATLAS',
            'genre' => 'Techno-thriller',
            'category' => ManuscriptCategory::Adult,
            'word_count' => 94000,
            'status' => ManuscriptStatus::Querying,
            'pitch' => 'Pen-tester Jamie Brooks versus an AI system making global decisions.',
            'notes' => 'Query-ready per final polish pass. First wave not yet assembled.',
        ]);

        Manuscript::create([
            'user_id' => $user->id,
            'title' => 'IT COMES BACK',
            'genre' => 'Literary speculative',
            'category' => ManuscriptCategory::Adult,
            'word_count' => 67000,
            'status' => ManuscriptStatus::Production,
            'pitch' => 'Grief and the partial recovery of the dead.',
            'notes' => 'KDP production. Awaiting final page count for spine width and wrap assembly.',
        ]);

        // ── Agencies ───────────────────────────────────────────────────

        $unter = Agency::create([
            'user_id' => $user->id,
            'name' => 'The Unter Agency',
            'website' => 'https://theunteragency.com',
            'one_no_means_all_no' => false,
            'notes' => 'Policy not confirmed — verify before querying a second Unter agent.',
        ]);

        $andreaBrown = Agency::create([
            'user_id' => $user->id,
            'name' => 'Andrea Brown Literary Agency',
            'website' => 'https://www.andreabrownlit.com',
            'one_no_means_all_no' => true,
            'notes' => 'ABLA states a no from one agent is a no from the agency.',
        ]);

        $writersHouse = Agency::create([
            'user_id' => $user->id,
            'name' => 'Writers House',
            'website' => 'https://www.writershouse.com',
            'one_no_means_all_no' => false,
            'notes' => 'One agent at a time. Verify current re-query policy before approaching a colleague.',
        ]);

        // ── Agents ─────────────────────────────────────────────────────
        // MSWL/genre detail intentionally left thin — backfill from your
        // research notes. Ramsay and Evans have no agency on record.

        $nadol = Agent::create([
            'user_id' => $user->id,
            'agency_id' => $unter->id,
            'name' => 'Jen Nadol',
            'open_to_queries' => true,
            'notes' => 'Requested first 50 pages one day after query. Materials sent as Word attachment.',
        ]);

        $soloway = Agent::create([
            'user_id' => $user->id,
            'agency_id' => $andreaBrown->id,
            'name' => 'Jennifer March Soloway',
            'open_to_queries' => true,
            'notes' => 'Backfill MSWL notes from wave-1 research.',
        ]);

        $shane = Agent::create([
            'user_id' => $user->id,
            'agency_id' => $writersHouse->id,
            'name' => 'Alec Shane',
            'open_to_queries' => true,
            'notes' => 'Backfill MSWL notes from wave-1 research.',
        ]);

        $ramsay = Agent::create([
            'user_id' => $user->id,
            'agency_id' => null,
            'name' => 'Jo Ramsay',
            'open_to_queries' => true,
            'notes' => 'Agency not recorded — fill in. Backfill MSWL notes.',
        ]);

        $evans = Agent::create([
            'user_id' => $user->id,
            'agency_id' => null,
            'name' => 'Kiya Evans',
            'open_to_queries' => true,
            'notes' => 'Agency not recorded — fill in. Backfill MSWL notes.',
        ]);

        // ── Wave 1 queries ─────────────────────────────────────────────

        $sentAt = Carbon::parse('2026-05-12 09:00:00');

        foreach ([$nadol, $soloway, $shane, $ramsay, $evans] as $agent) {
            $query = Query::create([
                'user_id' => $user->id,
                'manuscript_id' => $unresolved->id,
                'agent_id' => $agent->id,
                'personalization' => 'Tailored per wave-1 packet — see sent letter.',
                'materials' => 'Query letter per agent guidelines.',
                'wave' => 1,
            ]);

            $query->recordEvent(QueryEventType::Sent, $sentAt);
        }

        // Nadol's partial — the live thread.
        $nadolQuery = Query::where('agent_id', $nadol->id)
            ->where('manuscript_id', $unresolved->id)
            ->firstOrFail();

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

        // ── Reminders ──────────────────────────────────────────────────

        $nadolQuery->reminders()->create([
            'user_id' => $user->id,
            'due_at' => Carbon::parse('2026-08-13 09:00:00'),
            'reason' => 'Status check on Nadol partial (~3 months since materials sent).',
        ]);

        Manuscript::where('title', 'PROJECT ATLAS')->first()
            ->reminders()->create([
                'user_id' => $user->id,
                'due_at' => Carbon::parse('2026-07-20 09:00:00'),
                'reason' => 'Assemble ATLAS wave-1 agent list.',
            ]);

        // ── Templates ──────────────────────────────────────────────────

        Template::create([
            'user_id' => $user->id,
            'manuscript_id' => $unresolved->id,
            'type' => TemplateType::QueryLetter,
            'name' => 'UNRESOLVED master query',
            'body' => '[Paste the master UNRESOLVED query letter here — personalization block at top, bio paragraph at bottom.]',
        ]);

        Template::create([
            'user_id' => $user->id,
            'manuscript_id' => null,
            'type' => TemplateType::Bio,
            'name' => 'Author bio',
            'body' => '[Paste the polished bio paragraph here — usable across manuscripts.]',
        ]);
    }
}
