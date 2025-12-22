<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockKeluar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class PresentationReportController extends Controller
{
    /**
     * API: Get presentation report data
     * 
     * Query parameters:
     * - type: 'penjualan' or 'stok_keluar' (default: 'penjualan')
     * - period: '30_hari_sebelumnya', 'per_hari', 'per_minggu', 'per_bulan' (default: '30_hari_sebelumnya')
     * - product_id: Optional filter by specific product
     * - kios_id: Optional filter by specific kios
     * - start_date: Optional custom start date (format: Y-m-d)
     * - end_date: Optional custom end date (format: Y-m-d)
     */
    public function apiGetReport(Request $request): JsonResponse
    {
        $type = $request->input('type', 'penjualan'); // 'penjualan' or 'stok_keluar'
        $period = $request->input('period', '30_hari_sebelumnya');
        $productId = $request->input('product_id');
        $kiosId = $request->input('kios_id');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        // Validate type
        if (!in_array($type, ['penjualan', 'stok_keluar'])) {
            return response()->json([
                'success' => false,
                'message' => 'Tipe data tidak valid. Gunakan "penjualan" atau "stok_keluar".'
            ], 400);
        }

        // Validate period
        if (!in_array($period, ['30_hari_sebelumnya', 'per_hari', 'per_minggu', 'per_bulan'])) {
            return response()->json([
                'success' => false,
                'message' => 'Periode tidak valid. Gunakan "30_hari_sebelumnya", "per_hari", "per_minggu", atau "per_bulan".'
            ], 400);
        }

        // Calculate date range based on period
        $dateRange = $this->calculateDateRange($period, $startDate, $endDate);
        if (!$dateRange) {
            return response()->json([
                'success' => false,
                'message' => 'Periode atau tanggal tidak valid.'
            ], 400);
        }

        // Get data based on type
        if ($type === 'penjualan') {
            $data = $this->getPenjualanData($dateRange, $period, $productId, $kiosId);
        } else {
            $data = $this->getStokKeluarData($dateRange, $period, $productId, $kiosId);
        }

        return response()->json([
            'success' => true,
            'data' => $data['data'],
            'meta' => [
                'type' => $type,
                'period' => $period,
                'date_range' => [
                    'start' => $dateRange['start']->format('Y-m-d'),
                    'end' => $dateRange['end']->format('Y-m-d'),
                    'start_formatted' => $dateRange['start']->format('d M Y'),
                    'end_formatted' => $dateRange['end']->format('d M Y'),
                ],
                'total_records' => count($data['data']),
                'total_quantity' => $data['total_quantity'],
                'total_transactions' => $data['total_transactions'],
                'filters' => [
                    'product_id' => $productId,
                    'kios_id' => $kiosId,
                ],
            ],
            'message' => 'Data laporan berhasil diambil.'
        ]);
    }

    /**
     * Calculate date range based on period
     */
    private function calculateDateRange(string $period, ?string $startDate = null, ?string $endDate = null): ?array
    {
        $now = Carbon::now();

        switch ($period) {
            case '30_hari_sebelumnya':
                // Last 30 days from today
                $end = $now->copy();
                $start = $now->copy()->subDays(29); // 29 days ago to include today (30 days total)
                break;

            case 'per_hari':
                // If custom dates provided, use them; otherwise use current month
                if ($startDate && $endDate) {
                    try {
                        $start = Carbon::createFromFormat('Y-m-d', $startDate)->startOfDay();
                        $end = Carbon::createFromFormat('Y-m-d', $endDate)->endOfDay();
                    } catch (\Exception $e) {
                        return null;
                    }
                } else {
                    $start = $now->copy()->startOfMonth();
                    $end = $now->copy()->endOfMonth();
                }
                break;

            case 'per_minggu':
                // If custom dates provided, use them; otherwise use last 12 weeks
                if ($startDate && $endDate) {
                    try {
                        $start = Carbon::createFromFormat('Y-m-d', $startDate)->startOfDay();
                        $end = Carbon::createFromFormat('Y-m-d', $endDate)->endOfDay();
                    } catch (\Exception $e) {
                        return null;
                    }
                } else {
                    $end = $now->copy();
                    $start = $now->copy()->subWeeks(11)->startOfWeek(); // Last 12 weeks
                }
                break;

            case 'per_bulan':
                // If custom dates provided, use them; otherwise use last 12 months
                if ($startDate && $endDate) {
                    try {
                        $start = Carbon::createFromFormat('Y-m-d', $startDate)->startOfMonth();
                        $end = Carbon::createFromFormat('Y-m-d', $endDate)->endOfMonth();
                    } catch (\Exception $e) {
                        return null;
                    }
                } else {
                    $end = $now->copy()->endOfMonth();
                    $start = $now->copy()->subMonths(11)->startOfMonth(); // Last 12 months
                }
                break;

            default:
                return null;
        }

        return [
            'start' => $start,
            'end' => $end,
        ];
    }

    /**
     * Get penjualan (sales) data grouped by period using Eloquent
     */
    private function getPenjualanData(array $dateRange, string $period, ?int $productId = null, ?int $kiosId = null): array
    {
        $start = $dateRange['start'];
        $end = $dateRange['end'];

        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        $userId = Auth::id();
        $userRole = Auth::user()->role;

        // Build query using Eloquent
        $query = StockKeluar::notDeleted()
            ->whereDate('tanggal', '>=', $start->format('Y-m-d'))
            ->whereDate('tanggal', '<=', $end->format('Y-m-d'));

        // Field Assistant hanya melihat data mereka sendiri
        if ($userRole === 'Field Assistant') {
            $query->where('user_id', $userId);
        }

        if ($productId) {
            $query->where('product_id', $productId);
        }

        if ($kiosId) {
            $query->where('kios_id', $kiosId);
        }

        // Get all records and group using Collection
        $records = $query->get();

        // Group data based on period using Collection methods
        switch ($period) {
            case '30_hari_sebelumnya':
            case 'per_hari':
                $formattedData = $this->groupByDay($records);
                break;

            case 'per_minggu':
                $formattedData = $this->groupByWeek($records);
                break;

            case 'per_bulan':
                $formattedData = $this->groupByMonth($records);
                break;

            default:
                $formattedData = collect();
        }

        return [
            'data' => $formattedData->values(),
            'total_quantity' => $formattedData->sum('total_quantity'),
            'total_transactions' => $formattedData->sum('total_transactions'),
        ];
    }

    /**
     * Group records by day using Eloquent Collection
     */
    private function groupByDay(Collection $records): Collection
    {
        return $records
            ->groupBy(function ($record) {
                return $record->tanggal->format('Y-m-d');
            })
            ->map(function ($dayRecords, $dateKey) {
                $date = Carbon::parse($dateKey);
                return [
                    'date' => $dateKey,
                    'date_label' => $date->format('d/m'),
                    'label' => $date->format('d/m'),
                    'total_quantity' => $dayRecords->sum('quantity'),
                    'total_transactions' => $dayRecords->count(),
                ];
            })
            ->sortBy('date')
            ->values();
    }

    /**
     * Group records by week using Eloquent Collection
     */
    private function groupByWeek(Collection $records): Collection
    {
        return $records
            ->groupBy(function ($record) {
                // Group by year and week number using Carbon
                $date = Carbon::parse($record->tanggal);
                $weekNumber = $date->week;
                return $date->format('Y') . '-' . str_pad($weekNumber, 2, '0', STR_PAD_LEFT); // Year-Week number
            })
            ->map(function ($weekRecords, $weekKey) {
                $dates = $weekRecords->pluck('tanggal')->sort();
                $firstDate = Carbon::parse($dates->first());
                $lastDate = Carbon::parse($dates->last());
                
                $weekStart = $firstDate->copy()->startOfWeek();
                $weekEnd = $lastDate->copy()->endOfWeek();
                
                // Ensure week_end doesn't exceed the last date in records
                if ($weekEnd->gt($lastDate)) {
                    $weekEnd = $lastDate;
                }
                
                return [
                    'week_number' => (int) substr($weekKey, -2),
                    'week_start' => $weekStart->format('Y-m-d'),
                    'week_end' => $weekEnd->format('Y-m-d'),
                    'week_label' => $weekStart->format('d/m') . ' - ' . $weekEnd->format('d/m'),
                    'label' => $weekStart->format('d/m') . ' - ' . $weekEnd->format('d/m'),
                    'total_quantity' => $weekRecords->sum('quantity'),
                    'total_transactions' => $weekRecords->count(),
                ];
            })
            ->sortBy(function ($item) {
                return $item['week_start'];
            })
            ->values();
    }

    /**
     * Group records by month using Eloquent Collection
     */
    private function groupByMonth(Collection $records): Collection
    {
        return $records
            ->groupBy(function ($record) {
                return $record->tanggal->format('Y-m');
            })
            ->map(function ($monthRecords, $monthKey) {
                $date = Carbon::createFromFormat('Y-m', $monthKey);
                return [
                    'month' => $monthKey,
                    'month_label' => $date->format('M Y'),
                    'label' => $date->format('M Y'),
                    'total_quantity' => $monthRecords->sum('quantity'),
                    'total_transactions' => $monthRecords->count(),
                ];
            })
            ->sortBy('month')
            ->values();
    }

    /**
     * Get stok keluar (stock out) data grouped by period
     */
    private function getStokKeluarData(array $dateRange, string $period, ?int $productId = null, ?int $kiosId = null): array
    {
        // Stock keluar data is essentially the same as penjualan
        // since stock keluar represents sales/outgoing stock
        return $this->getPenjualanData($dateRange, $period, $productId, $kiosId);
    }

    /**
     * API: Get presentation report summary statistics
     * 
     * Query parameters:
     * - type: 'penjualan' or 'stok_keluar' (default: 'penjualan')
     * - period: '30_hari_sebelumnya', 'per_hari', 'per_minggu', 'per_bulan' (default: '30_hari_sebelumnya')
     * - product_id: Optional filter by specific product
     * - kios_id: Optional filter by specific kios
     */
    public function apiGetSummary(Request $request): JsonResponse
    {
        $type = $request->input('type', 'penjualan');
        $period = $request->input('period', '30_hari_sebelumnya');
        $productId = $request->input('product_id');
        $kiosId = $request->input('kios_id');

        // Validate type
        if (!in_array($type, ['penjualan', 'stok_keluar'])) {
            return response()->json([
                'success' => false,
                'message' => 'Tipe data tidak valid.'
            ], 400);
        }

        // Calculate date range
        $dateRange = $this->calculateDateRange($period);
        if (!$dateRange) {
            return response()->json([
                'success' => false,
                'message' => 'Periode tidak valid.'
            ], 400);
        }

        $start = $dateRange['start'];
        $end = $dateRange['end'];

        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        $userId = Auth::id();
        $userRole = Auth::user()->role;

        // Build query using Eloquent
        $query = StockKeluar::notDeleted()
            ->whereDate('tanggal', '>=', $start->format('Y-m-d'))
            ->whereDate('tanggal', '<=', $end->format('Y-m-d'));

        // Field Assistant hanya melihat data mereka sendiri
        if ($userRole === 'Field Assistant') {
            $query->where('user_id', $userId);
        }

        if ($productId) {
            $query->where('product_id', $productId);
        }

        if ($kiosId) {
            $query->where('kios_id', $kiosId);
        }

        // Get all records for calculations
        $records = $query->get();

        // Calculate statistics using Collection methods
        $totalQuantity = (int) $records->sum('quantity');
        $totalTransactions = $records->count();
        $averagePerTransaction = $totalTransactions > 0 ? round($totalQuantity / $totalTransactions, 2) : 0;
        $uniqueProducts = $records->pluck('product_id')->unique()->count();
        $uniqueKios = $records->pluck('kios_id')->unique()->count();

        // Get top products using Collection grouping
        $topProducts = $records
            ->groupBy('product_id')
            ->map(function ($productRecords, $productId) {
                $product = Product::notDeleted()->find($productId);
                return [
                    'product_id' => $productId,
                    'product_name' => $product ? $product->nama : 'Unknown',
                    'total_quantity' => (int) $productRecords->sum('quantity'),
                ];
            })
            ->sortByDesc('total_quantity')
            ->take(5)
            ->values();

        // Previous period comparison
        $previousEnd = $start->copy()->subDay();
        $previousStart = $this->getPreviousPeriodStart($period, $previousEnd);

        $previousQuery = StockKeluar::notDeleted()
            ->whereDate('tanggal', '>=', $previousStart->format('Y-m-d'))
            ->whereDate('tanggal', '<=', $previousEnd->format('Y-m-d'));

        // Field Assistant hanya melihat data mereka sendiri
        if ($userRole === 'Field Assistant') {
            $previousQuery->where('user_id', $userId);
        }

        if ($productId) {
            $previousQuery->where('product_id', $productId);
        }

        if ($kiosId) {
            $previousQuery->where('kios_id', $kiosId);
        }

        $previousQuantity = (int) $previousQuery->get()->sum('quantity');
        $percentageChange = 0;
        if ($previousQuantity > 0) {
            $percentageChange = round((($totalQuantity - $previousQuantity) / $previousQuantity) * 100, 2);
        } elseif ($totalQuantity > 0 && $previousQuantity == 0) {
            $percentageChange = 100;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_quantity' => $totalQuantity,
                'total_transactions' => $totalTransactions,
                'average_per_transaction' => $averagePerTransaction,
                'unique_products' => $uniqueProducts,
                'unique_kios' => $uniqueKios,
                'top_products' => $topProducts,
                'percentage_change' => $percentageChange,
                'previous_period_quantity' => $previousQuantity,
                'period' => [
                    'type' => $period,
                    'start' => $start->format('Y-m-d'),
                    'end' => $end->format('Y-m-d'),
                    'start_formatted' => $start->format('d M Y'),
                    'end_formatted' => $end->format('d M Y'),
                ],
            ],
            'message' => 'Data summary berhasil diambil.'
        ]);
    }

    /**
     * Get previous period start date based on current period type
     */
    private function getPreviousPeriodStart(string $period, Carbon $previousEnd): Carbon
    {
        switch ($period) {
            case '30_hari_sebelumnya':
            case 'per_hari':
                return $previousEnd->copy()->subDays(29);

            case 'per_minggu':
                return $previousEnd->copy()->subWeeks(11)->startOfWeek();

            case 'per_bulan':
                return $previousEnd->copy()->subMonths(11)->startOfMonth();

            default:
                return $previousEnd->copy()->subDays(29);
        }
    }
}

