<?php

namespace Database\Seeders;

use App\Models\QtyKemasan;
use Illuminate\Database\Seeder;

class QtyKemasanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $qtyKemasan = [50, 100, 200, 250, 400, 500, 800, 1000];

        foreach ($qtyKemasan as $qty) {
            QtyKemasan::updateOrCreate(
                ['qty_kemasan' => $qty],
                ['is_deleted' => false]
            );
        }
    }
}

