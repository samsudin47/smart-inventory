<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockKeluar;
use App\Models\StockMasuk;
use App\Models\StockTersedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardPenjualanController extends Controller
{
    /**
     * API: Get product sales ranking data
     *
     * Query parameters:
     * - month: Filter by month (format: Y-m, e.g., 2025-12). If not provided, uses current month
     * - year: Filter by year (format: Y, e.g., 2025). If not provided, uses current year
     * - category: Filter by category (optional, if category field exists)
     * - limit: Limit number of results (default: 100)
     */
    public function apiGetProductRanking(Request $request): JsonResponse
    {
        // Get filter parameters
        $month = $request->input('month'); // Format: Y-m (e.g., 2025-12)
        $year = $request->input('year'); // Format: Y (e.g., 2025)
        $category = $request->input('category'); // Optional category filter
        $limit = (int) $request->input('limit', 100);

        // If month is provided, parse it; otherwise use current month
        if ($month) {
            try {
                $date = Carbon::createFromFormat('Y-m', $month);
                $startDate = $date->copy()->startOfMonth();
                $endDate = $date->copy()->endOfMonth();
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format bulan tidak valid. Gunakan format Y-m (contoh: 2025-12)'
                ], 400);
            }
        } elseif ($year) {
            // If only year is provided, get data for the entire year
            try {
                $date = Carbon::createFromFormat('Y', $year);
                $startDate = $date->copy()->startOfYear();
                $endDate = $date->copy()->endOfYear();
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format tahun tidak valid. Gunakan format Y (contoh: 2025)'
                ], 400);
            }
        } else {
            // Default to current month
            $startDate = Carbon::now()->startOfMonth();
            $endDate = Carbon::now()->endOfMonth();
        }

        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        $userId = Auth::id();
        $userRole = Auth::user()->role;

        // Get product sales data grouped by product
        $productSalesQuery = StockKeluar::notDeleted()
            ->whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);

        // Field Assistant hanya melihat data mereka sendiri
        if ($userRole === 'Field Assistant') {
            $productSalesQuery->where('user_id', $userId);
        }

        $productSales = $productSalesQuery
            ->select(
                'product_id',
                DB::raw('SUM(quantity) as total_qty_terjual'),
                DB::raw('COUNT(*) as total_transaksi')
            )
            ->groupBy('product_id')
            ->orderByDesc('total_qty_terjual')
            ->limit($limit)
            ->get();

        // Get all products with their stock data
        $products = Product::notDeleted()
            ->with(['creator', 'updater'])
            ->get()
            ->keyBy('id');

        // Calculate stock data for each product
        $result = $productSales->map(function ($sale) use ($products, $startDate, $endDate, $userRole, $userId) {
            $product = $products->get($sale->product_id);

            if (!$product) {
                return null;
            }

            // Get total stock masuk for the period
            $stockMasukQuery = StockMasuk::notDeleted()
                ->where('product_id', $sale->product_id)
                ->whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);

            // Field Assistant hanya melihat data mereka sendiri
            if ($userRole === 'Field Assistant') {
                $stockMasukQuery->where('user_id', $userId);
            }

            $totalStockMasuk = $stockMasukQuery->sum('quantity');

            // Get total stock keluar for the period (already have this from $sale->total_qty_terjual)
            $totalQtyTerjual = (int) $sale->total_qty_terjual;

            // Get current stock tersedia
            // Field Assistant: hitung dari stock masuk dan keluar mereka sendiri
            // Assistant Area Manager: hitung dari semua data
            if ($userRole === 'Field Assistant') {
                $totalMasukUser = StockMasuk::notDeleted()
                    ->where('user_id', $userId)
                    ->where('product_id', $sale->product_id)
                    ->sum('quantity');
                
                $totalKeluarUser = StockKeluar::notDeleted()
                    ->where('user_id', $userId)
                    ->where('product_id', $sale->product_id)
                    ->sum('quantity');
                
                $currentStockTersedia = max(0, $totalMasukUser - $totalKeluarUser);
            } else {
                // Assistant Area Manager: hitung dari stock_tersedia table
                $currentStockTersedia = StockTersedia::notDeleted()
                    ->where('product_id', $sale->product_id)
                    ->sum('quantity_tersedia');
            }

            // Calculate percentage based on stock masuk
            // Percentage = (qty terjual / stock masuk) * 100
            $persentase = 0;
            if ($totalStockMasuk > 0) {
                $persentase = round(($totalQtyTerjual / $totalStockMasuk) * 100, 2);
            }

            // Calculate percentage change compared to previous period
            $previousStartDate = $startDate->copy()->subMonth()->startOfMonth();
            $previousEndDate = $startDate->copy()->subMonth()->endOfMonth();

            $previousQtyQuery = StockKeluar::notDeleted()
                ->where('product_id', $sale->product_id)
                ->whereBetween('tanggal', [$previousStartDate->format('Y-m-d'), $previousEndDate->format('Y-m-d')]);

            // Field Assistant hanya melihat data mereka sendiri
            if ($userRole === 'Field Assistant') {
                $previousQtyQuery->where('user_id', $userId);
            }

            $previousQtyTerjual = $previousQtyQuery->sum('quantity');

            $persentasePerubahan = 0;
            if ($previousQtyTerjual > 0) {
                $persentasePerubahan = round((($totalQtyTerjual - $previousQtyTerjual) / $previousQtyTerjual) * 100, 2);
            } elseif ($totalQtyTerjual > 0 && $previousQtyTerjual == 0) {
                $persentasePerubahan = 100; // New sales
            }

            return [
                'product_id' => $product->id,
                'product' => [
                    'id' => $product->id,
                    'nama' => $product->nama,
                    'kemasan' => $product->kemasan,
                    'satuan' => $product->satuan,
                ],
                'qty_terjual' => $totalQtyTerjual,
                'total_transaksi' => (int) $sale->total_transaksi,
                'stock_masuk_periode' => (int) $totalStockMasuk,
                'stock_tersedia_sekarang' => (int) $currentStockTersedia,
                'persentase' => $persentase,
                'persentase_perubahan' => $persentasePerubahan,
                'periode' => [
                    'start' => $startDate->format('Y-m-d'),
                    'end' => $endDate->format('Y-m-d'),
                    'month' => $startDate->format('Y-m'),
                    'year' => $startDate->format('Y'),
                ],
            ];
        })->filter()->values();

        return response()->json([
            'success' => true,
            'data' => $result,
            'meta' => [
                'periode' => [
                    'start' => $startDate->format('Y-m-d'),
                    'end' => $endDate->format('Y-m-d'),
                    'month' => $startDate->format('Y-m'),
                    'year' => $startDate->format('Y'),
                    'month_name' => $startDate->format('F Y'),
                ],
                'total_products' => $result->count(),
                'total_qty_terjual' => $result->sum('qty_terjual'),
            ],
            'message' => 'Data ranking produk berhasil diambil.'
        ]);
    }

    /**
     * API: Get product sales data grouped by month
     * Returns sales data for multiple months
     */
    public function apiGetProductSalesByMonth(Request $request): JsonResponse
    {
        $year = $request->input('year', Carbon::now()->year);
        $productId = $request->input('product_id'); // Optional: filter by specific product

        try {
            $startDate = Carbon::createFromFormat('Y', $year)->startOfYear();
            $endDate = Carbon::createFromFormat('Y', $year)->endOfYear();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Format tahun tidak valid.'
            ], 400);
        }

        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        $userId = Auth::id();
        $userRole = Auth::user()->role;

        $query = StockKeluar::notDeleted()
            ->whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);

        // Field Assistant hanya melihat data mereka sendiri
        if ($userRole === 'Field Assistant') {
            $query->where('user_id', $userId);
        }

        if ($productId) {
            $query->where('product_id', $productId);
        }

        $monthlySales = $query
            ->select(
                DB::raw('YEAR(tanggal) as year'),
                DB::raw('MONTH(tanggal) as month'),
                DB::raw('DATE_FORMAT(tanggal, "%Y-%m") as month_key'),
                'product_id',
                DB::raw('SUM(quantity) as total_qty_terjual'),
                DB::raw('COUNT(*) as total_transaksi')
            )
            ->groupBy('year', 'month', 'month_key', 'product_id')
            ->orderBy('year')
            ->orderBy('month')
            ->get();

        // Get products
        $products = Product::notDeleted()->get()->keyBy('id');

        $result = $monthlySales->map(function ($sale) use ($products, $userId, $userRole) {
            $product = $products->get($sale->product_id);

            if (!$product) {
                return null;
            }

            // Get stock masuk for this month
            $monthStart = Carbon::createFromFormat('Y-m', $sale->month_key)->startOfMonth();
            $monthEnd = Carbon::createFromFormat('Y-m', $sale->month_key)->endOfMonth();

            $stockMasukQuery = StockMasuk::notDeleted()
                ->where('product_id', $sale->product_id)
                ->whereBetween('tanggal', [$monthStart->format('Y-m-d'), $monthEnd->format('Y-m-d')]);

            // Field Assistant hanya melihat data mereka sendiri
            if ($userRole === 'Field Assistant') {
                $stockMasukQuery->where('user_id', $userId);
            }

            $totalStockMasuk = $stockMasukQuery->sum('quantity');

            $totalQtyTerjual = (int) $sale->total_qty_terjual;
            $persentase = 0;
            if ($totalStockMasuk > 0) {
                $persentase = round(($totalQtyTerjual / $totalStockMasuk) * 100, 2);
            }

            return [
                'product_id' => $product->id,
                'product' => [
                    'id' => $product->id,
                    'nama' => $product->nama,
                    'kemasan' => $product->kemasan,
                    'satuan' => $product->satuan,
                ],
                'month' => $sale->month_key,
                'month_name' => Carbon::createFromFormat('Y-m', $sale->month_key)->format('F Y'),
                'qty_terjual' => $totalQtyTerjual,
                'total_transaksi' => (int) $sale->total_transaksi,
                'stock_masuk' => (int) $totalStockMasuk,
                'persentase' => $persentase,
            ];
        })->filter()->values();

        return response()->json([
            'success' => true,
            'data' => $result,
            'meta' => [
                'year' => $year,
                'total_months' => $result->groupBy('month')->count(),
            ],
            'message' => 'Data penjualan per bulan berhasil diambil.'
        ]);
    }

    /**
     * API: Get summary statistics for sales dashboard
     */
    public function apiGetSummary(Request $request): JsonResponse
    {
        $month = $request->input('month');
        $year = $request->input('year');

        if ($month) {
            try {
                $date = Carbon::createFromFormat('Y-m', $month);
                $startDate = $date->copy()->startOfMonth();
                $endDate = $date->copy()->endOfMonth();
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format bulan tidak valid.'
                ], 400);
            }
        } elseif ($year) {
            try {
                $date = Carbon::createFromFormat('Y', $year);
                $startDate = $date->copy()->startOfYear();
                $endDate = $date->copy()->endOfYear();
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format tahun tidak valid.'
                ], 400);
            }
        } else {
            $startDate = Carbon::now()->startOfMonth();
            $endDate = Carbon::now()->endOfMonth();
        }

        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        $userId = Auth::id();
        $userRole = Auth::user()->role;

        // Total products sold
        $totalProductsQuery = StockKeluar::notDeleted()
            ->whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);

        // Total quantity sold
        $totalQtyQuery = StockKeluar::notDeleted()
            ->whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);

        // Total transactions
        $totalTransaksiQuery = StockKeluar::notDeleted()
            ->whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);

        // Total stock masuk
        $totalStockMasukQuery = StockMasuk::notDeleted()
            ->whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);

        // Field Assistant hanya melihat data mereka sendiri
        if ($userRole === 'Field Assistant') {
            $totalProductsQuery->where('user_id', $userId);
            $totalQtyQuery->where('user_id', $userId);
            $totalTransaksiQuery->where('user_id', $userId);
            $totalStockMasukQuery->where('user_id', $userId);
        }

        $totalProductsSold = $totalProductsQuery->distinct('product_id')->count('product_id');
        $totalQtyTerjual = $totalQtyQuery->sum('quantity');
        $totalTransaksi = $totalTransaksiQuery->count();
        $totalStockMasuk = $totalStockMasukQuery->sum('quantity');

        // Overall percentage
        $overallPersentase = 0;
        if ($totalStockMasuk > 0) {
            $overallPersentase = round(($totalQtyTerjual / $totalStockMasuk) * 100, 2);
        }

        // Previous period comparison
        $previousStartDate = $startDate->copy()->subMonth()->startOfMonth();
        $previousEndDate = $startDate->copy()->subMonth()->endOfMonth();

        $previousQtyQuery = StockKeluar::notDeleted()
            ->whereBetween('tanggal', [$previousStartDate->format('Y-m-d'), $previousEndDate->format('Y-m-d')]);

        // Field Assistant hanya melihat data mereka sendiri
        if ($userRole === 'Field Assistant') {
            $previousQtyQuery->where('user_id', $userId);
        }

        $previousQtyTerjual = $previousQtyQuery->sum('quantity');

        $persentasePerubahan = 0;
        if ($previousQtyTerjual > 0) {
            $persentasePerubahan = round((($totalQtyTerjual - $previousQtyTerjual) / $previousQtyTerjual) * 100, 2);
        } elseif ($totalQtyTerjual > 0 && $previousQtyTerjual == 0) {
            $persentasePerubahan = 100;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_products_sold' => $totalProductsSold,
                'total_qty_terjual' => (int) $totalQtyTerjual,
                'total_transaksi' => $totalTransaksi,
                'total_stock_masuk' => (int) $totalStockMasuk,
                'overall_persentase' => $overallPersentase,
                'persentase_perubahan' => $persentasePerubahan,
                'periode' => [
                    'start' => $startDate->format('Y-m-d'),
                    'end' => $endDate->format('Y-m-d'),
                    'month' => $startDate->format('Y-m'),
                    'year' => $startDate->format('Y'),
                    'month_name' => $startDate->format('F Y'),
                ],
            ],
            'message' => 'Data summary berhasil diambil.'
        ]);
    }
}

