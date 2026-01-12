<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Convert enum to VARCHAR temporarily to avoid data conflicts
        Schema::table('master_kios', function (Blueprint $table) {
            $table->string('cluster_kios', 20)->nullable()->change();
        });

        // Step 2: Update existing data: convert 'aktif' to 'R1', 'tidak_aktif' to NULL
        DB::table('master_kios')
            ->where('cluster_kios', 'aktif')
            ->update(['cluster_kios' => 'R1']);

        DB::table('master_kios')
            ->where('cluster_kios', 'tidak_aktif')
            ->update(['cluster_kios' => null]);

        // Step 3: Convert back to enum with new values
        Schema::table('master_kios', function (Blueprint $table) {
            $table->enum('cluster_kios', ['R1', 'R2', 'R3'])->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Step 1: Convert enum to VARCHAR temporarily
        Schema::table('master_kios', function (Blueprint $table) {
            $table->string('cluster_kios', 20)->nullable()->change();
        });

        // Step 2: Convert R1, R2, R3 back to aktif, set others to tidak_aktif
        DB::table('master_kios')
            ->whereIn('cluster_kios', ['R1', 'R2', 'R3'])
            ->update(['cluster_kios' => 'aktif']);

        DB::table('master_kios')
            ->whereNull('cluster_kios')
            ->update(['cluster_kios' => 'tidak_aktif']);

        // Step 3: Revert enum back to old values
        Schema::table('master_kios', function (Blueprint $table) {
            $table->enum('cluster_kios', ['aktif', 'tidak_aktif'])->nullable()->default('aktif')->change();
        });
    }
};
