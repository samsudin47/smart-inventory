import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';
import path from 'path';

const plugins = [
    laravel({
        input: ['resources/css/app.css', 'resources/js/app.tsx'],
        ssr: 'resources/js/ssr.tsx',
        refresh: true,
    }),
    react(),
    tailwindcss(),
];

// Only enable wayfinder when PHP is available
// Skip during CI/CD builds (Netlify, etc.) where PHP might not be available
// Wayfinder types should be pre-generated and committed to the repository
const isCI =
    process.env.CI === 'true' || process.env.NETLIFY === 'true' || process.env.NETLIFY_CI === 'true' || process.env.CONTINUOUS_INTEGRATION === 'true';

// Skip wayfinder if:
// 1. SKIP_WAYFINDER env var is set to 'true', OR
// 2. Building in production mode (mode === 'production')
const skipWayfinder = process.env.SKIP_WAYFINDER === 'true' || process.env.NODE_ENV === 'production' || process.env.MODE === 'production';

// Enable wayfinder only if:
// 1. Not in CI environment, AND
// 2. Not explicitly skipped, AND
// 3. Explicitly enabled via ENABLE_WAYFINDER env var (if in CI)
const shouldUseWayfinder = !skipWayfinder && (!isCI || process.env.ENABLE_WAYFINDER === 'true');

if (shouldUseWayfinder) {
    plugins.push(
        wayfinder({
            formVariants: true,
            // Try to use PHP from PATH, or skip if not found
            php: process.env.PHP_BINARY || 'php',
            // Ensure command runs from project root
            cwd: process.cwd(),
        }),
    );
}

export default defineConfig(({ mode }) => {
    return {
        plugins,
        resolve: {
            alias: {
                '@': path.resolve(process.cwd(), 'resources/js'),
            },
        },
        esbuild: {
            jsx: 'automatic',
        },
    };
});
