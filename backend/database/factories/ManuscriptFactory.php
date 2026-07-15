<?php

namespace Database\Factories;

use App\Enums\ManuscriptCategory;
use App\Enums\ManuscriptStatus;
use App\Models\Manuscript;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Manuscript>
 */
class ManuscriptFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => mb_strtoupper(fake()->unique()->words(2, true)),
            'genre' => fake()->randomElement(['Literary noir', 'Techno-thriller', 'Literary speculative', 'Fantasy']),
            'category' => ManuscriptCategory::Adult,
            'word_count' => fake()->numberBetween(20000, 120000),
            'status' => ManuscriptStatus::Querying,
            'pitch' => fake()->sentence(12),
        ];
    }
}
