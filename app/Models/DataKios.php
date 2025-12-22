<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataKios extends Model
{
    protected $table = 'master_kios';
    protected $fillable = ['nama', 'is_deleted', 'created_by', 'updated_by'];

    protected $casts = [
        'is_deleted' => 'boolean',
    ];

    /**
     * Get the user that created the kios.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user that last updated the kios.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope a query to only include non-deleted kios.
     */
    public function scopeNotDeleted($query)
    {
        return $query->where('is_deleted', false);
    }
}
