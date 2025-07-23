"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, GraduationCap, AlertTriangle, ExternalLink, Upload, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CollegeHeader } from "@/components/college-header"

export default function HomePage() {
  const [searchType, setSearchType] = useState<"alumno" | "curso">("alumno")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("todos")
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        tipo: searchType,
        q: searchQuery,
        cuatrimestre: selectedSemester,
      })

      const response = await fetch(`/api/gas?${params}`)
      const data = await response.json()

      if (response.ok) {
        setResults(Array.isArray(data) ? data : [])
      } else {
        setError(data.error || "Error en la búsqueda")
        setResults([])
      }
    } catch (err) {
      setError("Error de conexión. La API no está disponible.")
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const getGradeColor = (nota: number | "Sin nota") => {
    if (nota === "Sin nota") return "bg-gray-100 text-gray-800"
    if (typeof nota === "number") {
      if (nota >= 7) return "bg-green-100 text-green-800"
      if (nota >= 4) return "bg-yellow-100 text-yellow-800"
      return "bg-red-100 text-red-800"
    }
    return "bg-gray-100 text-gray-800"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CollegeHeader title="Sistema de Calificaciones" subtitle="Consulta de notas y rendimiento académico" />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Alerta de recomendación */}
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Recomendación:</strong> Para mayor privacidad y funcionalidad completa, usa la{" "}
            <Link href="/local" className="underline font-semibold hover:text-yellow-900">
              versión local
            </Link>{" "}
            que procesa archivos Excel directamente en tu navegador.
          </AlertDescription>
        </Alert>

        {/* Características del sistema */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <Upload className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">Carga Local</h3>
              <p className="text-green-700 text-sm">Sube archivos Excel directamente desde tu computadora</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Privacidad Total</h3>
              <p className="text-blue-700 text-sm">
                Los datos se procesan localmente, sin enviar información a servidores
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-6 text-center">
              <Zap className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Búsqueda Rápida</h3>
              <p className="text-purple-700 text-sm">Encuentra calificaciones por alumno o curso instantáneamente</p>
            </CardContent>
          </Card>
        </div>

        {/* Formulario de búsqueda online */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Search className="h-5 w-5" />
              Búsqueda Online (Experimental)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={searchType} onValueChange={(value: "alumno" | "curso") => setSearchType(value)}>
                <SelectTrigger className="border-green-300 focus:border-green-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alumno">Buscar por Alumno</SelectItem>
                  <SelectItem value="curso">Buscar por Curso</SelectItem>
                </SelectContent>
              </Select>

              <div className="md:col-span-2">
                <Input
                  placeholder={searchType === "alumno" ? "Nombre del alumno..." : "Nombre del curso..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-green-300 focus:border-green-500"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="border-green-300 focus:border-green-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los cuatrimestres</SelectItem>
                  <SelectItem value="1º">1º Cuatrimestre</SelectItem>
                  <SelectItem value="2º">2º Cuatrimestre</SelectItem>
                  <SelectItem value="Final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSearch}
                className="bg-green-600 hover:bg-green-700"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar Online
                  </>
                )}
              </Button>

              <Button
                asChild
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50 bg-transparent"
              >
                <Link href="/local">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Usar Versión Local
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Resultados */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <GraduationCap className="h-5 w-5" />
                Resultados ({results.length} estudiante{results.length !== 1 ? "s" : ""})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((student, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-green-600" />
                      {student.nombre}
                    </h3>
                    <div className="grid gap-2">
                      {student.calificaciones?.map((grade: any, gradeIndex: number) => (
                        <div key={gradeIndex} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{grade.materia}</span>
                            <span className="text-sm text-gray-600">{grade.curso}</span>
                            <Badge variant="outline" className="border-green-300 text-green-700">
                              {grade.cuatrimestre}
                            </Badge>
                          </div>
                          <Badge className={getGradeColor(grade.nota)}>{grade.nota}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {results.length === 0 && searchQuery && !isSearching && !error && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6 text-center">
              <Search className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">No se encontraron resultados</h3>
              <p className="text-yellow-700">
                No hay {searchType === "alumno" ? "estudiantes" : "cursos"} que coincidan con "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <footer className="bg-gradient-to-r from-green-600 to-yellow-500 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg font-semibold mb-2">E.E.S.T. Nº 6 BANFIELD - LOMAS DE ZAMORA</p>
          <p className="text-sm opacity-90">Sistema de Consulta de Calificaciones</p>
        </div>
      </footer>
    </div>
  )
}
