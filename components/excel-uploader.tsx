"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileSpreadsheet, X, Download, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import * as XLSX from "xlsx"

interface ExcelFile {
  name: string
  size: number
  data: any[][]
  sheets: { name: string; data: any[][] }[]
  lastModified: number
}

interface ExcelUploaderProps {
  files: ExcelFile[]
  onFilesChange: (files: ExcelFile[]) => void
  sampleFiles?: ExcelFile[]
}

export function ExcelUploader({ files, onFilesChange, sampleFiles = [] }: ExcelUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const processExcelFile = useCallback(async (file: File): Promise<ExcelFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })

          const sheets = workbook.SheetNames.map((sheetName) => {
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
            return {
              name: sheetName,
              data: jsonData as any[][],
            }
          })

          const excelFile: ExcelFile = {
            name: file.name,
            size: file.size,
            data: sheets[0]?.data || [],
            sheets,
            lastModified: file.lastModified,
          }

          resolve(excelFile)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error("Error reading file"))
      reader.readAsArrayBuffer(file)
    })
  }, [])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsProcessing(true)
      try {
        const processedFiles = await Promise.all(acceptedFiles.map((file) => processExcelFile(file)))
        onFilesChange([...files, ...processedFiles])
      } catch (error) {
        console.error("Error processing files:", error)
      } finally {
        setIsProcessing(false)
      }
    },
    [files, onFilesChange, processExcelFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: true,
  })

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  const downloadFile = (file: ExcelFile) => {
    const ws = XLSX.utils.aoa_to_sheet(file.data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
    XLSX.writeFile(wb, file.name)
  }

  const loadSampleFiles = () => {
    onFilesChange([...files, ...sampleFiles])
  }

  const clearAllFiles = () => {
    onFilesChange([])
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Zona de carga */}
      <Card className="border-2 border-dashed border-green-300 hover:border-green-500 transition-colors">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`text-center cursor-pointer transition-colors ${
              isDragActive ? "text-green-600" : "text-gray-600"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 mb-4 text-green-500" />
            {isProcessing ? (
              <div className="space-y-2">
                <p className="text-lg font-medium">Procesando archivos...</p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              </div>
            ) : isDragActive ? (
              <p className="text-lg font-medium">Suelta los archivos aquí...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">Arrastra archivos Excel aquí o haz click para seleccionar</p>
                <p className="text-sm text-gray-500">Soporta archivos .xlsx y .xls</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controles */}
      <div className="flex flex-wrap gap-3">
        {sampleFiles.length > 0 && (
          <Button
            onClick={loadSampleFiles}
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50 bg-transparent"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Cargar Archivos de Ejemplo
          </Button>
        )}
        {files.length > 0 && (
          <Button
            onClick={clearAllFiles}
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-50 bg-transparent"
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar Todo
          </Button>
        )}
      </div>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <FileSpreadsheet className="h-5 w-5" />
              Archivos Cargados ({files.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>
                          {file.sheets.length} hoja{file.sheets.length !== 1 ? "s" : ""}
                        </span>
                        <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {file.data.length} filas
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(file)}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFile(index)}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
