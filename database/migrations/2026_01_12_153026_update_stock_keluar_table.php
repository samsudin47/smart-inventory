<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_keluar', function (Blueprint $table) {
            $table->integer('qty_kemasan_id')->after('product_id')->before('quantity');
            $table->string('liter_or_kg')->nullable()->after('quantity')->before('tanggal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_keluar', function (Blueprint $table) {
            $table->dropColumn('qty_kemasan_id');
            $table->dropColumn('liter_or_kg');
        });
    }
};
