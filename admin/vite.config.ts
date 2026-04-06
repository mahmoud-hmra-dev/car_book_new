import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createHtmlPlugin } from 'vite-plugin-html'

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }

  return defineConfig({
    plugins: [
      tailwindcss(),
      react({
        // Babel optimizations
        babel: {
          plugins: [
            ['@babel/plugin-transform-runtime'],
            ['babel-plugin-react-compiler', { optimize: true }],
          ],
        },
      }),
      createHtmlPlugin({
        inject: {
          data: {
            WEBSITE_NAME: process.env.VITE_BC_WEBSITE_NAME || 'BookCars',
          },
        },
      }),
    ],

    resolve: {
      preserveSymlinks: true,
      alias: {
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),

        '@': path.resolve(__dirname, './src'),
        ':bookcars-types': path.resolve(__dirname, '../packages/bookcars-types'),
        ':bookcars-helper': path.resolve(__dirname, '../packages/bookcars-helper'),
        ':disable-react-devtools': path.resolve(__dirname, '../packages/disable-react-devtools'),
        ':currency-converter': path.resolve(__dirname, '../packages/currency-converter'),
      },
    },

    server: {
      host: '0.0.0.0',
      port: Number.parseInt(process.env.VITE_PORT || '3001', 10),
      watch: {
        usePolling: true,
        interval: 2000,
      },
      hmr: {
        protocol: 'ws',
        host: process.env.VITE_HMR_HOST || 'localhost',
        port: Number.parseInt(process.env.VITE_HMR_PORT || '3001', 10),
        clientPort: Number.parseInt(process.env.VITE_HMR_CLIENT_PORT || '3001', 10),
      },
    },
    build: {
      outDir: 'build', // Output directory
      target: 'esnext', // Use esnext to ensure the best performance
      modulePreload: true, // Keep modulePreload enabled to ensure the best performance
      sourcemap: false, // Disable sourcemaps in production
      cssCodeSplit: true, // Enable CSS code splitting

      // Minification settings (esbuild is 10-100x faster than terser with similar output)
      minify: 'esbuild',

      // Control chunk size
      chunkSizeWarningLimit: 1000, // Warn if a chunk exceeds 1000kb

      // Chunk splitting strategy
      rollupOptions: {
        treeshake: true, // Enable Tree Shaking: Ensure unused code is removed by leveraging ES modules and proper imports
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'], // Create a separate vendor chunk
            router: ['react-router-dom'], // Create a separate router chunk
          },
          // Generate chunk names
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'entries/[name]-[hash].js',
        },
      },
      assetsInlineLimit: 8192, // This reduces the number of small chunk files
    },
  })
}
