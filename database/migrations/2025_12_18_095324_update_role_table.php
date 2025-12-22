<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->change();
        });

        DB::table('users')
            ->whereIn('role', ['pembeli', 'penyedia_barang', 'penyedia_pembiayaan'])
            ->update(['role' => 'Assistant Area Manager']);

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['Assistant Area Manager', 'Field Assistant'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->change();
        });

        DB::table('users')
            ->whereIn('role', ['Assistant Area Manager', 'Field Assistant'])
            ->update(['role' => 'pembeli']);

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['pembeli', 'penyedia_barang', 'penyedia_pembiayaan'])->change();
        });
    }
};
