'use client'

import React from 'react'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-blue-600 border border-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700 transition-colors font-medium cursor-pointer"
    >
      🖨️ PDF Seç & Yazdır
    </button>
  )
}
