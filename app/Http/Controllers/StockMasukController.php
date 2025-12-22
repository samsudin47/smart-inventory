<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\StockMasuk;
use App\Models\StockTersedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockMasukController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('dashboard/stock/stok-masuk', [
            'user' => Auth::user()
        ]);
    }

    /**
     * API: Display a listing of the resource.
     */
    public function apiIndex(Request $request): JsonResponse
    {
        $query = StockMasuk::notDeleted()
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

        $stockMasuk = $query->latest('tanggal')
            ->latest('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $stockMasuk,
            'message' => 'Data stock masuk berhasil diambil.'
        ]);
    }

    /**
     * API: Display the specified resource.
     */
    public function apiShow(StockMasuk $stockMasuk): JsonResponse
    {
        if ($stockMasuk->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data stock masuk tidak ditemukan.'
            ], 404);
        }

        // Filter by user role: Field Assistant hanya bisa melihat aktivitas mereka sendiri
        if (Auth::user()->role === 'Field Assistant' && $stockMasuk->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk melihat data ini.'
            ], 403);
        }

        $stockMasuk->load(['user', 'kios', 'product', 'creator', 'updater']);

        return response()->json([
            'success' => true,
            'data' => $stockMasuk,
            'message' => 'Data stock masuk berhasil diambil.'
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
            'foto_nota' => ['nullable', 'image', 'mimes:jpeg,jpg,png,gif', 'max:5120'], // max 5MB
        ]);

        // Handle file upload
        if ($request->hasFile('foto_nota')) {
            $file = $request->file('foto_nota');
            $fileName = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('stock_masuk/nota', $fileName, 'public');
            $validated['foto_nota'] = $path;
        }

        $validated['created_by'] = Auth::id();
        $validated['is_deleted'] = false;

        $stockMasuk = StockMasuk::create($validated);

        // Sync stock tersedia
        StockTersedia::syncStockTersedia(
            $validated['product_id'],
            $validated['kios_id'],
            Auth::id()
        );

        $stockMasuk->load(['user', 'kios', 'product', 'creator', 'updater']);

        return response()->json([
            'success' => true,
            'data' => $stockMasuk,
            'message' => 'Stock masuk berhasil ditambahkan.'
        ], 201);
    }

    /**
     * API: Update the specified resource in storage.
     */
    public function apiUpdate(Request $request, StockMasuk $stockMasuk): JsonResponse
    {
        // Field Assistant hanya bisa mengubah data mereka sendiri
        if (Auth::user()->role === 'Field Assistant' && $stockMasuk->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk mengubah data stock masuk ini.'
            ], 403);
        }

        if ($stockMasuk->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data stock masuk tidak ditemukan.'
            ], 404);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'kios_id' => ['required', 'exists:master_kios,id'],
            'product_id' => ['required', 'exists:product,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999999'], // Max value to prevent overflow
            'tanggal' => ['required', 'date', 'before_or_equal:today'], // Cannot be in the future
            'foto_nota' => ['nullable', 'image', 'mimes:jpeg,jpg,png,gif', 'max:5120'], // max 5MB
        ]);

        // Handle file upload
        if ($request->hasFile('foto_nota')) {
            // Delete old file if exists
            if ($stockMasuk->foto_nota && Storage::disk('public')->exists($stockMasuk->foto_nota)) {
                Storage::disk('public')->delete($stockMasuk->foto_nota);
            }

            $file = $request->file('foto_nota');
            $fileName = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('stock_masuk/nota', $fileName, 'public');
            $validated['foto_nota'] = $path;
        }

        $validated['updated_by'] = Auth::id();

        // Store old values for sync
        $oldProductId = $stockMasuk->product_id;
        $oldKiosId = $stockMasuk->kios_id;

        $stockMasuk->update($validated);

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

        $stockMasuk->load(['user', 'kios', 'product', 'creator', 'updater']);

        return response()->json([
            'success' => true,
            'data' => $stockMasuk,
            'message' => 'Stock masuk berhasil diperbarui.'
        ]);
    }

    /**
     * API: Remove the specified resource from storage.
     */
    public function apiDestroy(StockMasuk $stockMasuk): JsonResponse
    {
        // Field Assistant hanya bisa menghapus data mereka sendiri
        if (Auth::user()->role === 'Field Assistant' && $stockMasuk->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk menghapus data stock masuk ini.'
            ], 403);
        }

        if ($stockMasuk->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data stock masuk tidak ditemukan.'
            ], 404);
        }

        // Delete foto_nota file if exists
        if ($stockMasuk->foto_nota && Storage::disk('public')->exists($stockMasuk->foto_nota)) {
            Storage::disk('public')->delete($stockMasuk->foto_nota);
        }

        // Store product_id and kios_id before deletion for sync
        $productId = $stockMasuk->product_id;
        $kiosId = $stockMasuk->kios_id;

        $stockMasuk->update([
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
            'message' => 'Stock masuk berhasil dihapus.'
        ]);
    }

    /**
     * API: Download stock masuk data as Excel
     */
    public function apiDownload(Request $request): StreamedResponse
    {
        $query = StockMasuk::notDeleted()
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

        $stockMasuk = $query->latest('tanggal')
            ->latest('created_at')
            ->get();

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
            ? "Stock Masuk - " . implode(' - ', $titleParts)
            : "Stock Masuk - Semua Data";
        $sheet->setCellValue('A1', $title);
        $sheet->mergeCells('A1:G1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

        // Set headers
        $headers = ['No', 'Nama FA', 'Nama Kios', 'Barang Masuk', 'Jumlah (PCS)', 'Tanggal Barang Masuk', 'Foto Nota'];
        $col = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($col . '3', $header);
            $col++;
        }

        // Style headers
        $sheet->getStyle('A3:G3')->getFont()->setBold(true);
        $sheet->getStyle('A3:G3')->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFE0E0E0');

        // Set data
        $row = 4;
        $no = 1;
        foreach ($stockMasuk as $item) {
            $sheet->setCellValue('A' . $row, $no++);
            $sheet->setCellValue('B' . $row, $item->user->name ?? '');
            $sheet->setCellValue('C' . $row, $item->kios->nama ?? '');
            $sheet->setCellValue('D' . $row, ($item->product->nama ?? '') . ' - ' . ($item->product->kemasan ?? ''));
            $sheet->setCellValue('E' . $row, $item->quantity);
            $sheet->setCellValue('F' . $row, Carbon::parse($item->tanggal)->format('d M Y'));
            $sheet->setCellValue('G' . $row, $item->foto_nota ? 'Ada' : '-');
            $row++;
        }

        // Auto size columns
        foreach (range('A', 'G') as $col) {
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
            ? 'stock-masuk-' . implode('-', $filenameParts) . '.xlsx'
            : 'stock-masuk-semua-data.xlsx';

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}

