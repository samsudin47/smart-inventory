<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!$request->user()) {
            return redirect()->route('unauthorized');
        }

        // Assistant Area Manager dapat mengakses semua menu
        if ($request->user()->role === 'Assistant Area Manager') {
            return $next($request);
        }

        // Untuk role lain, cek apakah role mereka ada dalam daftar yang diizinkan
        if (!in_array($request->user()->role, $roles)) {
            return redirect()->route('unauthorized');
        }

        return $next($request);
    }
}
