<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */

    protected static $index = 0;
    public function definition(): array
    {
        $categories = [
            'Véhicules',
            'Outils de bricolage',
            'Matériel de camping',
            'Électronique / Multimédia',
            'Événementiel',
            'Entretien / Nettoyage',
            'Sports & Loisirs',
            'test',
        ];

        return [
            'cat_title' => $categories[self::$index++ % count($categories)],
        ];
    }
}
