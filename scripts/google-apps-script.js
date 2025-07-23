// Google Apps Script para leer calificaciones desde Google Drive
// Este código debe copiarse en script.google.com

// IDs de las carpetas de Google Drive
const FOLDER_IDS = {
  alimentos: "1S8rb_MQzw3gk2oINyrJlOVcGFz_4Ilx1",
  "ciclo-basico": "1KlL6VwcTKtPwoTeinY3Lr0ZXbAn0z2Ek",
  electromecanica: "1KlL6VwcTKtPwoTeinY3Lr0ZXbAn0z2Ek", // Verificar si este ID es correcto
  "maestro-mayor-obra": "1nfm9VtYRh7zdjB20WWtp7k6vxBPiZ9uk",
}

// Función principal que maneja las peticiones HTTP
function doGet(e) {
  try {
    const tipo = e.parameter.tipo
    const query = e.parameter.q
    const cuatrimestre = e.parameter.cuatrimestre || "todos"

    console.log(`Búsqueda: tipo=${tipo}, query=${query}, cuatrimestre=${cuatrimestre}`)

    if (tipo === "cursos") {
      return ContentService.createTextOutput(JSON.stringify(getCursos())).setMimeType(ContentService.MimeType.JSON)
    }

    if (tipo === "alumno") {
      const resultados = buscarPorAlumno(query, cuatrimestre)
      return ContentService.createTextOutput(JSON.stringify(resultados)).setMimeType(ContentService.MimeType.JSON)
    }

    if (tipo === "curso") {
      const resultados = buscarPorCurso(query, cuatrimestre)
      return ContentService.createTextOutput(JSON.stringify(resultados)).setMimeType(ContentService.MimeType.JSON)
    }

    return ContentService.createTextOutput(JSON.stringify({ error: "Tipo de búsqueda no válido" })).setMimeType(
      ContentService.MimeType.JSON,
    )
  } catch (error) {
    console.error("Error en doGet:", error)
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() })).setMimeType(
      ContentService.MimeType.JSON,
    )
  }
}

// Obtener lista de cursos disponibles
function getCursos() {
  const cursos = []

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
      const files = folder.getFiles()

      while (files.hasNext()) {
        const file = files.next()
        if (file.getName().includes(".xlsx") || file.getName().includes(".xls")) {
          const nombreCurso = file.getName().replace(/\.(xlsx|xls)$/i, "")
          cursos.push(`${nombreCurso} - ${especialidad.replace("-", " ").toUpperCase()}`)
        }
      }
    })

    return { cursos: cursos.sort() }
  } catch (error) {
    console.error("Error obteniendo cursos:", error)
    return { cursos: [], error: error.toString() }
  }
}

// Buscar por nombre de alumno
function buscarPorAlumno(nombreAlumno, filtroCuatrimestre) {
  const resultados = []

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
      const files = folder.getFiles()

      while (files.hasNext()) {
        const file = files.next()
        if (file.getName().includes(".xlsx") || file.getName().includes(".xls")) {
          const nombreCurso = file.getName().replace(/\.(xlsx|xls)$/i, "")
          const alumnosEncontrados = buscarAlumnoEnArchivo(file, nombreAlumno, nombreCurso, filtroCuatrimestre)
          resultados.push(...alumnosEncontrados)
        }
      }
    })

    return resultados
  } catch (error) {
    console.error("Error buscando alumno:", error)
    return [{ error: error.toString() }]
  }
}

// Buscar por curso
function buscarPorCurso(nombreCurso, filtroCuatrimestre) {
  const resultados = []

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
      const files = folder.getFiles()

      while (files.hasNext()) {
        const file = files.next()
        const nombreArchivo = file.getName().replace(/\.(xlsx|xls)$/i, "")

        if (nombreArchivo.toLowerCase().includes(nombreCurso.toLowerCase())) {
          const todosLosAlumnos = obtenerTodosLosAlumnosDelArchivo(file, nombreArchivo, filtroCuatrimestre)
          resultados.push(...todosLosAlumnos)
        }
      }
    })

    return resultados
  } catch (error) {
    console.error("Error buscando curso:", error)
    return [{ error: error.toString() }]
  }
}

// Buscar alumno específico en un archivo
function buscarAlumnoEnArchivo(file, nombreAlumno, nombreCurso, filtroCuatrimestre) {
  const resultados = []

  try {
    const spreadsheet = SpreadsheetApp.openById(file.getId())
    const sheets = spreadsheet.getSheets()

    sheets.forEach((sheet) => {
      const nombreMateria = sheet.getName()
      const data = sheet.getDataRange().getValues()

      // Buscar la fila del alumno
      for (let i = 0; i < data.length; i++) {
        const fila = data[i]
        const nombreEnFila = fila[1] // Columna B generalmente tiene los nombres

        if (nombreEnFila && nombreEnFila.toString().toLowerCase().includes(nombreAlumno.toLowerCase())) {
          const alumnoExistente = resultados.find((r) => r.nombre === nombreEnFila)

          if (!alumnoExistente) {
            resultados.push({
              nombre: nombreEnFila,
              calificaciones: [],
            })
          }

          const alumno = resultados.find((r) => r.nombre === nombreEnFila)
          const calificaciones = extraerCalificacionesDeFilaAlumno(fila, nombreMateria, nombreCurso, filtroCuatrimestre)
          alumno.calificaciones.push(...calificaciones)
        }
      }
    })

    return resultados
  } catch (error) {
    console.error("Error procesando archivo:", error)
    return []
  }
}

// Obtener todos los alumnos de un archivo (para búsqueda por curso)
function obtenerTodosLosAlumnosDelArchivo(file, nombreCurso, filtroCuatrimestre) {
  const resultados = []

  try {
    const spreadsheet = SpreadsheetApp.openById(file.getId())
    const sheets = spreadsheet.getSheets()

    sheets.forEach((sheet) => {
      const nombreMateria = sheet.getName()
      const data = sheet.getDataRange().getValues()

      // Procesar cada fila de estudiantes
      for (let i = 10; i < data.length; i++) {
        // Empezar desde fila 11 (índice 10) según la imagen
        const fila = data[i]
        const nombreAlumno = fila[1] // Columna B

        if (nombreAlumno && nombreAlumno.toString().trim() !== "") {
          let alumnoExistente = resultados.find((r) => r.nombre === nombreAlumno)

          if (!alumnoExistente) {
            alumnoExistente = {
              nombre: nombreAlumno,
              calificaciones: [],
            }
            resultados.push(alumnoExistente)
          }

          const calificaciones = extraerCalificacionesDeFilaAlumno(fila, nombreMateria, nombreCurso, filtroCuatrimestre)
          alumnoExistente.calificaciones.push(...calificaciones)
        }
      }
    })

    return resultados
  } catch (error) {
    console.error("Error obteniendo alumnos del archivo:", error)
    return []
  }
}

// Extraer calificaciones de una fila de alumno
function extraerCalificacionesDeFilaAlumno(fila, nombreMateria, nombreCurso, filtroCuatrimestre) {
  const calificaciones = []

  try {
    // Basándome en la estructura de la imagen:
    // Columna E (índice 4): 1º Cuatrimestre - 1ª Evaluación
    // Columna F (índice 5): 1º Cuatrimestre - 2ª Evaluación
    // Columna G (índice 6): 1º Cuatrimestre - 3ª Evaluación
    // Y así sucesivamente para 2º cuatrimestre...

    // 1º Cuatrimestre
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "1º") {
      const nota1C = obtenerNotaLimpia(fila[4]) // Columna E
      if (nota1C !== null) {
        calificaciones.push({
          materia: nombreMateria,
          curso: nombreCurso,
          cuatrimestre: "1º",
          nota: nota1C,
        })
      }
    }

    // 2º Cuatrimestre (ajustar índices según la estructura real)
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "2º") {
      const nota2C = obtenerNotaLimpia(fila[10]) // Ajustar según columna real
      if (nota2C !== null) {
        calificaciones.push({
          materia: nombreMateria,
          curso: nombreCurso,
          cuatrimestre: "2º",
          nota: nota2C,
        })
      }
    }

    // Final (ajustar índices según la estructura real)
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "Final") {
      const notaFinal = obtenerNotaLimpia(fila[16]) // Ajustar según columna real
      if (notaFinal !== null) {
        calificaciones.push({
          materia: nombreMateria,
          curso: nombreCurso,
          cuatrimestre: "Final",
          nota: notaFinal,
        })
      }
    }

    return calificaciones
  } catch (error) {
    console.error("Error extrayendo calificaciones:", error)
    return []
  }
}

// Limpiar y validar notas
function obtenerNotaLimpia(valor) {
  if (!valor || valor === "") return null

  const valorStr = valor.toString().trim().toLowerCase()

  // Casos especiales
  if (valorStr === "s/e" || valorStr === "sin evaluar" || valorStr === "") {
    return "Sin nota"
  }

  // Intentar convertir a número
  const numero = Number.parseFloat(valorStr)
  if (!isNaN(numero) && numero >= 0 && numero <= 10) {
    return numero
  }

  return null
}

// Función de prueba (opcional)
function testScript() {
  console.log("Probando script...")
  const cursos = getCursos()
  console.log("Cursos encontrados:", cursos)

  const alumno = buscarPorAlumno("ACEVEDO", "todos")
  console.log("Búsqueda de alumno:", alumno)
}
