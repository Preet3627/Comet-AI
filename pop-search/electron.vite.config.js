import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                external: ['electron'],
                input: {
                    index: resolve(__dirname, 'src/main/index.js')
                }
            }
        }
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/preload/index.js')
                }
            }
        }
    },
    renderer: {
        root: 'src/renderer',
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/renderer/settings/index.html'),
                    popup: resolve(__dirname, 'src/renderer/popup/index.html')
                }
            }
        }
    }
})
