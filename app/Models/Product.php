<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    protected $table = 'product';
    protected $fillable = ['nama', 'kemasan', 'satuan', 'is_deleted', 'created_by', 'updated_by'];

    protected $casts = [
        'is_deleted' => 'boolean',
    ];

    /**
     * Get the user that created the product.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user that last updated the product.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope a query to only include non-deleted products.
     */
    public function scopeNotDeleted($query)
    {
        return $query->where('is_deleted', false);
    }
}

