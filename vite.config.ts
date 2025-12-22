import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

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
    process.env.CI === 'true' ||
    process.env.NETLIFY === 'true' ||
    process.env.NETLIFY_CI === 'true' ||
    process.env.CONTINUOUS_INTEGRATION === 'true';

// Enable wayfinder only if:
// 1. Not in CI environment, OR
// 2. Explicitly enabled via ENABLE_WAYFINDER env var
const shouldUseWayfinder = !isCI || process.env.ENABLE_WAYFINDER === 'true';

if (shouldUseWayfinder) {
    plugins.push(
        wayfinder({
            formVariants: true,
        })
    );
}

export default defineConfig({
    plugins,
    esbuild: {
        jsx: 'automatic',
    },
});
