/**
 * Aegis Nexus アプリケーション・エントリーポイント
 * 
 * このファイルは React アプリケーションのルートを初期化します。
 * 開発時には StrictMode を有効にし、潜在的な問題を早期に発見できる構成としています。
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
