<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('query_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('query_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->timestamp('happened_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['query_id', 'happened_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('query_events');
    }
};
