import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';
export default defineConfig({
  plugins: [{
    name: 'app-jsx',
    enforce: 'pre',
    async transform(code, id) {
      if (/\/(app|components)\/.*\.(js|jsx)$/.test(id)) {
        return transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } });
      }
    }
  }],
  test: { environment: 'jsdom', include: ['tests/**/*.test.jsx'], clearMocks: true }
});
