// Google Apps Script para leer calificaciones desde Google Drive - CON IDs REALES
// Este código debe copiarse en script.google.com

// Declaración de variables necesarias
const ContentService = SpreadsheetApp.newPlainTextOutput
const DriveApp = DriveApp
const SpreadsheetApp = SpreadsheetApp

// IDs de las carpetas de Google Drive - ACTUALIZADOS CON LOS IDs REALES
const FOLDER_IDS = {
  alimentos: "18N92XyXH2TWY95ur8MRag9PUfxnMJn_M",
  "ciclo-basico": "1vXS7lmmNqm0mNaAp7xxK-_0B1CwOOaST",
  electromecanica: "1hzQQMhanhF4swRbDlg3_2dhuRdxMdDbm",
  "maestro-mayor-obra": "1XEHHRVzFNfM13uNdblHbXbqI_Yw2hapm",
}

// Función principal que maneja las peticiones HTTP
function doGet(e) {
  try {
    // Validar que el objeto de evento existe
    if (!e || !e.parameter) {
      console.log("Llamada directa o sin parámetros - devolviendo datos de prueba")
      return ContentService.createTextOutput(
        JSON.stringify({
          message: "API funcionando correctamente",
          timestamp: new Date().toISOString(),
          availableEndpoints: ["?tipo=cursos", "?tipo=alumno&q=NOMBRE_ALUMNO", "?tipo=curso&q=NOMBRE_CURSO"],
        }),
      ).setMimeType(ContentService.MimeType.JSON)
    }

    const tipo = e.parameter.tipo || ""
    const query = e.parameter.q || ""
    const cuatrimestre = e.parameter.cuatrimestre || "todos"

    console.log(`Búsqueda: tipo=${tipo}, query=${query}, cuatrimestre=${cuatrimestre}`)

    // Validar parámetros requeridos
    if (!tipo) {
      return ContentService.createTextOutput(
        JSON.stringify({
          error: "Parámetro 'tipo' requerido",
          validTypes: ["cursos", "alumno", "curso"],
        }),
      ).setMimeType(ContentService.MimeType.JSON)
    }

    if (tipo === "cursos") {
      const resultados = getCursos()
      return ContentService.createTextOutput(JSON.stringify(resultados)).setMimeType(ContentService.MimeType.JSON)
    }

    if ((tipo === "alumno" || tipo === "curso") && !query) {
      return ContentService.createTextOutput(
        JSON.stringify({
          error: `Parámetro 'q' requerido para búsqueda por ${tipo}`,
        }),
      ).setMimeType(ContentService.MimeType.JSON)
    }

    if (tipo === "alumno") {
      const resultados = buscarPorAlumno(query, cuatrimestre)
      return ContentService.createTextOutput(JSON.stringify(resultados)).setMimeType(ContentService.MimeType.JSON)
    }

    if (tipo === "curso") {
      const resultados = buscarPorCurso(query, cuatrimestre)
      return ContentService.createTextOutput(JSON.stringify(resultados)).setMimeType(ContentService.MimeType.JSON)
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        error: "Tipo de búsqueda no válido",
        validTypes: ["cursos", "alumno", "curso"],
      }),
    ).setMimeType(ContentService.MimeType.JSON)
  } catch (error) {
    console.error("Error en doGet:", error)
    return ContentService.createTextOutput(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error.toString(),
        timestamp: new Date().toISOString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON)
  }
}

// Obtener información del curso desde el archivo (fila 7)
function obtenerInfoCursoDelArchivo(file) {
  try {
    const spreadsheet = SpreadsheetApp.openById(file.getId())
    const sheets = spreadsheet.getSheets()

    if (sheets.length > 0) {
      const sheet = sheets[0] // Primera hoja
      const data = sheet.getDataRange().getValues()

      // Verificar que hay al menos 7 filas
      if (data.length >= 7) {
        const fila7 = data[6] // Fila 7 (índice 6)
        const año = fila7[0] ? fila7[0].toString().replace("AÑO:", "").trim() : ""
        const seccion = fila7[1] ? fila7[1].toString().replace("SECCIÓN:", "").trim() : ""

        if (año && seccion) {
          return `${año} ${seccion}`
        }
      }
    }

    return null
  } catch (error) {
    console.error("Error obteniendo info del curso:", error)
    return null
  }
}

// Obtener lista de cursos disponibles
function getCursos() {
  const cursos = []
  const errores = []

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      try {
        const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
        const files = folder.getFiles()

        while (files.hasNext()) {
          const file = files.next()
          const fileName = file.getName()

          if (fileName.match(/\.(xlsx|xls)$/i)) {
            try {
              // Obtener información del curso desde el archivo
              const cursoInfo = obtenerInfoCursoDelArchivo(file)
              const nombreCurso = cursoInfo || fileName.replace(/\.(xlsx|xls)$/i, "")
              cursos.push(`${nombreCurso} - ${especialidad.replace("-", " ").toUpperCase()}`)
            } catch (fileError) {
              console.error(`Error procesando archivo ${fileName}:`, fileError)
              // Usar nombre del archivo como fallback
              const nombreCurso = fileName.replace(/\.(xlsx|xls)$/i, "")
              cursos.push(`${nombreCurso} - ${especialidad.replace("-", " ").toUpperCase()}`)
            }
          }
        }
      } catch (folderError) {
        console.error(`Error accediendo a carpeta ${especialidad}:`, folderError)
        errores.push(`Error en ${especialidad}: ${folderError.toString()}`)
      }
    })

    return {
      cursos: cursos.sort(),
      total: cursos.length,
      errores: errores.length > 0 ? errores : undefined,
    }
  } catch (error) {
    console.error("Error general obteniendo cursos:", error)
    return {
      cursos: [],
      error: error.toString(),
      timestamp: new Date().toISOString(),
    }
  }
}

// Buscar por nombre de alumno
function buscarPorAlumno(nombreAlumno, filtroCuatrimestre) {
  const resultados = []

  if (!nombreAlumno || nombreAlumno.trim() === "") {
    return { error: "Nombre de alumno no puede estar vacío" }
  }

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      try {
        const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
        const files = folder.getFiles()

        while (files.hasNext()) {
          const file = files.next()
          const fileName = file.getName()

          if (fileName.match(/\.(xlsx|xls)$/i)) {
            try {
              const cursoInfo = obtenerInfoCursoDelArchivo(file) || fileName.replace(/\.(xlsx|xls)$/i, "")
              const alumnosEncontrados = buscarAlumnoEnArchivo(file, nombreAlumno, cursoInfo, filtroCuatrimestre)
              resultados.push(...alumnosEncontrados)
            } catch (fileError) {
              console.error(`Error procesando archivo ${fileName}:`, fileError)
            }
          }
        }
      } catch (folderError) {
        console.error(`Error en carpeta ${especialidad}:`, folderError)
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

  if (!nombreCurso || nombreCurso.trim() === "") {
    return { error: "Nombre de curso no puede estar vacío" }
  }

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      try {
        const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
        const files = folder.getFiles()

        while (files.hasNext()) {
          const file = files.next()
          const fileName = file.getName()

          if (fileName.match(/\.(xlsx|xls)$/i)) {
            try {
              const cursoInfo = obtenerInfoCursoDelArchivo(file) || fileName.replace(/\.(xlsx|xls)$/i, "")

              // Buscar por nombre del archivo o información del curso
              if (
                fileName.toLowerCase().includes(nombreCurso.toLowerCase()) ||
                cursoInfo.toLowerCase().includes(nombreCurso.toLowerCase())
              ) {
                const todosLosAlumnos = obtenerTodosLosAlumnosDelArchivo(file, cursoInfo, filtroCuatrimestre)
                resultados.push(...todosLosAlumnos)
              }
            } catch (fileError) {
              console.error(`Error procesando archivo ${fileName}:`, fileError)
            }
          }
        }
      } catch (folderError) {
        console.error(`Error en carpeta ${especialidad}:`, folderError)
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
      try {
        const nombreMateria = sheet.getName()
        const data = sheet.getDataRange().getValues()

        // Buscar desde la fila 11 (índice 10) según la estructura
        for (let i = 10; i < data.length; i++) {
          const fila = data[i]
          const nombreEnFila = fila[1] // Columna B (índice 1)

          if (nombreEnFila && nombreEnFila.toString().toLowerCase().includes(nombreAlumno.toLowerCase())) {
            let alumnoExistente = resultados.find((r) => r.nombre === nombreEnFila.toString())

            if (!alumnoExistente) {
              alumnoExistente = {
                nombre: nombreEnFila.toString(),
                calificaciones: [],
              }
              resultados.push(alumnoExistente)
            }

            const calificaciones = extraerCalificacionesDeFilaAlumno(
              fila,
              nombreMateria,
              nombreCurso,
              filtroCuatrimestre,
            )
            alumnoExistente.calificaciones.push(...calificaciones)
          }
        }
      } catch (sheetError) {
        console.error(`Error procesando hoja ${sheet.getName()}:`, sheetError)
      }
    })

    return resultados
  } catch (error) {
    console.error("Error procesando archivo:", error)
    return []
  }
}

// Obtener todos los alumnos de un archivo
function obtenerTodosLosAlumnosDelArchivo(file, nombreCurso, filtroCuatrimestre) {
  const resultados = []

  try {
    const spreadsheet = SpreadsheetApp.openById(file.getId())
    const sheets = spreadsheet.getSheets()

    sheets.forEach((sheet) => {
      try {
        const nombreMateria = sheet.getName()
        const data = sheet.getDataRange().getValues()

        // Procesar desde la fila 11 (índice 10)
        for (let i = 10; i < data.length; i++) {
          const fila = data[i]
          const nombreAlumno = fila[1] // Columna B (índice 1)

          if (nombreAlumno && nombreAlumno.toString().trim() !== "") {
            let alumnoExistente = resultados.find((r) => r.nombre === nombreAlumno.toString())

            if (!alumnoExistente) {
              alumnoExistente = {
                nombre: nombreAlumno.toString(),
                calificaciones: [],
              }
              resultados.push(alumnoExistente)
            }

            const calificaciones = extraerCalificacionesDeFilaAlumno(
              fila,
              nombreMateria,
              nombreCurso,
              filtroCuatrimestre,
            )
            alumnoExistente.calificaciones.push(...calificaciones)
          }
        }
      } catch (sheetError) {
        console.error(`Error procesando hoja ${sheet.getName()}:`, sheetError)
      }
    })

    return resultados
  } catch (error) {
    console.error("Error obteniendo alumnos del archivo:", error)
    return []
  }
}

// Extraer calificaciones de una fila - CON ÍNDICES CORRECTOS
function extraerCalificacionesDeFilaAlumno(fila, nombreMateria, nombreCurso, filtroCuatrimestre) {
  const calificaciones = []

  try {
    // ÍNDICES CORRECTOS según la información proporcionada:
    // 1º VALORACIÓN PRELIMINAR: Columna I (índice 8)
    // CALIFICACIÓN 1º CUATRIMESTRE: Columna J (índice 9)
    // 2º VALORACIÓN PRELIMINAR: Columna Q (índice 16)
    // CALIFICACIÓN 2º CUATRIMESTRE: Columna R (índice 17)
    // CALIFICACIÓN FINAL: Columna W (índice 22)

    // 1º Cuatrimestre - usar CALIFICACIÓN 1º CUATRIMESTRE (columna J)
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "1º") {
      const nota1C = obtenerNotaLimpia(fila[9]) // Columna J (índice 9)
      if (nota1C !== null) {
        calificaciones.push({
          materia: nombreMateria,
          curso: nombreCurso,
          cuatrimestre: "1º",
          nota: nota1C,
        })
      }
    }

    // 2º Cuatrimestre - usar CALIFICACIÓN 2º CUATRIMESTRE (columna R)
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "2º") {
      const nota2C = obtenerNotaLimpia(fila[17]) // Columna R (índice 17)
      if (nota2C !== null) {
        calificaciones.push({
          materia: nombreMateria,
          curso: nombreCurso,
          cuatrimestre: "2º",
          nota: nota2C,
        })
      }
    }

    // Final - usar CALIFICACIÓN FINAL (columna W)
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "Final") {
      const notaFinal = obtenerNotaLimpia(fila[22]) // Columna W (índice 22)
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
  if (valor === null || valor === undefined || valor === "") return null

  const valorStr = valor.toString().trim().toLowerCase()

  // Casos especiales
  if (valorStr === "s/e" || valorStr === "sin evaluar" || valorStr === "" || valorStr === "null") {
    return "Sin nota"
  }

  // Intentar convertir a número
  const numero = Number.parseFloat(valorStr)
  if (!isNaN(numero) && numero >= 0 && numero <= 10) {
    return numero
  }

  return null
}

// Función de prueba mejorada
function testScript() {
  console.log("=== INICIANDO PRUEBAS CON IDs REALES ===")

  try {
    console.log("1. Probando getCursos()...")
    const cursos = getCursos()
    console.log("Cursos encontrados:", JSON.stringify(cursos, null, 2))

    console.log("2. Probando buscarPorAlumno()...")
    const alumno = buscarPorAlumno("ACEVEDO", "todos")
    console.log("Búsqueda de alumno:", JSON.stringify(alumno, null, 2))

    console.log("3. Probando doGet() sin parámetros...")
    const testDoGet = doGet()
    console.log("Respuesta doGet:", testDoGet.getContent())

    console.log("4. Verificando acceso a carpetas...")
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      try {
        const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
        console.log(`✅ Carpeta ${especialidad}: ${folder.getName()}`)
      } catch (error) {
        console.log(`❌ Error en carpeta ${especialidad}:`, error.toString())
      }
    })
  } catch (error) {
    console.error("Error en pruebas:", error)
  }

  console.log("=== PRUEBAS COMPLETADAS ===")
}
