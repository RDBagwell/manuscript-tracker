<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Slice 1 stored FQCNs in remindable_type; the app now enforces a
     * morph map (query/manuscript/agent). Convert existing rows so the
     * seeded reminders survive the switch.
     */
    private const MAP = [
        'App\\Models\\Query' => 'query',
        'App\\Models\\Manuscript' => 'manuscript',
        'App\\Models\\Agent' => 'agent',
    ];

    public function up(): void
    {
        foreach (self::MAP as $class => $alias) {
            DB::table('reminders')
                ->where('remindable_type', $class)
                ->update(['remindable_type' => $alias]);
        }
    }

    public function down(): void
    {
        foreach (self::MAP as $class => $alias) {
            DB::table('reminders')
                ->where('remindable_type', $alias)
                ->update(['remindable_type' => $class]);
        }
    }
};
