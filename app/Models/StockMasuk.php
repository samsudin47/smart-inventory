<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class StockMasuk extends Model
{
    protected $table = 'stock_masuk';
    protected $fillable = [
        'user_id',
        'kios_id',
        'product_id',
        'quantity',
        'tanggal',
        'foto_nota',
        'is_deleted',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'is_deleted' => 'boolean',
    ];

    protected $appends = ['foto_nota_url'];

    /**
     * Get the user (Field Assistant) that owns the stock masuk.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the kios that owns the stock masuk.
     */
    public function kios(): BelongsTo
    {
        return $this->belongsTo(DataKios::class, 'kios_id');
    }

    /**
     * Get the product that owns the stock masuk.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Get the user that created the stock masuk.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user that last updated the stock masuk.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope a query to only include non-deleted stock masuk.
     */
    public function scopeNotDeleted($query)
    {
        return $query->where('is_deleted', false);
    }

    /**
     * Get the full URL for foto_nota.
     */
    public function getFotoNotaUrlAttribute(): ?string
    {
        if (!$this->foto_nota) {
            return null;
        }

        // Use Storage::url() to get the correct URL
        // This will use the 'url' config from filesystems.php
        return Storage::disk('public')->url($this->foto_nota);
    }
}

