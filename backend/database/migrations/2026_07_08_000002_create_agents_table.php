<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agency_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('title')->nullable();
            $table->boolean('open_to_queries')->default(true);
            $table->jsonb('genres')->nullable();
            $table->text('mswl')->nullable();
            $table->string('submission_method')->nullable();
            $table->text('guidelines')->nullable();
            $table->unsignedSmallInteger('response_window_days')->nullable();
            $table->jsonb('links')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'open_to_queries']);
        });

        // GIN index for fast containment queries on genres,
        // e.g. WHERE genres @> '["literary noir"]'
        DB::statement('CREATE INDEX agents_genres_gin_index ON agents USING GIN (genres)');
    }

    public function down(): void
    {
        Schema::dropIfExists('agents');
    }
};
