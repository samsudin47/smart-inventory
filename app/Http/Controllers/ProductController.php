<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\View\View;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): View
    {
        $products = Product::notDeleted()->latest()->get();
        return view('product.index', compact('products'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): View
    {
        return view('product.create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'kemasan' => ['required', 'string', 'max:255'],
            'satuan' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['created_by'] = Auth::id();
        $validated['is_deleted'] = false;

        Product::create($validated);

        return redirect()->route('product.index')
            ->with('success', 'Produk berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product): View
    {
        if ($product->is_deleted) {
            abort(404);
        }
        return view('product.show', compact('product'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Product $product): View
    {
        if ($product->is_deleted) {
            abort(404);
        }
        return view('product.edit', compact('product'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product): RedirectResponse
    {
        if ($product->is_deleted) {
            abort(404);
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'kemasan' => ['required', 'string', 'max:255'],
            'satuan' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['updated_by'] = Auth::id();

        $product->update($validated);

        return redirect()->route('product.index')
            ->with('success', 'Produk berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product): RedirectResponse
    {
        if ($product->is_deleted) {
            abort(404);
        }

        $product->update([
            'is_deleted' => true,
            'updated_by' => Auth::id(),
        ]);

        return redirect()->route('product.index')
            ->with('success', 'Produk berhasil dihapus.');
    }

    /**
     * API: Display a listing of the resource.
     */
    public function apiIndex(): JsonResponse
    {
        $products = Product::notDeleted()->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $products,
            'message' => 'Data produk berhasil diambil.'
        ]);
    }

    /**
     * API: Display the specified resource.
     */
    public function apiShow(Product $product): JsonResponse
    {
        if ($product->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data produk tidak ditemukan.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $product,
            'message' => 'Data produk berhasil diambil.'
        ]);
    }

    /**
     * API: Store a newly created resource in storage.
     */
    public function apiStore(Request $request): JsonResponse
    {
        // Assistant Area Manager hanya bisa melihat, tidak bisa edit
        if (Auth::user()->role === 'Assistant Area Manager') {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk menambah data produk.'
            ], 403);
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'kemasan' => ['required', 'string', 'max:255'],
            'satuan' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['created_by'] = Auth::id();
        $validated['is_deleted'] = false;

        $product = Product::create($validated);

        return response()->json([
            'success' => true,
            'data' => $product,
            'message' => 'Produk berhasil ditambahkan.'
        ], 201);
    }

    /**
     * API: Update the specified resource in storage.
     */
    public function apiUpdate(Request $request, Product $product): JsonResponse
    {
        // Assistant Area Manager hanya bisa melihat, tidak bisa edit
        if (Auth::user()->role === 'Assistant Area Manager') {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk mengubah data produk.'
            ], 403);
        }

        if ($product->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data produk tidak ditemukan.'
            ], 404);
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'kemasan' => ['required', 'string', 'max:255'],
            'satuan' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['updated_by'] = Auth::id();

        $product->update($validated);

        return response()->json([
            'success' => true,
            'data' => $product,
            'message' => 'Produk berhasil diperbarui.'
        ]);
    }

    /**
     * API: Remove the specified resource from storage.
     */
    public function apiDestroy(Product $product): JsonResponse
    {
        // Assistant Area Manager hanya bisa melihat, tidak bisa edit
        if (Auth::user()->role === 'Assistant Area Manager') {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk menghapus data produk.'
            ], 403);
        }

        if ($product->is_deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Data produk tidak ditemukan.'
            ], 404);
        }

        $product->update([
            'is_deleted' => true,
            'updated_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil dihapus.'
        ]);
    }
}

