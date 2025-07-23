import { type NextRequest, NextResponse } from "next/server"
import {
  getFilesFromFolder,
  readSheetData,
  getCourseInfoFromData,
  extractGradesFromRow,
  FOLDER_IDS,
  type Student,
} from "@/lib/google-drive"

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get("q")
    const cuatrimestre = searchParams.get("cuatrimestre") || "todos"
    const tipo = searchParams.get("tipo") || "alumno"

    if (!query) {
      return NextResponse.json({ error: "Parámetro q requerido" }, { status: 400 })
    }

    const resultados: Student[] = []

    // Procesar cada carpeta
    for (const [especialidad, folderId] of Object.entries(FOLDER_IDS)) {
      try {
        const files = await getFilesFromFolder(folderId)

        for (const file of files) {
          if (!file.id || !file.name) continue

          // Solo procesar Google Sheets
          if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
            try {
              const sheetData = await readSheetData(file.id)
              const cursoInfo = getCourseInfoFromData(sheetData[0]?.data) || file.name

              // Filtrar por curso si es búsqueda por curso
              if (tipo === "curso") {
                const matchesCourse =
                  file.name.toLowerCase().includes(query.toLowerCase()) ||
                  cursoInfo.toLowerCase().includes(query.toLowerCase())
                if (!matchesCourse) continue
              }

              // Procesar cada hoja del archivo
              for (const sheet of sheetData) {
                const nombreMateria = sheet.name
                const data = sheet.data

                // Procesar desde la fila 11 (índice 10)
                for (let i = 10; i < data.length; i++) {
                  const fila = data[i]
                  const nombreAlumno = fila[1] // Columna B

                  if (!nombreAlumno || nombreAlumno.toString().trim() === "") continue

                  // Filtrar por alumno si es búsqueda por alumno
                  if (tipo === "alumno") {
                    const matchesStudent = nombreAlumno.toString().toLowerCase().includes(query.toLowerCase())
                    if (!matchesStudent) continue
                  }

                  // Buscar o crear estudiante en resultados
                  let estudiante = resultados.find((r) => r.nombre === nombreAlumno.toString())
                  if (!estudiante) {
                    estudiante = {
                      nombre: nombreAlumno.toString(),
                      calificaciones: [],
                    }
                    resultados.push(estudiante)
                  }

                  // Extraer calificaciones
                  const calificaciones = extractGradesFromRow(fila, nombreMateria, cursoInfo, cuatrimestre)
                  estudiante.calificaciones.push(...calificaciones)
                }
              }
            } catch (fileError) {
              console.error(`Error procesando archivo ${file.name}:`, fileError)
            }
          }
        }
      } catch (folderError) {
        console.error(`Error en carpeta ${especialidad}:`, folderError)
      }
    }

    return NextResponse.json(resultados)
  } catch (error) {
    console.error("Error buscando estudiantes:", error)
    return NextResponse.json({ error: "Error interno del servidor", details: error }, { status: 500 })
  }
}
