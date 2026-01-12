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
     * - product_id: Optional filter by specific product (can be array for multiple)
     * - kios_id: Optional filter by specific kios (can be array for multiple)
     * - start_date: Optional custom start date (format: Y-m-d)
     * - end_date: Optional custom end date (format: Y-m-d)
     */
    public function apiGetReport(Request $request): JsonResponse
    {
        $type = $request->input('type', 'penjualan'); // 'penjualan' or 'stok_keluar'
        $productIds = $request->input('product_id', []);
        $kiosIds = $request->input('kios_id', []);
        $qtyKemasanIds = $request->input('qty_kemasan_id', []);
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        
        // Normalize to arrays
        if (!is_array($productIds)) {
            $productIds = $productIds ? [$productIds] : [];
        }
        if (!is_array($kiosIds)) {
            $kiosIds = $kiosIds ? [$kiosIds] : [];
        }
        if (!is_array($qtyKemasanIds)) {
            $qtyKemasanIds = $qtyKemasanIds ? [$qtyKemasanIds] : [];
        }
        
        // Convert to integers and filter empty values
        $productIds = array_filter(array_map('intval', $productIds));
        $kiosIds = array_filter(array_map('intval', $kiosIds));
        $qtyKemasanIds = array_filter(array_map('intval', $qtyKemasanIds));

        // Validate type
        if (!in_array($type, ['penjualan', 'stok_keluar'])) {
            return response()->json([
                'success' => false,
                'message' => 'Tipe data tidak valid. Gunakan "penjualan" atau "stok_keluar".'
            ], 400);
        }

        // Calculate date range based on start_date and end_date
        $dateRange = $this->calculateDateRange($startDate, $endDate);
        if (!$dateRange) {
            return response()->json([
                'success' => false,
                'message' => 'Tanggal tidak valid. Pastikan start_date dan end_date dalam format Y-m-d.'
            ], 400);
        }

        // Get data based on type
        if ($type === 'penjualan') {
            $data = $this->getPenjualanData($dateRange, $productIds, $kiosIds, $qtyKemasanIds);
        } else {
            $data = $this->getStokKeluarData($dateRange, $productIds, $kiosIds, $qtyKemasanIds);
        }

        return response()->json([
            'success' => true,
            'data' => $data['data'],
            'meta' => [
                'type' => $type,
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
                    'product_id' => $productIds,
                    'kios_id' => $kiosIds,
                    'qty_kemasan_id' => $qtyKemasanIds,
                ],
            ],
            'message' => 'Data laporan berhasil diambil.'
        ]);
    }

    /**
     * Calculate date range based on start_date and end_date
     */
    private function calculateDateRange(?string $startDate = null, ?string $endDate = null): ?array
    {
        $now = Carbon::now();

        // If both dates provided, use them
        if ($startDate && $endDate) {
            try {
                $start = Carbon::createFromFormat('Y-m-d', $startDate)->startOfDay();
                $end = Carbon::createFromFormat('Y-m-d', $endDate)->endOfDay();
                
                // Validate that start is before end
                if ($start->gt($end)) {
                    return null;
                }
                
                return [
                    'start' => $start,
                    'end' => $end,
                ];
            } catch (\Exception $e) {
                return null;
            }
        }

        // If only start_date provided, use it to today
        if ($startDate) {
            try {
                $start = Carbon::createFromFormat('Y-m-d', $startDate)->startOfDay();
                $end = $now->copy()->endOfDay();
                
                return [
                    'start' => $start,
                    'end' => $end,
                ];
            } catch (\Exception $e) {
                return null;
            }
        }

        // If only end_date provided, use last 30 days to end_date
        if ($endDate) {
            try {
                $end = Carbon::createFromFormat('Y-m-d', $endDate)->endOfDay();
                $start = $end->copy()->subDays(29)->startOfDay();
                
                return [
                    'start' => $start,
                    'end' => $end,
                ];
            } catch (\Exception $e) {
                return null;
            }
        }

        // Default: last 30 days
        $end = $now->copy();
        $start = $now->copy()->subDays(29)->startOfDay();

        return [
            'start' => $start,
            'end' => $end,
        ];
    }

    /**
     * Get penjualan (sales) data grouped by period using Eloquent
     */
    private function getPenjualanData(array $dateRange, array $productIds = [], array $kiosIds = [], array $qtyKemasanIds = []): array
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

        if (!empty($productIds)) {
            $query->whereIn('product_id', $productIds);
        }

        if (!empty($kiosIds)) {
            $query->whereIn('kios_id', $kiosIds);
        }

        if (!empty($qtyKemasanIds)) {
            $query->whereIn('qty_kemasan_id', $qtyKemasanIds);
        }

        // Get all records with qty kemasan relationship
        $records = $query->with('qtyKemasan')->get();

        // If kemasan filter is applied, group by day and kemasan
        if (!empty($qtyKemasanIds)) {
            $formattedData = $this->groupByDayAndKemasan($records, $qtyKemasanIds);
        } else {
            // Group data by day only
            $formattedData = $this->groupByDay($records);
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
     * Group records by day and kemasan using Eloquent Collection
     */
    private function groupByDayAndKemasan(Collection $records, array $qtyKemasanIds): Collection
    {
        // First group by date
        $byDate = $records->groupBy(function ($record) {
            return $record->tanggal->format('Y-m-d');
        });

        // Get all unique dates
        $allDates = $byDate->keys()->sort()->values();
        
        // Get kemasan info for selected kemasan IDs
        $allKemasan = \App\Models\QtyKemasan::whereIn('id', $qtyKemasanIds)
            ->get()
            ->map(function ($kemasan) {
                return [
                    'id' => $kemasan->id,
                    'qty_kemasan' => $kemasan->qty_kemasan,
                ];
            });

        // Build data structure: for each date, include data for each kemasan
        $result = $allDates->map(function ($dateKey) use ($byDate, $allKemasan) {
            $date = Carbon::parse($dateKey);
            $dayRecords = $byDate->get($dateKey, collect());
            
            // Group day records by kemasan
            $byKemasan = $dayRecords->groupBy('qty_kemasan_id');
            
            // Build base data structure
            $data = [
                'date' => $dateKey,
                'date_label' => $date->format('d/m'),
                'label' => $date->format('d/m'),
                'total_quantity' => $dayRecords->sum('quantity'),
                'total_transactions' => $dayRecords->count(),
            ];
            
            // Add quantity for each kemasan (even if 0)
            foreach ($allKemasan as $kemasan) {
                $kemasanRecords = $byKemasan->get($kemasan['id'], collect());
                $data['kemasan_' . $kemasan['id']] = $kemasanRecords->sum('quantity');
            }
            
            return $data;
        });

        return $result;
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
    private function getStokKeluarData(array $dateRange, array $productIds = [], array $kiosIds = [], array $qtyKemasanIds = []): array
    {
        // Stock keluar data is essentially the same as penjualan
        // since stock keluar represents sales/outgoing stock
        return $this->getPenjualanData($dateRange, $productIds, $kiosIds, $qtyKemasanIds);
    }

    /**
     * API: Get presentation report summary statistics
     * 
     * Query parameters:
     * - type: 'penjualan' or 'stok_keluar' (default: 'penjualan')
     * - period: '30_hari_sebelumnya', 'per_hari', 'per_minggu', 'per_bulan' (default: '30_hari_sebelumnya')
     * - product_id: Optional filter by specific product (can be array for multiple)
     * - kios_id: Optional filter by specific kios (can be array for multiple)
     */
    public function apiGetSummary(Request $request): JsonResponse
    {
        $type = $request->input('type', 'penjualan');
        $period = $request->input('period', '30_hari_sebelumnya');
        $productIds = $request->input('product_id', []);
        $kiosIds = $request->input('kios_id', []);
        
        // Normalize to arrays
        if (!is_array($productIds)) {
            $productIds = $productIds ? [$productIds] : [];
        }
        if (!is_array($kiosIds)) {
            $kiosIds = $kiosIds ? [$kiosIds] : [];
        }
        
        // Convert to integers and filter empty values
        $productIds = array_filter(array_map('intval', $productIds));
        $kiosIds = array_filter(array_map('intval', $kiosIds));

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

        if (!empty($productIds)) {
            $query->whereIn('product_id', $productIds);
        }

        if (!empty($kiosIds)) {
            $query->whereIn('kios_id', $kiosIds);
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

        if (!empty($productIds)) {
            $previousQuery->whereIn('product_id', $productIds);
        }

        if (!empty($kiosIds)) {
            $previousQuery->whereIn('kios_id', $kiosIds);
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

