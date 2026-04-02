import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: Se o nome do teu repositório no GitHub for diferente de 'metro-porto-app',
  // tens de alterar o nome aqui em baixo entre as barras.
  base: '/metro-porto-app/', 
})