<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\Manuscript;
use App\Models\Query;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Query>
 */
class QueryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'manuscript_id' => Manuscript::factory(),
            'agent_id' => Agent::factory(),
            'wave' => 1,
        ];
    }
}
