<?php

namespace Tests\Unit;

use App\Models\Reminder;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * "Due" is day-granular: anything due before the end of today counts,
 * so a reminder set for 5pm shows up in the morning. No database needed.
 */
class ReminderDueTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-06-15 09:00');
    }

    public function test_overdue_reminders_are_due(): void
    {
        $this->assertTrue($this->reminder('2026-06-10 12:00')->isDue());
    }

    public function test_later_today_is_already_due(): void
    {
        $this->assertTrue($this->reminder('2026-06-15 23:59:59')->isDue());
    }

    public function test_tomorrow_is_not_due(): void
    {
        $this->assertFalse($this->reminder('2026-06-16 00:00')->isDue());
    }

    public function test_completed_reminders_are_never_due(): void
    {
        $this->assertFalse($this->reminder('2026-06-10 12:00', completedAt: '2026-06-11')->isDue());
    }

    public function test_snoozing_a_week_moves_a_due_reminder_out_of_due(): void
    {
        $reminder = $this->reminder('2026-06-14 12:00');
        $this->assertTrue($reminder->isDue());

        // The front end snoozes from max(now, due_at) + 7 days.
        $reminder->due_at = now()->max($reminder->due_at)->addDays(7);

        $this->assertFalse($reminder->isDue());
        $this->assertSame('2026-06-22', $reminder->due_at->toDateString());
    }

    private function reminder(string $dueAt, ?string $completedAt = null): Reminder
    {
        return new Reminder(['due_at' => $dueAt, 'completed_at' => $completedAt]);
    }
}
