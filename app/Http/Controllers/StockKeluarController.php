<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\StockKeluar;
use App\Models\StockMasuk;
use App\Models\StockTersedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockKeluarController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('dashboard/stock/stok-keluar', [
            'user' => Auth::user()
        ]);
    }

    /**
     * API: Display a listing of the resource.
     */
    public function apiIndex(Request $request): JsonResponse
    {
        $query = StockKeluar::notDeleted()
            ->with(['user', 'kios', 'product', 'creator', 'updater']);

        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        if (Auth::user()->role === 'Field Assistant') {
            $query->where('user_id', Auth::id());
        }
        // Assistant Area Manager bisa melihat semua (no filter)

        // Filter by kios if provided
        if ($request->has('kios_id') && $request->kios_id && $request->kios_id !== 'all') {
            $query->where('kios_id', $request->kios_id);
        }

        // Filter by date if provided
        if ($request->has('date') && $request->date && $request->date !== 'all') {
            try {
                $date = Carbon::createFromFormat('Y-m-d', $request->date);
                $query->whereDate('tanggal', $date->format('Y-m-d'));
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format tanggal tidak valid. Gunakan format Y-m-d (contoh: 2025-12-20)'
                ], 400);
            }
        }

        // Filter by month if provided
        if ($request->has('month') && $request->month && $request->month !== 'all') {
            try {
                $date = Carbon::createFromFormat('Y-m', $request->month);
                $startDate = $date->copy()->startOfMonth();
                $endDate = $date->copy()->endOfMonth();
                $query->whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format bulan tidak valid. Gunakan format Y-m (contoh: 2025-12)'
                ], 400);
            }
        }

        // Filter by year if provided
        if ($request->has('year') && $request->year && $request->year !== 'all') {
            try {
                $year = (int) $request->year;
                $query->whereYear('tanggal', $year);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format tahun tidak valid. Gunakan format Y (contoh: 2025)'
                ], 400);
            }
        }

        $stockKeluar = $query->latest('tanggal')
            ->latest('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $stockKeluar,
            'message' => 'Data stock keluar berhasil diambil.'
        ]);
    }

    /**
     * API: Display the specified resource.
     */
    public function apiShow(StockKeluar $stockKeluar): JsonResponse
    {
        if ($stockKeluar->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data stock keluar tidak ditemukan.'
            ], 404);
        }

        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        if (Auth::user()->role === 'Field Assistant' && $stockKeluar->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk melihat data ini.'
            ], 403);
        }

        $stockKeluar->load(['user', 'kios', 'product', 'creator', 'updater']);

        return response()->json([
            'success' => true,
            'data' => $stockKeluar,
            'message' => 'Data stock keluar berhasil diambil.'
        ]);
    }

    /**
     * API: Store a newly created resource in storage.
     */
    public function apiStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'kios_id' => ['required', 'exists:master_kios,id'],
            'product_id' => ['required', 'exists:product,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999999'], // Max value to prevent overflow
            'tanggal' => ['required', 'date', 'before_or_equal:today'], // Cannot be in the future
        ]);

        // Field Assistant hanya bisa membuat stock keluar untuk diri mereka sendiri
        $userId = Auth::id();
        $userRole = Auth::user()->role;

        if ($userRole === 'Field Assistant' && $validated['user_id'] != $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk membuat stock keluar untuk user lain.'
            ], 403);
        }

        // Check stock availability - calculate directly from source tables for accuracy
        // Untuk Field Assistant, validasi berdasarkan stock masuk dan keluar milik user tersebut saja

        // Field Assistant hanya bisa mengurangi stock berdasarkan stock masuk mereka sendiri
        if ($userRole === 'Field Assistant') {
            $totalMasuk = StockMasuk::notDeleted()
                ->where('user_id', $validated['user_id'])
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->sum('quantity');

            $totalKeluar = StockKeluar::notDeleted()
                ->where('user_id', $validated['user_id'])
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->sum('quantity');
        } else {
            // Untuk role lain (jika ada), hitung semua stock tanpa filter user
            $totalMasuk = StockMasuk::notDeleted()
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->sum('quantity');

            $totalKeluar = StockKeluar::notDeleted()
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->sum('quantity');
        }

        $stockTersedia = max(0, $totalMasuk - $totalKeluar);

        if ($stockTersedia < $validated['quantity']) {
            throw ValidationException::withMessages([
                'quantity' => [
                    "Stock tidak mencukupi. Sisa stock tersedia: {$stockTersedia} pcs"
                ]
            ]);
        }

        $validated['created_by'] = Auth::id();
        $validated['is_deleted'] = false;

        $stockKeluar = StockKeluar::create($validated);

        // Sync stock tersedia
        StockTersedia::syncStockTersedia(
            $validated['product_id'],
            $validated['kios_id'],
            Auth::id()
        );

        $stockKeluar->load(['user', 'kios', 'product', 'creator', 'updater']);

        return response()->json([
            'success' => true,
            'data' => $stockKeluar,
            'message' => 'Stock keluar berhasil ditambahkan.'
        ], 201);
    }

    /**
     * API: Update the specified resource in storage.
     */
    public function apiUpdate(Request $request, StockKeluar $stockKeluar): JsonResponse
    {
        // Field Assistant hanya bisa mengubah data mereka sendiri
        if (Auth::user()->role === 'Field Assistant' && $stockKeluar->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk mengubah data stock keluar ini.'
            ], 403);
        }

        if ($stockKeluar->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data stock keluar tidak ditemukan.'
            ], 404);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'kios_id' => ['required', 'exists:master_kios,id'],
            'product_id' => ['required', 'exists:product,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999999'], // Max value to prevent overflow
            'tanggal' => ['required', 'date', 'before_or_equal:today'], // Cannot be in the future
        ]);

        // Field Assistant hanya bisa mengubah stock keluar untuk diri mereka sendiri
        $userId = Auth::id();
        $userRole = Auth::user()->role;

        if ($userRole === 'Field Assistant' && $validated['user_id'] != $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk mengubah stock keluar untuk user lain.'
            ], 403);
        }

        // Check stock availability - calculate directly from source tables for accuracy
        $productChanged = $stockKeluar->product_id != $validated['product_id'];
        $kiosChanged = $stockKeluar->kios_id != $validated['kios_id'];
        $quantityChanged = $stockKeluar->quantity != $validated['quantity'];

        // Untuk Field Assistant, validasi berdasarkan stock masuk dan keluar milik user tersebut saja

        if ($userRole === 'Field Assistant') {
            // Calculate stock tersedia for the target product/kios combination berdasarkan user
            $totalMasuk = StockMasuk::notDeleted()
                ->where('user_id', $validated['user_id'])
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->sum('quantity');

            $totalKeluar = StockKeluar::notDeleted()
                ->where('user_id', $validated['user_id'])
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->sum('quantity');

            // If updating the same record, subtract the old quantity first
            if (!$productChanged && !$kiosChanged && $quantityChanged) {
                $totalKeluar = $totalKeluar - $stockKeluar->quantity;
            }
        } else {
            // Untuk role lain (jika ada), hitung semua stock tanpa filter user
            $totalMasuk = StockMasuk::notDeleted()
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->sum('quantity');

            $totalKeluar = StockKeluar::notDeleted()
                ->where('product_id', $validated['product_id'])
                ->where('kios_id', $validated['kios_id'])
                ->sum('quantity');

            // If updating the same record, subtract the old quantity first
            if (!$productChanged && !$kiosChanged && $quantityChanged) {
                $totalKeluar = $totalKeluar - $stockKeluar->quantity;
            }
        }

        $stockTersedia = max(0, $totalMasuk - $totalKeluar);

        if ($stockTersedia < $validated['quantity']) {
            throw ValidationException::withMessages([
                'quantity' => [
                    "Stock tidak mencukupi. Sisa stock tersedia: {$stockTersedia} pcs"
                ]
            ]);
        }

        $validated['updated_by'] = Auth::id();

        // Store old values for sync
        $oldProductId = $stockKeluar->product_id;
        $oldKiosId = $stockKeluar->kios_id;

        $stockKeluar->update($validated);

        // Sync stock tersedia for both old and new product/kios combination
        StockTersedia::syncStockTersedia(
            $validated['product_id'],
            $validated['kios_id'],
            Auth::id()
        );

        // If product or kios changed, also sync the old combination
        if ($oldProductId != $validated['product_id'] || $oldKiosId != $validated['kios_id']) {
            StockTersedia::syncStockTersedia(
                $oldProductId,
                $oldKiosId,
                Auth::id()
            );
        }

        $stockKeluar->load(['user', 'kios', 'product', 'creator', 'updater']);

        return response()->json([
            'success' => true,
            'data' => $stockKeluar,
            'message' => 'Stock keluar berhasil diperbarui.'
        ]);
    }

    /**
     * API: Remove the specified resource from storage.
     */
    public function apiDestroy(StockKeluar $stockKeluar): JsonResponse
    {
        // Field Assistant hanya bisa menghapus data mereka sendiri
        if (Auth::user()->role === 'Field Assistant' && $stockKeluar->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk menghapus data stock keluar ini.'
            ], 403);
        }

        if ($stockKeluar->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data stock keluar tidak ditemukan.'
            ], 404);
        }

        // Store product_id and kios_id before deletion for sync
        $productId = $stockKeluar->product_id;
        $kiosId = $stockKeluar->kios_id;

        $stockKeluar->update([
            'is_deleted' => true,
            'updated_by' => Auth::id(),
        ]);

        // Sync stock tersedia after deletion
        StockTersedia::syncStockTersedia(
            $productId,
            $kiosId,
            Auth::id()
        );

        return response()->json([
            'success' => true,
            'message' => 'Stock keluar berhasil dihapus.'
        ]);
    }

    /**
     * API: Download stock keluar data as Excel
     */
    public function apiDownload(Request $request): StreamedResponse
    {
        $query = StockKeluar::notDeleted()
            ->with(['user', 'kios', 'product']);

        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        if (Auth::user()->role === 'Field Assistant') {
            $query->where('user_id', Auth::id());
        }
        // Assistant Area Manager bisa melihat semua (no filter)

        // Filter by kios if provided
        $kiosFilter = '';
        if ($request->has('kios_id') && $request->kios_id && $request->kios_id !== 'all') {
            $kios = \App\Models\DataKios::find($request->kios_id);
            if ($kios) {
                $query->where('kios_id', $request->kios_id);
                $kiosFilter = $kios->nama;
            }
        }

        // Filter by date if provided
        $dateFilter = '';
        if ($request->has('date') && $request->date && $request->date !== 'all') {
            try {
                $date = Carbon::createFromFormat('Y-m-d', $request->date);
                $query->whereDate('tanggal', $date->format('Y-m-d'));
                $dateFilter = $date->format('d F Y');
            } catch (\Exception $e) {
                abort(400, 'Format tanggal tidak valid');
            }
        }

        // Filter by month if provided
        $monthFilter = '';
        if ($request->has('month') && $request->month && $request->month !== 'all') {
            try {
                $date = Carbon::createFromFormat('Y-m', $request->month);
                $startDate = $date->copy()->startOfMonth();
                $endDate = $date->copy()->endOfMonth();
                $query->whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
                $monthFilter = $date->format('F Y');
            } catch (\Exception $e) {
                abort(400, 'Format bulan tidak valid');
            }
        }

        // Filter by year if provided
        $yearFilter = '';
        if ($request->has('year') && $request->year && $request->year !== 'all') {
            try {
                $year = (int) $request->year;
                $query->whereYear('tanggal', $year);
                $yearFilter = $year;
            } catch (\Exception $e) {
                abort(400, 'Format tahun tidak valid');
            }
        }

        $stockKeluar = $query->latest('tanggal')
            ->latest('created_at')
            ->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set title
        $titleParts = [];
        if ($kiosFilter) {
            $titleParts[] = $kiosFilter;
        }
        if ($dateFilter) {
            $titleParts[] = $dateFilter;
        }
        if ($monthFilter) {
            $titleParts[] = $monthFilter;
        }
        if ($yearFilter) {
            $titleParts[] = $yearFilter;
        }
        $title = count($titleParts) > 0
            ? "Stock Keluar - " . implode(' - ', $titleParts)
            : "Stock Keluar - Semua Data";
        $sheet->setCellValue('A1', $title);
        $sheet->mergeCells('A1:F1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

        // Set headers
        $headers = ['No', 'Nama FA', 'Nama Kios', 'Barang Keluar', 'Quantum (PCS)', 'Tanggal Barang Keluar'];
        $col = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($col . '3', $header);
            $col++;
        }

        // Style headers
        $sheet->getStyle('A3:F3')->getFont()->setBold(true);
        $sheet->getStyle('A3:F3')->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFE0E0E0');

        // Set data
        $row = 4;
        $no = 1;
        foreach ($stockKeluar as $item) {
            $sheet->setCellValue('A' . $row, $no++);
            $sheet->setCellValue('B' . $row, $item->user->name ?? '');
            $sheet->setCellValue('C' . $row, $item->kios->nama ?? '');
            $sheet->setCellValue('D' . $row, ($item->product->nama ?? '') . ' - ' . ($item->product->kemasan ?? ''));
            $sheet->setCellValue('E' . $row, $item->quantity);
            $sheet->setCellValue('F' . $row, Carbon::parse($item->tanggal)->format('d M Y'));
            $row++;
        }

        // Auto size columns
        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filenameParts = [];
        if ($kiosFilter) {
            $filenameParts[] = str_replace(' ', '-', strtolower($kiosFilter));
        }
        if ($dateFilter) {
            $filenameParts[] = str_replace(' ', '-', strtolower($dateFilter));
        }
        if ($monthFilter) {
            $filenameParts[] = str_replace(' ', '-', strtolower($monthFilter));
        }
        if ($yearFilter) {
            $filenameParts[] = $yearFilter;
        }
        $filename = count($filenameParts) > 0
            ? 'stock-keluar-' . implode('-', $filenameParts) . '.xlsx'
            : 'stock-keluar-semua-data.xlsx';

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}

