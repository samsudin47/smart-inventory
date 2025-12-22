<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class PetugasController extends Controller
{
    /**
     * API: Display a listing of the resource (users).
     */
    public function apiIndex(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        
        // Assistant Area Manager dapat melihat semua user
        // Field Assistant hanya dapat melihat dirinya sendiri
        if ($currentUser->role === 'Assistant Area Manager') {
            $users = User::latest()->get();
        } else {
            // Field Assistant hanya melihat dirinya sendiri
            $users = User::where('id', $currentUser->id)->get();
        }

        // Hide sensitive information
        $users = $users->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'email_verified_at' => $user->email_verified_at,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $users,
            'message' => 'Data petugas berhasil diambil.'
        ]);
    }

    /**
     * API: Display the specified resource (user).
     */
    public function apiShow(User $user): JsonResponse
    {
        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];

        return response()->json([
            'success' => true,
            'data' => $userData,
            'message' => 'Data petugas berhasil diambil.'
        ]);
    }

    /**
     * API: Get users for dropdown (accessible by Field Assistant and Assistant Area Manager).
     * Returns all Field Assistants for dropdown selection.
     */
    public function apiForDropdown(Request $request): JsonResponse
    {
        // Get all Field Assistants for dropdown
        $users = User::where('role', 'Field Assistant')
            ->latest()
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $users,
            'message' => 'Data petugas untuk dropdown berhasil diambil.'
        ]);
    }
}

