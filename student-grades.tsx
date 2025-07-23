"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, CheckCircle, XCircle, Loader2, List, Wifi, GraduationCap, Upload } from "lucide-react"
import CollegeHeader from "@/components/college-header"

interface Grade {
  materia: string
  curso: string
  cuatrimestre: "1º" | "2º" | "Final"
  nota: number | "Sin nota"
}

interface Student {
  nombre: string
  calificaciones: Grade[]
}

export default function Component() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState<"alumno" | "curso">("alumno")
  const [results, setResults] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [availableCourses, setAvailableCourses] = useState<string[]>([])
  const [showCourses, setShowCourses] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [filterCuatrimestre, setFilterCuatrimestre] = useState<"todos" | "1º" | "2º" | "Final">("todos")
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown")

  const getGradeColor = (nota: number | "Sin nota") => {
    if (nota === "Sin nota") return "bg-gray-100 text-gray-600"
    if (nota >= 7) return "bg-green-100 text-green-800 border-green-300"
    return "bg-red-100 text-red-800 border-red-300"
  }

  const testConnection = async () => {
    try {
      const response = await fetch("/api/test-connection")
      const data = await response.json()

      if (data.conexion?.exito) {
        setConnectionStatus("connected")
      } else {
        setConnectionStatus("error")
      }

      console.log("Estado de conexión:", data)
    } catch (error) {
      setConnectionStatus("error")
      console.error("Error probando conexión:", error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setHasSearched(true)

    try {
      const apiUrl = `/api/students?tipo=${searchType}&q=${encodeURIComponent(searchQuery)}&cuatrimestre=${filterCuatrimestre}`

      console.log("Llamando a API:", apiUrl)

      const response = await fetch(apiUrl)
      const data = await response.json()

      if (data.error) {
        console.error("Error de API:", data.error)
        setResults([])
      } else {
        setResults(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error al buscar:", error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (grades: Grade[]) => {
    let approved = 0
    let failed = 0
    let pending = 0

    grades.forEach((grade) => {
      if (typeof grade.nota === "number") {
        if (grade.nota >= 7) {
          approved++
        } else {
          failed++
        }
      } else {
        pending++
      }
    })

    return { approved, failed, pending }
  }

  const fetchAvailableCourses = async () => {
    setLoadingCourses(true)
    try {
      const response = await fetch("/api/courses")
      const data = await response.json()

      if (data.error) {
        console.error("Error obteniendo cursos:", data.error)
        setAvailableCourses([])
      } else {
        setAvailableCourses(data.cursos || [])
      }
    } catch (error) {
      console.error("Error al obtener cursos:", error)
      setAvailableCourses([])
    } finally {
      setLoadingCourses(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-green-100 p-4">
      <div className="max-w-4xl mx-auto">
        <CollegeHeader
          title="Sistema de Consulta de Calificaciones"
          subtitle="Acceso directo a Google Drive - Sin Google Apps Script"
        />

        {/* Alerta para versión local */}
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg border border-yellow-600 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload className="w-6 h-6 text-gray-900" />
              <div>
                <span className="text-gray-900 font-semibold">💡 ¿Problemas de conexión?</span>
                <p className="text-gray-800 text-sm mt-1">
                  Prueba la versión local subiendo archivos Excel directamente
                </p>
              </div>
            </div>
            <a
              href="/local"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              Usar Versión Local
            </a>
          </div>
        </div>

        {/* Indicador de conexión */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                Conexión directa a Google Drive API
                {connectionStatus === "connected" && <span className="text-green-700 ml-2">✅ Conectado</span>}
                {connectionStatus === "error" && <span className="text-red-600 ml-2">❌ Error de conexión</span>}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              className="text-xs bg-white border-green-300 text-green-700 hover:bg-green-50"
            >
              Probar Conexión
            </Button>
          </div>
        </div>

        {/* Formulario de búsqueda */}
        <Card className="mb-8 shadow-lg border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Calificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder={searchType === "alumno" ? "Ingresa el nombre del alumno" : "Ingresa el nombre del curso"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12 border-green-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <Select value={searchType} onValueChange={(value: "alumno" | "curso") => setSearchType(value)}>
                <SelectTrigger className="w-full sm:w-40 h-12 border-green-300 focus:border-green-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alumno">Alumno</SelectItem>
                  <SelectItem value="curso">Curso</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>

            {/* Filtros adicionales */}
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filtrar por:</label>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Cuatrimestre:</span>
                    <Select
                      value={filterCuatrimestre}
                      onValueChange={(value: "todos" | "1º" | "2º" | "Final") => setFilterCuatrimestre(value)}
                    >
                      <SelectTrigger className="w-32 h-9 border-green-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="1º">1º Cuatrimestre</SelectItem>
                        <SelectItem value="2º">2º Cuatrimestre</SelectItem>
                        <SelectItem value="Final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Indicador de filtros activos */}
              {filterCuatrimestre !== "todos" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500">Filtros activos:</span>
                  <Badge className="text-xs bg-yellow-400 text-gray-900 hover:bg-yellow-500">
                    Cuatrimestre: {filterCuatrimestre}
                    <button onClick={() => setFilterCuatrimestre("todos")} className="ml-1 hover:text-red-600">
                      ×
                    </button>
                  </Badge>
                </div>
              )}
            </div>

            {/* Botón para ver cursos disponibles */}
            {searchType === "curso" && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!showCourses && availableCourses.length === 0) {
                      fetchAvailableCourses()
                    }
                    setShowCourses(!showCourses)
                  }}
                  disabled={loadingCourses}
                  className="w-full sm:w-auto border-green-300 text-green-700 hover:bg-green-50"
                >
                  {loadingCourses ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cargando cursos...
                    </>
                  ) : (
                    <>
                      <List className="w-4 h-4 mr-2" />
                      {showCourses ? "Ocultar" : "Ver"} cursos disponibles
                    </>
                  )}
                </Button>

                {/* Lista de cursos disponibles */}
                {showCourses && availableCourses.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3">Cursos Disponibles:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableCourses.map((course, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(course.split(" - ")[0]) // Solo el código del curso
                            setShowCourses(false)
                          }}
                          className="text-left p-3 rounded bg-white hover:bg-green-100 border border-green-300 transition-colors duration-200 text-sm"
                        >
                          <span className="font-medium text-green-800">{course.split(" - ")[0]}</span>
                          <span className="text-green-600 ml-2">{course.split(" - ")[1]}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-green-700 mt-2">
                      💡 Haz clic en cualquier curso para buscarlo automáticamente
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        {hasSearched && (
          <div className="space-y-6">
            {results.length === 0 ? (
              <Card className="shadow-lg border-yellow-200">
                <CardContent className="text-center py-12">
                  <div className="text-yellow-500 mb-2">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron resultados</h3>
                  <p className="text-gray-500">
                    Intenta con otro {searchType === "alumno" ? "nombre de alumno" : "nombre de curso"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              results.map((student, index) => {
                const stats = calculateStats(student.calificaciones)

                return (
                  <Card key={index} className="shadow-lg border-green-200">
                    <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
                      <CardTitle className="text-xl flex items-center gap-3">
                        <GraduationCap className="w-6 h-6" />
                        {student.nombre}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {/* Tabla de calificaciones */}
                      <div className="overflow-x-auto mb-6">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-green-200">
                              <TableHead className="font-semibold text-green-800">Materia</TableHead>
                              <TableHead className="font-semibold text-green-800">Curso</TableHead>
                              <TableHead className="font-semibold text-green-800">Cuatrimestre</TableHead>
                              <TableHead className="font-semibold text-green-800 text-center">Nota</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {student.calificaciones.map((grade, gradeIndex) => (
                              <TableRow key={gradeIndex} className="hover:bg-green-50 border-green-100">
                                <TableCell className="font-medium">{grade.materia}</TableCell>
                                <TableCell>{grade.curso}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-medium border-green-300 text-green-700">
                                    {grade.cuatrimestre}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={getGradeColor(grade.nota)}>{grade.nota}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Estadísticas */}
                      <div className="flex flex-wrap gap-4 justify-center">
                        <div className="flex items-center gap-2 bg-green-50 px-4 py-3 rounded-lg border border-green-200">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-800">{stats.approved} Aprobadas</span>
                        </div>
                        <div className="flex items-center gap-2 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="font-semibold text-red-800">{stats.failed} Desaprobadas</span>
                        </div>
                        {stats.pending > 0 && (
                          <div className="flex items-center gap-2 bg-yellow-50 px-4 py-3 rounded-lg border border-yellow-200">
                            <div className="w-5 h-5 rounded-full bg-yellow-500"></div>
                            <span className="font-semibold text-yellow-800">{stats.pending} Pendientes</span>
                          </div>
                        )}
                        {filterCuatrimestre !== "todos" && (
                          <div className="flex items-center gap-2 bg-yellow-50 px-4 py-3 rounded-lg border border-yellow-200">
                            <span className="font-semibold text-yellow-800">Filtrado: {filterCuatrimestre}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}

        {/* Footer institucional */}
        <div className="mt-12 text-center py-6 border-t border-green-200">
          <p className="text-sm text-gray-600">
            Sistema desarrollado para <span className="font-semibold text-green-700">E.E.S.T. Nº 6 BANFIELD</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">LOMAS DE ZAMORA</p>
        </div>
      </div>
    </div>
  )
}
