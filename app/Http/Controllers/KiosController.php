<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DataKios;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\View\View;
use Illuminate\Support\Facades\Auth;

class KiosController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): View
    {
        $kios = DataKios::notDeleted()->latest()->get();
        return view('kios.index', compact('kios'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): View
    {
        return view('kios.create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
        ]);

        $validated['created_by'] = Auth::id();
        $validated['is_deleted'] = false;

        DataKios::create($validated);

        return redirect()->route('kios.index')
            ->with('success', 'Kios berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(DataKios $kios): View
    {
        if ($kios->is_deleted) {
            abort(404);
        }
        return view('kios.show', compact('kios'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(DataKios $kios): View
    {
        if ($kios->is_deleted) {
            abort(404);
        }
        return view('kios.edit', compact('kios'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, DataKios $kios): RedirectResponse
    {
        if ($kios->is_deleted) {
            abort(404);
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
        ]);

        $validated['updated_by'] = Auth::id();

        $kios->update($validated);

        return redirect()->route('kios.index')
            ->with('success', 'Kios berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(DataKios $kios): RedirectResponse
    {
        if ($kios->is_deleted) {
            abort(404);
        }

        $kios->update([
            'is_deleted' => true,
            'updated_by' => Auth::id(),
        ]);

        return redirect()->route('kios.index')
            ->with('success', 'Kios berhasil dihapus.');
    }

    /**
     * API: Display a listing of the resource.
     */
    public function apiIndex(): JsonResponse
    {
        $kios = DataKios::notDeleted()->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $kios,
            'message' => 'Data kios berhasil diambil.'
        ]);
    }

    /**
     * API: Display the specified resource.
     */
    public function apiShow(DataKios $kios): JsonResponse
    {
        if ($kios->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data kios tidak ditemukan.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $kios,
            'message' => 'Data kios berhasil diambil.'
        ]);
    }

    /**
     * API: Store a newly created resource in storage.
     */
    public function apiStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
        ]);

        $validated['created_by'] = Auth::id();
        $validated['is_deleted'] = false;

        $kios = DataKios::create($validated);

        return response()->json([
            'success' => true,
            'data' => $kios,
            'message' => 'Kios berhasil ditambahkan.'
        ], 201);
    }

    /**
     * API: Update the specified resource in storage.
     */
    public function apiUpdate(Request $request, DataKios $kios): JsonResponse
    {
        if ($kios->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data kios tidak ditemukan.'
            ], 404);
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
        ]);

        $validated['updated_by'] = Auth::id();

        $kios->update($validated);

        return response()->json([
            'success' => true,
            'data' => $kios,
            'message' => 'Kios berhasil diperbarui.'
        ]);
    }

    /**
     * API: Remove the specified resource from storage.
     */
    public function apiDestroy(DataKios $kios): JsonResponse
    {
        if ($kios->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data kios tidak ditemukan.'
            ], 404);
        }

        $kios->update([
            'is_deleted' => true,
            'updated_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kios berhasil dihapus.'
        ]);
    }
}
