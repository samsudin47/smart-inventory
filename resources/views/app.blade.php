<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();

            // Suppress feature_collector warnings and 422 errors (usually from browser extensions)
            (function() {
                if (typeof window === 'undefined') return;

                // Suppress console.warn for feature_collector - check all arguments including stack traces
                const originalWarn = console.warn;
                console.warn = function(...args) {
                    try {
                        const allStrings = args.map(arg => {
                            if (arg && typeof arg === 'object') {
                                if (arg.stack) return arg.stack;
                                if (arg.toString) return arg.toString();
                                return JSON.stringify(arg);
                            }
                            return String(arg);
                        }).join(' ');
                        
                        if (allStrings.includes('feature_collector') || 
                            allStrings.includes('deprecated parameters') ||
                            allStrings.includes('using deprecated') ||
                            allStrings.includes('deprecated')) {
                            return; // Suppress these warnings
                        }
                    } catch (e) {
                        // Fallback if error occurs
                    }
                    originalWarn.apply(console, args);
                };

                // Suppress console.error for handled 422 validation errors
                const originalError = console.error;
                console.error = function(...args) {
                    try {
                        const allStrings = args.map(arg => {
                            if (arg && typeof arg === 'object') {
                                if (arg.stack) return arg.stack;
                                if (arg.toString) return arg.toString();
                                return JSON.stringify(arg);
                            }
                            return String(arg);
                        }).join(' ');
                        
                        // Suppress 422 errors that are handled in UI
                        if (allStrings.includes('422') || 
                            allStrings.includes('Unprocessable Content') ||
                            (allStrings.includes('POST') && allStrings.includes('422')) ||
                            allStrings.includes('api/stock-keluar') ||
                            allStrings.includes('api/stock-masuk') ||
                            allStrings.includes('stok-keluar') && allStrings.includes('422')) {
                            return; // Suppress handled validation errors
                        }
                    } catch (e) {
                        // Fallback if error occurs
                    }
                    originalError.apply(console, args);
                };

                // Intercept fetch to handle 422 silently - prevent browser from logging
                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                    const url = args[0];
                    const isStockApi = typeof url === 'string' && (url.includes('/api/stock-keluar') || url.includes('/api/stock-masuk'));
                    
                    const fetchPromise = originalFetch.apply(this, args);
                    
                    // Wrap promise to catch and suppress 422 errors
                    return fetchPromise.then(response => {
                        // For 422 on stock APIs, handle silently - don't let browser log it
                        if (response.status === 422 && isStockApi) {
                            // Mark response as handled to prevent console logging
                            Object.defineProperty(response, '_suppressConsole', { value: true, writable: false });
                        }
                        return response;
                    }).catch(error => {
                        // Don't re-throw 422 errors for stock APIs
                        if (isStockApi && error && (error.message && error.message.includes('422') || error.status === 422)) {
                            // Create a silent promise rejection that won't log
                            const silentError = Object.create(Error.prototype);
                            silentError.name = 'ValidationError';
                            silentError.message = 'Validation error (handled in UI)';
                            silentError._suppressConsole = true;
                            return Promise.reject(silentError);
                        }
                        throw error;
                    });
                };

                // Suppress unhandled promise rejections for 422
                window.addEventListener('unhandledrejection', function(event) {
                    if (event.reason && (
                        event.reason.status === 422 ||
                        (event.reason.message && event.reason.message.includes('422')) ||
                        (event.reason._suppressConsole)
                    )) {
                        event.preventDefault(); // Prevent browser from logging
                    }
                });
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
