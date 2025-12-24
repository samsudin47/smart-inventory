<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }
    return app(AuthenticatedSessionController::class)->create(request());
})->name('home');

// Route untuk serve gambar stock masuk (harus didefinisikan SEBELUM route umum /storage/{path})
// Route ini diakses melalui Laravel untuk menghindari 403 dari web server
Route::get('/storage/stock_masuk/nota/{filename}', function ($filename) {
    // Security: sanitize filename to prevent directory traversal
    $filename = basename($filename);
    
    $filePath = storage_path('app/public/stock_masuk/nota/' . $filename);

    // Security: prevent directory traversal
    $realPath = realpath($filePath);
    $storagePath = realpath(storage_path('app/public/stock_masuk/nota'));
    if (!$realPath || !$storagePath || strpos($realPath, $storagePath) !== 0) {
        abort(403, 'Access denied');
    }

    if (!file_exists($filePath) || !is_file($filePath)) {
        abort(404, 'File not found');
    }

    $file = file_get_contents($filePath);
    $mimeType = mime_content_type($filePath) ?: 'image/jpeg';

    return response($file, 200)
        ->header('Content-Type', $mimeType)
        ->header('Cache-Control', 'public, max-age=31536000')
        ->header('Content-Disposition', 'inline; filename="' . $filename . '"');
})->name('storage.stock-masuk.nota');

// Route untuk serve file storage jika symbolic link tidak bisa dibuat
// Fallback untuk hosting yang tidak support exec() atau symlink
Route::get('/storage/{path}', function ($path) {
    $filePath = storage_path('app/public/' . $path);

    if (!file_exists($filePath)) {
        abort(404);
    }

    // Security: prevent directory traversal
    $realPath = realpath($filePath);
    $storagePath = realpath(storage_path('app/public'));
    if (!$realPath || strpos($realPath, $storagePath) !== 0) {
        abort(403);
    }

    $file = file_get_contents($filePath);
    $mimeType = mime_content_type($filePath);

    return response($file, 200)
        ->header('Content-Type', $mimeType)
        ->header('Cache-Control', 'public, max-age=31536000');
})->where('path', '.*')->name('storage.serve');

// Rute untuk halaman unauthorized
Route::get('/unauthorized', function () {
    return Inertia::render('unauthorized');
})->name('unauthorized');

Route::middleware(['auth', 'verified'])->group(function () {

    // Redirect ke dashboard sesuai role
    Route::get('dashboard', function () {
        $user = Auth::user();

        switch ($user->role) {
            case 'Assistant Area Manager':
                return redirect()->route('dashboard.assistant_area_manager');
            case 'Field Assistant':
                return redirect()->route('dashboard.stok');
            default:
                return Inertia::render('dashboard');
        }
    })->name('dashboard');

    // Dashboard untuk Assistant Area Manager
    Route::get('dashboard/assistant-area-manager', function () {
        return Inertia::render('dashboard/assistant-area-manager', [
            'user' => Auth::user()
        ]);
    })->middleware('role:Assistant Area Manager')->name('dashboard.assistant_area_manager');

    // Dashboard Penjualan (Dashboard Stock)
    Route::get('dashboard/penjualan', function () {
        return Inertia::render('dashboard/dashboard-penjualan', [
            'user' => Auth::user()
        ]);
    })->middleware('role:Field Assistant,Assistant Area Manager')->name('dashboard.penjualan');

    // Presentation Report (Grafik Presentasi)
    Route::get('dashboard/presentation-report', function () {
        return Inertia::render('dashboard/presentation-report', [
            'user' => Auth::user()
        ]);
    })->middleware('role:Field Assistant,Assistant Area Manager')->name('dashboard.presentation_report');

    // Menu Stok
    Route::get('dashboard/stok', function () {
        return Inertia::render('dashboard/stok', [
            'user' => Auth::user()
        ]);
    })->middleware('role:Field Assistant')->name('dashboard.stok');

    // Stock Masuk
    Route::get('dashboard/stok/masuk', [App\Http\Controllers\StockMasukController::class, 'index'])
        ->middleware('role:Field Assistant,Assistant Area Manager')
        ->name('dashboard.stok.masuk');

    // Stock Keluar
    Route::get('dashboard/stok/keluar', [App\Http\Controllers\StockKeluarController::class, 'index'])
        ->middleware('role:Field Assistant,Assistant Area Manager')
        ->name('dashboard.stok.keluar');

    // Stok Tersedia
    Route::get('dashboard/stok/tersedia', [App\Http\Controllers\StockTersediaController::class, 'index'])
        ->middleware('role:Field Assistant,Assistant Area Manager')
        ->name('dashboard.stok.tersedia');

    // Master Data - Data Petugas (hanya Assistant Area Manager)
    Route::get('dashboard/master-data/petugas', function () {
        return Inertia::render('dashboard/master-data/data-petugas', [
            'user' => Auth::user()
        ]);
    })->middleware('role:Assistant Area Manager')->name('dashboard.master-data.petugas');

    // Master Data - Data Kios
    Route::get('dashboard/master-data/kios', function () {
        return Inertia::render('dashboard/master-data/data-kios', [
            'user' => Auth::user()
        ]);
    })->middleware('role:Field Assistant,Assistant Area Manager')->name('dashboard.master-data.kios');

    // Master Data - Data Produk
    Route::get('dashboard/master-data/produk', function () {
        return Inertia::render('dashboard/master-data/data-produk', [
            'user' => Auth::user()
        ]);
    })->middleware('role:Field Assistant,Assistant Area Manager')->name('dashboard.master-data.produk');

    // API Routes untuk Kios
    Route::prefix('api')->middleware('role:Field Assistant,Assistant Area Manager')->group(function () {
        Route::get('/kios', [App\Http\Controllers\KiosController::class, 'apiIndex'])->name('api.kios.index');
        Route::get('/kios/{kios}', [App\Http\Controllers\KiosController::class, 'apiShow'])->name('api.kios.show');
        Route::post('/kios', [App\Http\Controllers\KiosController::class, 'apiStore'])->name('api.kios.store');
        Route::put('/kios/{kios}', [App\Http\Controllers\KiosController::class, 'apiUpdate'])->name('api.kios.update');
        Route::delete('/kios/{kios}', [App\Http\Controllers\KiosController::class, 'apiDestroy'])->name('api.kios.destroy');

        // API Routes untuk Product
        Route::get('/product', [App\Http\Controllers\ProductController::class, 'apiIndex'])->name('api.product.index');
        Route::get('/product/{product}', [App\Http\Controllers\ProductController::class, 'apiShow'])->name('api.product.show');
        Route::post('/product', [App\Http\Controllers\ProductController::class, 'apiStore'])->name('api.product.store');
        Route::put('/product/{product}', [App\Http\Controllers\ProductController::class, 'apiUpdate'])->name('api.product.update');
        Route::delete('/product/{product}', [App\Http\Controllers\ProductController::class, 'apiDestroy'])->name('api.product.destroy');

        // API Routes untuk Petugas (Users) - hanya Assistant Area Manager
        Route::middleware('role:Assistant Area Manager')->group(function () {
            Route::get('/petugas', [App\Http\Controllers\PetugasController::class, 'apiIndex'])->name('api.petugas.index');
            Route::get('/petugas/{user}', [App\Http\Controllers\PetugasController::class, 'apiShow'])->name('api.petugas.show');
        });

        // API Route untuk dropdown users (bisa diakses oleh Field Assistant dan Assistant Area Manager)
        Route::get('/petugas/dropdown', [App\Http\Controllers\PetugasController::class, 'apiForDropdown'])->name('api.petugas.dropdown');

        // API Routes untuk Stock Masuk
        Route::get('/stock-masuk', [App\Http\Controllers\StockMasukController::class, 'apiIndex'])->name('api.stock-masuk.index');
        Route::get('/stock-masuk/download', [App\Http\Controllers\StockMasukController::class, 'apiDownload'])->name('api.stock-masuk.download');
        Route::get('/stock-masuk/{stockMasuk}', [App\Http\Controllers\StockMasukController::class, 'apiShow'])->name('api.stock-masuk.show');
        Route::post('/stock-masuk', [App\Http\Controllers\StockMasukController::class, 'apiStore'])->name('api.stock-masuk.store');
        Route::put('/stock-masuk/{stockMasuk}', [App\Http\Controllers\StockMasukController::class, 'apiUpdate'])->name('api.stock-masuk.update');
        Route::delete('/stock-masuk/{stockMasuk}', [App\Http\Controllers\StockMasukController::class, 'apiDestroy'])->name('api.stock-masuk.destroy');

        // API Routes untuk Stock Keluar
        Route::get('/stock-keluar', [App\Http\Controllers\StockKeluarController::class, 'apiIndex'])->name('api.stock-keluar.index');
        Route::get('/stock-keluar/download', [App\Http\Controllers\StockKeluarController::class, 'apiDownload'])->name('api.stock-keluar.download');
        Route::get('/stock-keluar/{stockKeluar}', [App\Http\Controllers\StockKeluarController::class, 'apiShow'])->name('api.stock-keluar.show');
        Route::post('/stock-keluar', [App\Http\Controllers\StockKeluarController::class, 'apiStore'])->name('api.stock-keluar.store');
        Route::put('/stock-keluar/{stockKeluar}', [App\Http\Controllers\StockKeluarController::class, 'apiUpdate'])->name('api.stock-keluar.update');
        Route::delete('/stock-keluar/{stockKeluar}', [App\Http\Controllers\StockKeluarController::class, 'apiDestroy'])->name('api.stock-keluar.destroy');

        // API Routes untuk Stock Tersedia (read-only, no edit/delete)
        Route::get('/stock-tersedia', [App\Http\Controllers\StockTersediaController::class, 'apiIndex'])->name('api.stock-tersedia.index');
        Route::get('/stock-tersedia/download', [App\Http\Controllers\StockTersediaController::class, 'apiDownload'])->name('api.stock-tersedia.download');
        Route::get('/stock-tersedia/show', [App\Http\Controllers\StockTersediaController::class, 'apiShow'])->name('api.stock-tersedia.show');
    });

    // API Routes untuk Dashboard Penjualan (Dashboard Stock)
    Route::prefix('api')->middleware('role:Field Assistant,Assistant Area Manager')->group(function () {
        Route::get('/dashboard-penjualan/product-ranking', [App\Http\Controllers\DashboardPenjualanController::class, 'apiGetProductRanking'])->name('api.dashboard-penjualan.product-ranking');
        Route::get('/dashboard-penjualan/product-sales-by-month', [App\Http\Controllers\DashboardPenjualanController::class, 'apiGetProductSalesByMonth'])->name('api.dashboard-penjualan.product-sales-by-month');
        Route::get('/dashboard-penjualan/summary', [App\Http\Controllers\DashboardPenjualanController::class, 'apiGetSummary'])->name('api.dashboard-penjualan.summary');

        // API Routes untuk Presentation Report (Grafik Presentasi)
        Route::get('/presentation-report', [App\Http\Controllers\PresentationReportController::class, 'apiGetReport'])->name('api.presentation-report.report');
        Route::get('/presentation-report/summary', [App\Http\Controllers\PresentationReportController::class, 'apiGetSummary'])->name('api.presentation-report.summary');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
