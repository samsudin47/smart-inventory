<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QtyKemasan extends Model
{
    protected $table = 'qty_kemasan';
    
    protected $fillable = ['qty_kemasan', 'is_deleted'];

    protected $casts = [
        'is_deleted' => 'boolean',
    ];

    /**
     * Scope a query to only include non-deleted qty kemasan.
     */
    public function scopeNotDeleted($query)
    {
        return $query->where('is_deleted', false);
    }
}

