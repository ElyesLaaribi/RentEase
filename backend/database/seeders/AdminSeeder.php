<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Seed admin users into the database.
     */
    public function run(): void
    {
        $admins = [
            [
                'name'     => 'Super Admin',
                'email'    => 'admin@rentease.com',
                'password' => Hash::make('password'),
                'role'     => 'admin',
            ],
            // Add more admins here if needed:
            // [
            //     'name'     => 'Another Admin',
            //     'email'    => 'admin2@rentease.com',
            //     'password' => Hash::make('securepassword'),
            //     'role'     => 'admin',
            // ],
        ];

        foreach ($admins as $admin) {
            Admin::updateOrCreate(
                ['email' => $admin['email']],  // prevent duplicates
                $admin
            );
        }
    }
}
