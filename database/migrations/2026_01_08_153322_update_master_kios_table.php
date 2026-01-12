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
        Schema::table('master_kios', function (Blueprint $table) {
            $table->string('desa')->nullable()->after('nama');
            $table->string('kecamatan')->nullable()->after('desa');
            $table->string('kabupaten')->nullable()->after('kecamatan');
            $table->string('nama_pemilik')->nullable()->after('kabupaten');
            $table->string('no_hp')->nullable()->after('nama_pemilik');

            // Only add cluster_kios if it doesn't exist
            if (!Schema::hasColumn('master_kios', 'cluster_kios')) {
                $table->enum('cluster_kios', ['aktif', 'tidak_aktif'])->default('aktif')->nullable()->after('no_hp');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('master_kios', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });
    }
};
