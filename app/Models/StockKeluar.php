<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockKeluar extends Model
{
    protected $table = 'stock_keluar';
    protected $fillable = [
        'user_id',
        'kios_id',
        'product_id',
        'quantity',
        'tanggal',
        'is_deleted',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'is_deleted' => 'boolean',
    ];

    /**
     * Get the user (Field Assistant) that owns the stock keluar.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the kios that owns the stock keluar.
     */
    public function kios(): BelongsTo
    {
        return $this->belongsTo(DataKios::class, 'kios_id');
    }

    /**
     * Get the product that owns the stock keluar.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Get the user that created the stock keluar.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user that last updated the stock keluar.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope a query to only include non-deleted stock keluar.
     */
    public function scopeNotDeleted($query)
    {
        return $query->where('is_deleted', false);
    }
}

