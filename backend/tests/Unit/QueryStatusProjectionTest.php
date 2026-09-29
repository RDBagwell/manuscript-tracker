<?php

namespace Tests\Unit;

use App\Enums\QueryEventType;
use App\Enums\QueryStatus;
use App\Models\Query;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Query.status / sent_at / closed_at are a cache projected from the event
 * stream by recordEvent(). These pin the projection rules directly,
 * beneath the HTTP layer.
 */
class QueryStatusProjectionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{QueryEventType, ?QueryStatus}>
     */
    public static function eventOutcomes(): array
    {
        return [
            'sent' => [QueryEventType::Sent, QueryStatus::Sent],
            'partial requested' => [QueryEventType::PartialRequested, QueryStatus::Partial],
            'materials sent' => [QueryEventType::MaterialsSent, null],
            'full requested' => [QueryEventType::FullRequested, QueryStatus::Full],
            'revise & resubmit' => [QueryEventType::ReviseResubmit, QueryStatus::ReviseResubmit],
            'offer' => [QueryEventType::Offer, QueryStatus::Offer],
            'form rejection' => [QueryEventType::RejectedForm, QueryStatus::Rejected],
            'personal rejection' => [QueryEventType::RejectedPersonal, QueryStatus::Rejected],
            'nudge' => [QueryEventType::Nudged, null],
            'closed no response' => [QueryEventType::ClosedNoResponse, QueryStatus::NoResponse],
            'withdrawn' => [QueryEventType::Withdrawn, QueryStatus::Withdrawn],
        ];
    }

    #[DataProvider('eventOutcomes')]
    public function test_every_event_type_maps_to_its_status(QueryEventType $type, ?QueryStatus $expected): void
    {
        $this->assertSame($expected, $type->resultingStatus());
    }

    public function test_every_event_type_is_covered(): void
    {
        $this->assertCount(count(QueryEventType::cases()), self::eventOutcomes());
    }

    public function test_informational_events_leave_status_alone(): void
    {
        $query = Query::factory()->create();
        $query->recordEvent(QueryEventType::Sent);
        $query->recordEvent(QueryEventType::FullRequested);

        $query->recordEvent(QueryEventType::MaterialsSent);
        $query->recordEvent(QueryEventType::Nudged);

        $this->assertSame(QueryStatus::Full, $query->fresh()->status);
        $this->assertSame(4, $query->events()->count());
    }

    public function test_sent_at_is_stamped_by_the_first_send_only(): void
    {
        $query = Query::factory()->create();
        $first = Carbon::parse('2026-05-01 09:00');

        $query->recordEvent(QueryEventType::Sent, $first);
        $query->recordEvent(QueryEventType::Sent, $first->copy()->addWeek());

        $this->assertTrue($query->fresh()->sent_at->equalTo($first));
    }

    public function test_terminal_events_close_the_thread_and_keep_the_first_close_date(): void
    {
        $query = Query::factory()->create();
        $query->recordEvent(QueryEventType::Sent, Carbon::parse('2026-05-01'));
        $query->recordEvent(QueryEventType::RejectedForm, Carbon::parse('2026-05-20'));
        $query->recordEvent(QueryEventType::Withdrawn, Carbon::parse('2026-06-01'));

        $query->refresh();
        $this->assertSame(QueryStatus::Withdrawn, $query->status);
        $this->assertSame('2026-05-20', $query->closed_at->toDateString());
    }

    public function test_a_later_event_can_reopen_a_closed_thread(): void
    {
        $query = Query::factory()->create();
        $query->recordEvent(QueryEventType::Sent);
        $query->recordEvent(QueryEventType::RejectedPersonal);
        $this->assertNotNull($query->fresh()->closed_at);

        // An R&R after a rejection puts the manuscript back in play.
        $query->recordEvent(QueryEventType::ReviseResubmit);

        $query->refresh();
        $this->assertSame(QueryStatus::ReviseResubmit, $query->status);
        $this->assertNull($query->closed_at);
    }

    public function test_an_offer_keeps_the_thread_open(): void
    {
        $query = Query::factory()->create();
        $query->recordEvent(QueryEventType::Sent);
        $query->recordEvent(QueryEventType::Offer);

        $this->assertNull($query->fresh()->closed_at);
    }

    public function test_days_out_runs_to_close_or_to_now(): void
    {
        Carbon::setTestNow('2026-06-30 12:00');

        $open = Query::factory()->create();
        $open->recordEvent(QueryEventType::Sent, Carbon::parse('2026-06-20 12:00'));

        $closed = Query::factory()->create();
        $closed->recordEvent(QueryEventType::Sent, Carbon::parse('2026-06-01 12:00'));
        $closed->recordEvent(QueryEventType::RejectedForm, Carbon::parse('2026-06-11 12:00'));

        $this->assertSame(10, $open->fresh()->daysOut());
        $this->assertSame(10, $closed->fresh()->daysOut());
        $this->assertNull(Query::factory()->create()->daysOut());
    }
}
