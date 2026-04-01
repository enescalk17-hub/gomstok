'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-xl shadow-sm font-medium transition-colors">
      Yazdır / PDF
    </button>
  )
}
