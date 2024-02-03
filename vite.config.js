// vite.config.js
import glsl from 'vite-plugin-glsl'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [glsl()],
	base: '/my-trips/',
	build: {
		target: 'esnext'
	}
})
