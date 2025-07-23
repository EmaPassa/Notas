"use client"

import { useState } from "react"
import { CollegeHeader } from "@/components/college-header"
import { ExcelUploader } from "@/components/excel-uploader"
import { LocalGradeSearch } from "@/components/local-grade-search"

interface ExcelFile {
  name: string
  size: number
  data: any[][]
  sheets: { name: string; data: any[][] }[]
  lastModified: number
}

// Archivos de ejemplo precargados (puedes agregar más aquí)
const sampleFiles: ExcelFile[] = [
  // Aquí puedes agregar archivos de ejemplo cuando los subas al chat
]

export default function LocalPage() {
  const [files, setFiles] = useState<ExcelFile[]>(sampleFiles)

  return (
    <div className="min-h-screen bg-gray-50">
      <CollegeHeader
        title="Sistema de Calificaciones Local"
        subtitle="Carga y consulta archivos Excel de forma privada y segura"
      />

      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">i</span>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Sistema Local y Privado</h3>
              <p className="text-blue-800 text-sm">
                Todos los archivos se procesan localmente en tu navegador. No se envían datos a servidores externos,
                garantizando la privacidad de la información.
              </p>
            </div>
          </div>
        </div>

        <ExcelUploader files={files} onFilesChange={setFiles} sampleFiles={sampleFiles} />

        <LocalGradeSearch files={files} />
      </div>

      <footer className="bg-gradient-to-r from-green-600 to-yellow-500 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg font-semibold mb-2">E.E.S.T. Nº 6 BANFIELD - LOMAS DE ZAMORA</p>
          <p className="text-sm opacity-90">Sistema de Consulta de Calificaciones - Versión Local</p>
        </div>
      </footer>
    </div>
  )
}
