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
    public function index(): View
    {
        $kios = DataKios::notDeleted()->latest()->get();
        return view('kios.index', compact('kios'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
        ]);

        $validated['created_by'] = Auth::id();
        $validated['is_deleted'] = false;

        DataKios::create($validated);

        // Increment total_kios for the authenticated user
        $user = Auth::user();
        $currentTotal = (int) ($user->total_kios ?? 0);
        $user->total_kios = (string) ($currentTotal + 1);
        $user->save();

        return redirect()->route('kios.index')
            ->with('success', 'Kios berhasil ditambahkan.');
    }

    public function show(DataKios $kios): View
    {
        if ($kios->is_deleted) {
            abort(404);
        }
        return view('kios.show', compact('kios'));
    }

    public function edit(DataKios $kios): View
    {
        if ($kios->is_deleted) {
            abort(404);
        }
        return view('kios.edit', compact('kios'));
    }

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

    public function apiIndex(): JsonResponse
    {
        $kios = DataKios::notDeleted()->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $kios,
            'message' => 'Data kios berhasil diambil.'
        ]);
    }

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

    public function apiStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'desa' => ['nullable', 'string', 'max:255'],
            'kecamatan' => ['nullable', 'string', 'max:255'],
            'kabupaten' => ['nullable', 'string', 'max:255'],
            'nama_pemilik' => ['nullable', 'string', 'max:255'],
            'no_hp' => ['nullable', 'string', 'max:20'],
            'cluster_kios' => ['nullable', 'in:R1,R2,R3'],
        ]);

        $validated['created_by'] = Auth::id();
        $validated['is_deleted'] = false;
        $validated['cluster_kios'] = $validated['cluster_kios'] ?? null;

        $kios = DataKios::create($validated);

        // Increment total_kios for the authenticated user
        $user = Auth::user();
        $currentTotal = (int) ($user->total_kios ?? 0);
        $user->total_kios = (string) ($currentTotal + 1);
        $user->save();

        return response()->json([
            'success' => true,
            'data' => $kios,
            'message' => 'Kios berhasil ditambahkan.'
        ], 201);
    }

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
            'desa' => ['nullable', 'string', 'max:255'],
            'kecamatan' => ['nullable', 'string', 'max:255'],
            'kabupaten' => ['nullable', 'string', 'max:255'],
            'nama_pemilik' => ['nullable', 'string', 'max:255'],
            'no_hp' => ['nullable', 'string', 'max:20'],
            'cluster_kios' => ['nullable', 'in:R1,R2,R3'],
        ]);

        $validated['updated_by'] = Auth::id();

        $kios->update($validated);

        return response()->json([
            'success' => true,
            'data' => $kios,
            'message' => 'Kios berhasil diperbarui.'
        ]);
    }

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
