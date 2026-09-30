<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One manuscript per title per author, matching agencies.
     *
     * The pre-idempotent seeder crashed on the agencies unique index after
     * inserting its manuscripts, so a restart loop left stacks of copies
     * with nothing attached. Those are removed first — only rows with an
     * older twin and no queries, templates or reminders. A duplicate that
     * does carry data is real history: the migration stops and names it
     * instead of choosing which copy to keep.
     */
    public function up(): void
    {
        $orphanCopies = DB::table('manuscripts as m')
            ->whereExists(fn ($q) => $q->from('manuscripts as o')
                ->whereColumn('o.user_id', 'm.user_id')
                ->whereColumn('o.title', 'm.title')
                ->whereColumn('o.id', '<', 'm.id'))
            ->whereNotExists(fn ($q) => $q->from('queries')->whereColumn('queries.manuscript_id', 'm.id'))
            ->whereNotExists(fn ($q) => $q->from('templates')->whereColumn('templates.manuscript_id', 'm.id'))
            ->whereNotExists(fn ($q) => $q->from('reminders')
                ->where('reminders.remindable_type', 'manuscript')
                ->whereColumn('reminders.remindable_id', 'm.id'))
            ->pluck('m.id');

        foreach ($orphanCopies->chunk(500) as $ids) {
            DB::table('manuscripts')->whereIn('id', $ids)->delete();
        }

        $remaining = DB::table('manuscripts')
            ->select('user_id', 'title')
            ->groupBy('user_id', 'title')
            ->havingRaw('count(*) > 1')
            ->get();

        if ($remaining->isNotEmpty()) {
            throw new RuntimeException(sprintf(
                'Duplicate manuscript titles still hold queries, templates or reminders; merge them by hand, then re-run: %s',
                $remaining->map(fn ($r) => "user {$r->user_id} \"{$r->title}\"")->implode(', '),
            ));
        }

        Schema::table('manuscripts', function (Blueprint $table) {
            $table->unique(['user_id', 'title']);
        });
    }

    public function down(): void
    {
        Schema::table('manuscripts', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'title']);
        });
    }
};
