<?php

namespace Tests\Feature;

use App\Enums\QueryEventType;
use App\Models\Agent;
use App\Models\Manuscript;
use App\Models\Query;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StatsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_stats_compute_rates_and_latency_from_the_event_stream(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $manuscript = Manuscript::factory()->for($me)->create(['title' => 'FIXTURE']);
        $day0 = Carbon::parse('2026-06-01 09:00:00');

        $make = function () use ($me, $manuscript) {
            return Query::factory()->for($me)->create([
                'manuscript_id' => $manuscript->id,
                'agent_id' => Agent::factory()->for($me)->create()->id,
            ]);
        };

        // q1: sent day 0, partial requested day 10 — responded + requested, open
        $q1 = $make();
        $q1->recordEvent(QueryEventType::Sent, $day0);
        $q1->recordEvent(QueryEventType::PartialRequested, $day0->copy()->addDays(10));

        // q2: sent day 0, form rejection day 20 — responded, closed
        $q2 = $make();
        $q2->recordEvent(QueryEventType::Sent, $day0);
        $q2->recordEvent(QueryEventType::RejectedForm, $day0->copy()->addDays(20));

        // q3: sent day 0, silence — open, no response
        $q3 = $make();
        $q3->recordEvent(QueryEventType::Sent, $day0);

        // q4: queued, never sent — excluded from every rate denominator
        $make();

        $response = $this->getJson('/api/stats')->assertOk();

        $response
            ->assertJsonPath('data.manuscripts.0.totals.threads', 4)
            ->assertJsonPath('data.manuscripts.0.totals.sent', 3)
            ->assertJsonPath('data.manuscripts.0.totals.open', 2)
            ->assertJsonPath('data.manuscripts.0.outcomes.requests', 1)
            ->assertJsonPath('data.manuscripts.0.outcomes.rejections', 1)
            ->assertJsonPath('data.manuscripts.0.rates.request_rate', 0.333)
            ->assertJsonPath('data.manuscripts.0.rates.response_rate', 0.667)
            ->assertJsonPath('data.manuscripts.0.latency.avg_days_to_first_response', 15)
            ->assertJsonPath('data.manuscripts.0.latency.avg_days_to_rejection', 20);
    }

    public function test_stats_are_tenant_scoped(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        // Someone else's world, fully populated.
        $their = Query::factory()->create();
        $their->recordEvent(QueryEventType::Sent, now()->subDays(5));

        $this->getJson('/api/stats')
            ->assertOk()
            ->assertJsonPath('data.overall.totals.threads', 0)
            ->assertJsonCount(0, 'data.manuscripts');
    }
}
