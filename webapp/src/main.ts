import './style.css'
import { setupCounter } from './counter.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div class="p-8">
        <div class="flex justify-center space-x-4 mb-8">
          <div class="w-24 h-24 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-2xl">V</div>
          <div class="w-24 h-24 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">TS</div>
        </div>
        <h1 class="text-3xl font-bold text-center text-gray-900 mb-8">Vite + TypeScript + Tailwind</h1>
        
        <div class="text-center">
          <button id="counter" type="button" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"></button>
        </div>
        
        <p class="text-center text-gray-600 mt-8">
          Edit <code class="bg-gray-200 px-2 py-1 rounded">src/main.ts</code> and save to test HMR
        </p>
        
        <div class="mt-8 p-4 bg-green-100 rounded-lg">
          <p class="text-green-800 text-sm">✅ Vite + TypeScript + Tailwind CSS + Bun setup complete!</p>
        </div>
      </div>
    </div>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)