<?php

namespace Database\Factories;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Agency>
 */
class AgencyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->unique()->company().' Literary',
            'website' => fake()->url(),
            'one_no_means_all_no' => false,
        ];
    }

    public function oneNoMeansAllNo(): static
    {
        return $this->state(fn () => ['one_no_means_all_no' => true]);
    }
}
