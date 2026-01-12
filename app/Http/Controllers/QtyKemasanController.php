<?php

namespace App\Http\Controllers;

use App\Models\QtyKemasan;
use Illuminate\Http\JsonResponse;

class QtyKemasanController extends Controller
{
    /**
     * API: Display a listing of the resource for dropdown.
     */
    public function apiIndex(): JsonResponse
    {
        $qtyKemasan = QtyKemasan::notDeleted()
            ->orderBy('qty_kemasan')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $qtyKemasan,
            'message' => 'Data qty kemasan berhasil diambil.'
        ]);
    }
}

