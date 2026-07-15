<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Agent>
 */
class AgentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'agency_id' => null,
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'open_to_queries' => true,
            'genres' => fake()->randomElements(
                ['literary fiction', 'noir', 'thriller', 'speculative', 'fantasy', 'horror'],
                2,
            ),
        ];
    }
}
