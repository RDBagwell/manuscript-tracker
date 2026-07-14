<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('manuscript_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('queued');
            $table->text('personalization')->nullable();
            $table->text('materials')->nullable();
            $table->unsignedSmallInteger('wave')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            // One thread per manuscript-agent pair; an R&R lives inside
            // the same record as events. Relax this if re-querying after
            // a major revision ever becomes a real workflow.
            $table->unique(['manuscript_id', 'agent_id']);
            $table->index(['user_id', 'status']);
            $table->index(['agent_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queries');
    }
};
