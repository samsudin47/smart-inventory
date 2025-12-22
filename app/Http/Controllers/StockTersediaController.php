<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\StockTersedia;
use App\Models\StockMasuk;
use App\Models\StockKeluar;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockTersediaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('dashboard/stock/stok-tersedia', [
            'user' => Auth::user()
        ]);
    }

    /**
     * API: Display a listing of the resource.
     * Returns aggregated stock tersedia from stock_tersedia table.
     */
    public function apiIndex(Request $request): JsonResponse
    {
        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        if (Auth::user()->role === 'Field Assistant') {
            // Calculate stock tersedia based on user's own stock_masuk and stock_keluar only
            $stockTersedia = StockTersedia::getAggregatedStockTersediaByUser(Auth::id());
        } else {
            // Assistant Area Manager bisa melihat semua (no filter)
            $stockTersedia = StockTersedia::getAggregatedStockTersedia();
        }

        // Filter by kios if provided
        if ($request->has('kios_id') && $request->kios_id && $request->kios_id !== 'all') {
            $stockTersedia = $stockTersedia->filter(function ($item) use ($request) {
                return $item['kios_id'] == $request->kios_id;
            })->values();
        }

        // Filter by month if provided
        if ($request->has('month') && $request->month && $request->month !== 'all') {
            try {
                $date = Carbon::createFromFormat('Y-m', $request->month);
                $startDate = $date->copy()->startOfMonth();
                $endDate = $date->copy()->endOfMonth();
                
                // Filter by bulan (latest_date) column
                $stockTersedia = $stockTersedia->filter(function ($item) use ($startDate, $endDate) {
                    if (!$item['latest_date']) {
                        return false;
                    }
                    $itemDate = Carbon::parse($item['latest_date']);
                    return $itemDate->between($startDate, $endDate);
                })->values();
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format bulan tidak valid. Gunakan format Y-m (contoh: 2025-12)'
                ], 400);
            }
        }

        // Calculate summary statistics from filtered data
        $totalProducts = $stockTersedia->count();
        $totalMasuk = $stockTersedia->sum('total_masuk');
        $totalKeluar = $stockTersedia->sum('total_keluar');
        $totalStockTersedia = $stockTersedia->sum('quantity_tersedia');

        return response()->json([
            'success' => true,
            'data' => $stockTersedia,
            'summary' => [
                'total_products' => $totalProducts,
                'total_masuk' => $totalMasuk,
                'total_keluar' => $totalKeluar,
                'total_stock_tersedia' => $totalStockTersedia,
            ],
            'message' => 'Data stock tersedia berhasil diambil.'
        ]);
    }

    /**
     * API: Display the specified resource.
     * Returns stock tersedia for a specific product and kios combination.
     * Gets data directly from stock_tersedia table.
     */
    public function apiShow(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:product,id'],
            'kios_id' => ['required', 'exists:master_kios,id'],
        ]);

        $product = \App\Models\Product::find($validated['product_id']);
        $kios = \App\Models\DataKios::find($validated['kios_id']);

        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        if (Auth::user()->role === 'Field Assistant') {
            $userId = Auth::id();
            
            // Check if user has any stock_masuk or stock_keluar for this product/kios combination
            $hasActivity = \App\Models\StockMasuk::notDeleted()
                ->where('user_id', $userId)
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->exists() || 
                \App\Models\StockKeluar::notDeleted()
                    ->where('user_id', $userId)
                    ->where('product_id', $validated['product_id'])
                    ->where('kios_id', $validated['kios_id'])
                    ->exists();

            if (!$hasActivity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki izin untuk melihat data ini.'
                ], 403);
            }

            // Calculate totals from stock_masuk for this user only
            $totalMasuk = \App\Models\StockMasuk::notDeleted()
                ->where('user_id', $userId)
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->sum('quantity');

            // Get latest tanggal_masuk for this user
            $latestMasuk = \App\Models\StockMasuk::notDeleted()
                ->where('user_id', $userId)
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->latest('tanggal')
                ->first();

            // Calculate totals from stock_keluar for this user only
            $totalKeluar = \App\Models\StockKeluar::notDeleted()
                ->where('user_id', $userId)
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->sum('quantity');

            // Get latest tanggal_keluar for this user
            $latestKeluar = \App\Models\StockKeluar::notDeleted()
                ->where('user_id', $userId)
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->latest('tanggal')
                ->first();

            // Calculate quantity_tersedia
            $quantityTersedia = max(0, $totalMasuk - $totalKeluar);

            return response()->json([
                'success' => true,
                'data' => [
                    'product_id' => $validated['product_id'],
                    'kios_id' => $validated['kios_id'],
                    'total_masuk' => (int) $totalMasuk,
                    'total_keluar' => (int) $totalKeluar,
                    'quantity_tersedia' => (int) $quantityTersedia,
                    'tanggal_masuk' => $latestMasuk ? $latestMasuk->tanggal : null,
                    'tanggal_keluar' => $latestKeluar ? $latestKeluar->tanggal : null,
                    'product' => $product,
                    'kios' => $kios,
                ],
                'message' => 'Data stock tersedia berhasil diambil.'
            ]);
        }

        // Assistant Area Manager: Get stock tersedia from database
        $stockTersedia = StockTersedia::notDeleted()
            ->where('product_id', $validated['product_id'])
            ->where('kios_id', $validated['kios_id'])
            ->with(['product', 'kios'])
            ->first();

        if ($stockTersedia) {
            return response()->json([
                'success' => true,
                'data' => [
                    'product_id' => $stockTersedia->product_id,
                    'kios_id' => $stockTersedia->kios_id,
                    'total_masuk' => (int) $stockTersedia->quantity_masuk,
                    'total_keluar' => (int) $stockTersedia->quantity_keluar,
                    'quantity_tersedia' => (int) $stockTersedia->quantity_tersedia,
                    'tanggal_masuk' => $stockTersedia->tanggal_masuk,
                    'tanggal_keluar' => $stockTersedia->tanggal_keluar,
                    'product' => $product,
                    'kios' => $kios,
                ],
                'message' => 'Data stock tersedia berhasil diambil.'
            ]);
        }

        // If no record found, return zero values
        return response()->json([
            'success' => true,
            'data' => [
                'product_id' => $validated['product_id'],
                'kios_id' => $validated['kios_id'],
                'total_masuk' => 0,
                'total_keluar' => 0,
                'quantity_tersedia' => 0,
                'tanggal_masuk' => null,
                'tanggal_keluar' => null,
                'product' => $product,
                'kios' => $kios,
            ],
            'message' => 'Data stock tersedia berhasil diambil.'
        ]);
    }

    /**
     * API: Download stock tersedia data as Excel
     */
    public function apiDownload(Request $request): StreamedResponse
    {
        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        if (Auth::user()->role === 'Field Assistant') {
            // Calculate stock tersedia based on user's own stock_masuk and stock_keluar only
            $stockTersedia = StockTersedia::getAggregatedStockTersediaByUser(Auth::id());
        } else {
            // Assistant Area Manager bisa melihat semua (no filter)
            $stockTersedia = StockTersedia::getAggregatedStockTersedia();
        }

        // Filter by kios if provided
        $kiosFilter = '';
        if ($request->has('kios_id') && $request->kios_id && $request->kios_id !== 'all') {
            $kios = \App\Models\DataKios::find($request->kios_id);
            if ($kios) {
                $kiosFilter = $kios->nama;
                $stockTersedia = $stockTersedia->filter(function ($item) use ($request) {
                    return $item['kios_id'] == $request->kios_id;
                })->values();
            }
        }

        // Filter by month if provided
        $monthFilter = '';
        if ($request->has('month') && $request->month && $request->month !== 'all') {
            try {
                $date = Carbon::createFromFormat('Y-m', $request->month);
                $startDate = $date->copy()->startOfMonth();
                $endDate = $date->copy()->endOfMonth();
                $monthFilter = $date->format('F Y');
                
                // Filter by bulan (latest_date) column
                $stockTersedia = $stockTersedia->filter(function ($item) use ($startDate, $endDate) {
                    if (!$item['latest_date']) {
                        return false;
                    }
                    $itemDate = Carbon::parse($item['latest_date']);
                    return $itemDate->between($startDate, $endDate);
                })->values();
            } catch (\Exception $e) {
                abort(400, 'Format bulan tidak valid');
            }
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set title
        $titleParts = [];
        if ($kiosFilter) {
            $titleParts[] = $kiosFilter;
        }
        if ($monthFilter) {
            $titleParts[] = $monthFilter;
        }
        $title = count($titleParts) > 0 
            ? "Stock Tersedia - " . implode(' - ', $titleParts)
            : "Stock Tersedia - Semua Data";
        $sheet->setCellValue('A1', $title);
        $sheet->mergeCells('A1:I1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

        // Set headers
        $headers = ['No', 'Produk', 'Kemasan', 'Satuan', 'Kios', 'Stock Masuk', 'Stock Keluar', 'Stock Tersedia', 'Bulan'];
        $col = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($col . '3', $header);
            $col++;
        }

        // Style headers
        $sheet->getStyle('A3:I3')->getFont()->setBold(true);
        $sheet->getStyle('A3:I3')->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFE0E0E0');

        // Set data
        $row = 4;
        $no = 1;
        foreach ($stockTersedia as $item) {
            $sheet->setCellValue('A' . $row, $no++);
            $sheet->setCellValue('B' . $row, $item['product']['nama'] ?? '');
            $sheet->setCellValue('C' . $row, $item['product']['kemasan'] ?? '');
            $sheet->setCellValue('D' . $row, $item['product']['satuan'] ?? '');
            $sheet->setCellValue('E' . $row, $item['kios']['nama'] ?? '');
            $sheet->setCellValue('F' . $row, $item['total_masuk']);
            $sheet->setCellValue('G' . $row, $item['total_keluar']);
            $sheet->setCellValue('H' . $row, $item['quantity_tersedia']);
            $bulanText = $item['bulan'] ? Carbon::createFromFormat('Y-m', $item['bulan'])->format('F Y') : '-';
            $sheet->setCellValue('I' . $row, $bulanText);
            $row++;
        }

        // Auto size columns
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filenameParts = [];
        if ($kiosFilter) {
            $filenameParts[] = str_replace(' ', '-', strtolower($kiosFilter));
        }
        if ($monthFilter) {
            $filenameParts[] = str_replace(' ', '-', strtolower($monthFilter));
        }
        $filename = count($filenameParts) > 0
            ? 'stock-tersedia-' . implode('-', $filenameParts) . '.xlsx'
            : 'stock-tersedia-semua-data.xlsx';

        $writer = new Xlsx($spreadsheet);
        
        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}

