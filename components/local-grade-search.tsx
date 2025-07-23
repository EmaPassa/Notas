"use client"

import { useState, useMemo } from "react"
import { Search, GraduationCap, BookOpen, Calendar, TrendingUp, Users, FileText, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ExcelFile {
  name: string
  size: number
  data: any[][]
  sheets: { name: string; data: any[][] }[]
  lastModified: number
}

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

interface LocalGradeSearchProps {
  files: ExcelFile[]
}

export function LocalGradeSearch({ files }: LocalGradeSearchProps) {
  const [searchType, setSearchType] = useState<"alumno" | "curso">("alumno")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("todos")
  const [results, setResults] = useState<Student[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Procesar archivos para extraer datos
  const processedData = useMemo(() => {
    const students: Student[] = []
    const courses = new Set<string>()
    const subjects = new Set<string>()
    let totalGrades = 0

    files.forEach((file) => {
      const courseInfo = getCourseInfoFromData(file.data) || file.name.replace(/\.(xlsx|xls)$/i, "")
      courses.add(courseInfo)

      file.sheets.forEach((sheet) => {
        const subjectName = sheet.name
        subjects.add(subjectName)
        const data = sheet.data

        // Procesar desde la fila 11 (índice 10)
        for (let i = 10; i < data.length; i++) {
          const row = data[i]
          const studentName = row[1] // Columna B

          if (studentName && studentName.toString().trim() !== "") {
            let student = students.find((s) => s.nombre === studentName.toString())
            if (!student) {
              student = {
                nombre: studentName.toString(),
                calificaciones: [],
              }
              students.push(student)
            }

            const grades = extractGradesFromRow(row, subjectName, courseInfo, "todos")
            student.calificaciones.push(...grades)
            totalGrades += grades.length
          }
        }
      })
    })

    return {
      students,
      courses: Array.from(courses),
      subjects: Array.from(subjects),
      totalGrades,
    }
  }, [files])

  const getCourseInfoFromData = (data: any[][]): string | null => {
    try {
      if (data.length >= 7) {
        const row7 = data[6] // Fila 7 (índice 6)
        const year = row7[0] ? row7[0].toString().replace("AÑO:", "").trim() : ""
        const section = row7[1] ? row7[1].toString().replace("SECCIÓN:", "").trim() : ""

        if (year && section) {
          return `${year} ${section}`
        }
      }
      return null
    } catch (error) {
      return null
    }
  }

  const cleanGrade = (value: any): number | "Sin nota" | null => {
    if (value === null || value === undefined || value === "") return null

    const valueStr = value.toString().trim().toLowerCase()

    if (valueStr === "s/e" || valueStr === "sin evaluar" || valueStr === "" || valueStr === "null") {
      return "Sin nota"
    }

    const number = Number.parseFloat(valueStr)
    if (!isNaN(number) && number >= 0 && number <= 10) {
      return number
    }

    return null
  }

  const extractGradesFromRow = (
    row: any[],
    subjectName: string,
    courseName: string,
    semesterFilter: string,
  ): Grade[] => {
    const grades: Grade[] = []

    try {
      // 1º Cuatrimestre - Columna J (índice 9)
      if (semesterFilter === "todos" || semesterFilter === "1º") {
        const grade1 = cleanGrade(row[9])
        if (grade1 !== null) {
          grades.push({
            materia: subjectName,
            curso: courseName,
            cuatrimestre: "1º",
            nota: grade1,
          })
        }
      }

      // 2º Cuatrimestre - Columna R (índice 17)
      if (semesterFilter === "todos" || semesterFilter === "2º") {
        const grade2 = cleanGrade(row[17])
        if (grade2 !== null) {
          grades.push({
            materia: subjectName,
            curso: courseName,
            cuatrimestre: "2º",
            nota: grade2,
          })
        }
      }

      // Final - Columna W (índice 22)
      if (semesterFilter === "todos" || semesterFilter === "Final") {
        const gradeFinal = cleanGrade(row[22])
        if (gradeFinal !== null) {
          grades.push({
            materia: subjectName,
            curso: courseName,
            cuatrimestre: "Final",
            nota: gradeFinal,
          })
        }
      }

      return grades
    } catch (error) {
      return []
    }
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)

    setTimeout(() => {
      let filteredResults: Student[] = []

      if (searchType === "alumno") {
        filteredResults = processedData.students.filter((student) =>
          student.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      } else {
        filteredResults = processedData.students.filter((student) =>
          student.calificaciones.some((grade) => grade.curso.toLowerCase().includes(searchQuery.toLowerCase())),
        )
      }

      // Filtrar por cuatrimestre
      if (selectedSemester !== "todos") {
        filteredResults = filteredResults
          .map((student) => ({
            ...student,
            calificaciones: student.calificaciones.filter((grade) => grade.cuatrimestre === selectedSemester),
          }))
          .filter((student) => student.calificaciones.length > 0)
      }

      setResults(filteredResults)
      setIsSearching(false)
    }, 500)
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

  const getStudentStats = (student: Student) => {
    const grades = student.calificaciones.filter((g) => typeof g.nota === "number")
    const approved = grades.filter((g) => typeof g.nota === "number" && g.nota >= 7).length
    const failed = grades.filter((g) => typeof g.nota === "number" && g.nota < 7).length
    const pending = student.calificaciones.filter((g) => g.nota === "Sin nota").length

    return { approved, failed, pending, total: student.calificaciones.length }
  }

  if (files.length === 0) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No hay archivos cargados</h3>
          <p className="text-yellow-700">Sube archivos Excel para comenzar a buscar calificaciones</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-800">{processedData.students.length}</p>
                <p className="text-sm text-green-600">Estudiantes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-800">{processedData.courses.length}</p>
                <p className="text-sm text-blue-600">Cursos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-800">{processedData.subjects.length}</p>
                <p className="text-sm text-purple-600">Materias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-800">{processedData.totalGrades}</p>
                <p className="text-sm text-yellow-600">Calificaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulario de búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Search className="h-5 w-5" />
            Buscar Calificaciones
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
              {searchType === "curso" ? (
                <Select value={searchQuery} onValueChange={setSearchQuery}>
                  <SelectTrigger className="border-green-300 focus:border-green-500">
                    <SelectValue placeholder="Selecciona un curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {processedData.courses.map((course) => (
                      <SelectItem key={course} value={course}>
                        {course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Nombre del alumno..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-green-300 focus:border-green-500"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              )}
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

          <Button
            onClick={handleSearch}
            className="w-full bg-green-600 hover:bg-green-700"
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
                Buscar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              Resultados ({results.length} estudiante{results.length !== 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {results.map((student, index) => {
                const stats = getStudentStats(student)
                return (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-green-600" />
                        {student.nombre}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">{stats.approved} aprobadas</Badge>
                        <Badge className="bg-red-100 text-red-800">{stats.failed} desaprobadas</Badge>
                        <Badge className="bg-gray-100 text-gray-800">{stats.pending} pendientes</Badge>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Materia</TableHead>
                            <TableHead>Curso</TableHead>
                            <TableHead>Cuatrimestre</TableHead>
                            <TableHead>Nota</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {student.calificaciones.map((grade, gradeIndex) => (
                            <TableRow key={gradeIndex} className="hover:bg-green-50">
                              <TableCell className="font-medium">{grade.materia}</TableCell>
                              <TableCell>{grade.curso}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-green-300 text-green-700">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {grade.cuatrimestre}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getGradeColor(grade.nota)}>{grade.nota}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length === 0 && searchQuery && !isSearching && (
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
  )
}
