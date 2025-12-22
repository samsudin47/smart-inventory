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
        Schema::table('stock_tersedia', function (Blueprint $table) {
            // Make tanggal fields nullable
            $table->date('tanggal_masuk')->nullable()->change();
            $table->date('tanggal_keluar')->nullable()->change();
            
            // Add check constraints for quantity values (MySQL doesn't support check constraints directly, 
            // but we'll add them via raw SQL for databases that support it)
            // For MySQL, we'll rely on application-level validation
        });

        // For databases that support check constraints (PostgreSQL, SQL Server)
        if (config('database.default') !== 'mysql') {
            DB::statement('ALTER TABLE stock_tersedia ADD CONSTRAINT chk_quantity_masuk_non_negative CHECK (quantity_masuk >= 0)');
            DB::statement('ALTER TABLE stock_tersedia ADD CONSTRAINT chk_quantity_keluar_non_negative CHECK (quantity_keluar >= 0)');
            DB::statement('ALTER TABLE stock_tersedia ADD CONSTRAINT chk_quantity_tersedia_non_negative CHECK (quantity_tersedia >= 0)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove check constraints if they exist
        if (config('database.default') !== 'mysql') {
            try {
                DB::statement('ALTER TABLE stock_tersedia DROP CONSTRAINT IF EXISTS chk_quantity_masuk_non_negative');
                DB::statement('ALTER TABLE stock_tersedia DROP CONSTRAINT IF EXISTS chk_quantity_keluar_non_negative');
                DB::statement('ALTER TABLE stock_tersedia DROP CONSTRAINT IF EXISTS chk_quantity_tersedia_non_negative');
            } catch (\Exception $e) {
                // Ignore if constraints don't exist
            }
        }

        Schema::table('stock_tersedia', function (Blueprint $table) {
            // Revert to non-nullable (but this might fail if there are null values)
            $table->date('tanggal_masuk')->nullable(false)->change();
            $table->date('tanggal_keluar')->nullable(false)->change();
        });
    }
};
