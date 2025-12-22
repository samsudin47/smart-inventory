<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class StockTersedia extends Model
{
    protected $table = 'stock_tersedia';
    protected $fillable = [
        'product_id',
        'kios_id',
        'tanggal_masuk',
        'quantity_masuk',
        'tanggal_keluar',
        'quantity_keluar',
        'quantity_tersedia',
        'is_deleted',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tanggal_masuk' => 'date',
        'tanggal_keluar' => 'date',
        'is_deleted' => 'boolean',
        'quantity_masuk' => 'integer',
        'quantity_keluar' => 'integer',
        'quantity_tersedia' => 'integer',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Ensure quantity values are always non-negative before saving
        static::saving(function ($stockTersedia) {
            $stockTersedia->quantity_masuk = max(0, (int) $stockTersedia->quantity_masuk);
            $stockTersedia->quantity_keluar = max(0, (int) $stockTersedia->quantity_keluar);
            $stockTersedia->quantity_tersedia = max(0, (int) $stockTersedia->quantity_tersedia);
        });
    }

    /**
     * Get the product that owns the stock tersedia.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Get the kios that owns the stock tersedia.
     */
    public function kios(): BelongsTo
    {
        return $this->belongsTo(DataKios::class, 'kios_id');
    }

    /**
     * Get the user that created the stock tersedia.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user that last updated the stock tersedia.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope a query to only include non-deleted stock tersedia.
     */
    public function scopeNotDeleted($query)
    {
        return $query->where('is_deleted', false);
    }

    /**
     * Calculate current available stock for a product in a kios.
     * This method gets data directly from stock_tersedia table.
     */
    public static function calculateStockTersedia($productId, $kiosId): int
    {
        $stockTersedia = self::notDeleted()
            ->where('product_id', $productId)
            ->where('kios_id', $kiosId)
            ->first();

        if ($stockTersedia) {
            return (int) $stockTersedia->quantity_tersedia;
        }

        // If no record found, return 0
        return 0;
    }

    /**
     * Get aggregated stock tersedia data from stock_tersedia table.
     * This method directly queries from stock_tersedia table for better performance.
     */
    public static function getAggregatedStockTersedia()
    {
        // Get all stock tersedia records from database with non-deleted products and kios
        $stockTersedia = self::notDeleted()
            ->whereHas('product', function ($query) {
                $query->where('is_deleted', false);
            })
            ->whereHas('kios', function ($query) {
                $query->where('is_deleted', false);
            })
            ->with(['product', 'kios'])
            ->get();

        // Map and format the data
        $result = $stockTersedia->map(function ($item) {
            $product = $item->product;
            $kios = $item->kios;

            // Get the latest date between created_at and updated_at for bulan column
            $latestDate = $item->updated_at && $item->updated_at->gt($item->created_at) 
                ? $item->updated_at 
                : $item->created_at;

            return [
                'product_id' => $item->product_id,
                'kios_id' => $item->kios_id,
                'total_masuk' => (int) $item->quantity_masuk,
                'total_keluar' => (int) $item->quantity_keluar,
                'quantity_tersedia' => (int) $item->quantity_tersedia,
                'tanggal_masuk' => $item->tanggal_masuk,
                'tanggal_keluar' => $item->tanggal_keluar,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
                'latest_date' => $latestDate,
                'bulan' => $latestDate ? $latestDate->format('Y-m') : null,
                'product' => [
                    'id' => $product->id,
                    'nama' => $product->nama,
                    'kemasan' => $product->kemasan,
                    'satuan' => $product->satuan,
                ],
                'kios' => [
                    'id' => $kios->id,
                    'nama' => $kios->nama,
                ],
            ];
        });

        return $result;
    }

    /**
     * Get aggregated stock tersedia data for a specific user (Field Assistant).
     * This method calculates stock tersedia based on user's stock_masuk and stock_keluar only.
     */
    public static function getAggregatedStockTersediaByUser($userId)
    {
        // Get all product_id and kios_id combinations where user has stock_masuk or stock_keluar
        $userProductKios = StockMasuk::notDeleted()
            ->where('user_id', $userId)
            ->select('product_id', 'kios_id')
            ->distinct()
            ->get()
            ->map(function ($item) {
                return $item->product_id . '-' . $item->kios_id;
            })
            ->merge(
                StockKeluar::notDeleted()
                    ->where('user_id', $userId)
                    ->select('product_id', 'kios_id')
                    ->distinct()
                    ->get()
                    ->map(function ($item) {
                        return $item->product_id . '-' . $item->kios_id;
                    })
            )
            ->unique()
            ->map(function ($key) {
                [$productId, $kiosId] = explode('-', $key);
                return ['product_id' => (int) $productId, 'kios_id' => (int) $kiosId];
            });

        $result = collect();

        foreach ($userProductKios as $combination) {
            $productId = $combination['product_id'];
            $kiosId = $combination['kios_id'];

            // Calculate totals from stock_masuk for this user only
            $totalMasuk = StockMasuk::notDeleted()
                ->where('user_id', $userId)
                ->where('product_id', $productId)
                ->where('kios_id', $kiosId)
                ->sum('quantity');

            // Get latest tanggal_masuk for this user
            $latestMasuk = StockMasuk::notDeleted()
                ->where('user_id', $userId)
                ->where('product_id', $productId)
                ->where('kios_id', $kiosId)
                ->latest('tanggal')
                ->first();

            // Calculate totals from stock_keluar for this user only
            $totalKeluar = StockKeluar::notDeleted()
                ->where('user_id', $userId)
                ->where('product_id', $productId)
                ->where('kios_id', $kiosId)
                ->sum('quantity');

            // Get latest tanggal_keluar for this user
            $latestKeluar = StockKeluar::notDeleted()
                ->where('user_id', $userId)
                ->where('product_id', $productId)
                ->where('kios_id', $kiosId)
                ->latest('tanggal')
                ->first();

            // Calculate quantity_tersedia
            $quantityTersedia = max(0, $totalMasuk - $totalKeluar);

            // Get product and kios info
            $product = \App\Models\Product::where('id', $productId)
                ->where('is_deleted', false)
                ->first();
            $kios = \App\Models\DataKios::where('id', $kiosId)
                ->where('is_deleted', false)
                ->first();

            // Skip if product or kios is deleted
            if (!$product || !$kios) {
                continue;
            }

            // Determine latest date for bulan column
            $latestDate = null;
            if ($latestMasuk && $latestKeluar) {
                $latestDate = $latestMasuk->tanggal->gt($latestKeluar->tanggal) 
                    ? $latestMasuk->tanggal 
                    : $latestKeluar->tanggal;
            } elseif ($latestMasuk) {
                $latestDate = $latestMasuk->tanggal;
            } elseif ($latestKeluar) {
                $latestDate = $latestKeluar->tanggal;
            }

            $result->push([
                'product_id' => $productId,
                'kios_id' => $kiosId,
                'total_masuk' => (int) $totalMasuk,
                'total_keluar' => (int) $totalKeluar,
                'quantity_tersedia' => (int) $quantityTersedia,
                'tanggal_masuk' => $latestMasuk ? $latestMasuk->tanggal : null,
                'tanggal_keluar' => $latestKeluar ? $latestKeluar->tanggal : null,
                'created_at' => $latestMasuk ? $latestMasuk->created_at : ($latestKeluar ? $latestKeluar->created_at : null),
                'updated_at' => $latestMasuk ? $latestMasuk->updated_at : ($latestKeluar ? $latestKeluar->updated_at : null),
                'latest_date' => $latestDate,
                'bulan' => $latestDate ? $latestDate->format('Y-m') : null,
                'product' => [
                    'id' => $product->id,
                    'nama' => $product->nama,
                    'kemasan' => $product->kemasan,
                    'satuan' => $product->satuan,
                ],
                'kios' => [
                    'id' => $kios->id,
                    'nama' => $kios->nama,
                ],
            ]);
        }

        return $result;
    }

    /**
     * Sync stock tersedia data for a specific product and kios combination.
     * This method updates or creates a record in stock_tersedia table based on
     * aggregated data from stock_masuk and stock_keluar tables.
     */
    public static function syncStockTersedia($productId, $kiosId, $userId = null): void
    {
        // Calculate totals from stock_masuk
        $totalMasuk = StockMasuk::notDeleted()
            ->where('product_id', $productId)
            ->where('kios_id', $kiosId)
            ->sum('quantity');

        // Get latest tanggal_masuk
        $latestMasuk = StockMasuk::notDeleted()
            ->where('product_id', $productId)
            ->where('kios_id', $kiosId)
            ->latest('tanggal')
            ->first();

        // Calculate totals from stock_keluar
        $totalKeluar = StockKeluar::notDeleted()
            ->where('product_id', $productId)
            ->where('kios_id', $kiosId)
            ->sum('quantity');

        // Get latest tanggal_keluar
        $latestKeluar = StockKeluar::notDeleted()
            ->where('product_id', $productId)
            ->where('kios_id', $kiosId)
            ->latest('tanggal')
            ->first();

        // Calculate quantity_tersedia
        $quantityTersedia = max(0, $totalMasuk - $totalKeluar);

        // Find or create stock_tersedia record
        $stockTersedia = self::where('product_id', $productId)
            ->where('kios_id', $kiosId)
            ->where('is_deleted', false)
            ->first();

        if ($stockTersedia) {
            // Update existing record
            $stockTersedia->update([
                'tanggal_masuk' => $latestMasuk ? $latestMasuk->tanggal : null,
                'quantity_masuk' => $totalMasuk,
                'tanggal_keluar' => $latestKeluar ? $latestKeluar->tanggal : null,
                'quantity_keluar' => $totalKeluar,
                'quantity_tersedia' => $quantityTersedia,
                'updated_by' => $userId,
            ]);
        } else {
            // Create new record only if there's data (masuk or keluar)
            if ($totalMasuk > 0 || $totalKeluar > 0) {
                self::create([
                    'product_id' => $productId,
                    'kios_id' => $kiosId,
                    'tanggal_masuk' => $latestMasuk ? $latestMasuk->tanggal : null,
                    'quantity_masuk' => $totalMasuk,
                    'tanggal_keluar' => $latestKeluar ? $latestKeluar->tanggal : null,
                    'quantity_keluar' => $totalKeluar,
                    'quantity_tersedia' => $quantityTersedia,
                    'is_deleted' => false,
                    'created_by' => $userId,
                    'updated_by' => $userId,
                ]);
            }
        }
    }
}

