// Google Apps Script para leer calificaciones desde Google Drive
// Este código debe copiarse en script.google.com

// IDs de las carpetas de Google Drive
const FOLDER_IDS = {
  alimentos: "1S8rb_MQzw3gk2oINyrJlOVcGFz_4Ilx1",
  "ciclo-basico": "1KlL6VwcTKtPwoTeinY3Lr0ZXbAn0z2Ek",
  electromecanica: "17Iu3LvPrshvJiX7je-TQlXWkwl47hSxE",
  "maestro-mayor-obra": "1nfm9VtYRh7zdjB20WWtp7k6vxBPiZ9uk",
}

// Declaración de variables necesarias
const ContentService = GoogleAppsScript.ContentService
const DriveApp = GoogleAppsScript.DriveApp
const SpreadsheetApp = GoogleAppsScript.SpreadsheetApp
const GoogleAppsScript = {} // Declare the variable before using it

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
            const nombreCurso = fileName.replace(/\.(xlsx|xls)$/i, "")
            cursos.push(`${nombreCurso} - ${especialidad.replace("-", " ").toUpperCase()}`)
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
            const nombreCurso = fileName.replace(/\.(xlsx|xls)$/i, "")
            const alumnosEncontrados = buscarAlumnoEnArchivo(file, nombreAlumno, nombreCurso, filtroCuatrimestre)
            resultados.push(...alumnosEncontrados)
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
          const nombreArchivo = fileName.replace(/\.(xlsx|xls)$/i, "")

          if (nombreArchivo.toLowerCase().includes(nombreCurso.toLowerCase())) {
            const todosLosAlumnos = obtenerTodosLosAlumnosDelArchivo(file, nombreArchivo, filtroCuatrimestre)
            resultados.push(...todosLosAlumnos)
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

        // Buscar desde la fila 11 (índice 10) según la estructura mostrada
        for (let i = 10; i < data.length; i++) {
          const fila = data[i]
          const nombreEnFila = fila[1] // Columna B

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
          const nombreAlumno = fila[1] // Columna B

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

// Extraer calificaciones de una fila
function extraerCalificacionesDeFilaAlumno(fila, nombreMateria, nombreCurso, filtroCuatrimestre) {
  const calificaciones = []

  try {
    // Basándome en la estructura de la imagen:
    // 1º CUATRIMESTRE: Columnas E-H (índices 4-7)
    // 2º CUATRIMESTRE: Columnas aproximadamente I-L (índices 8-11)
    // FINAL: Columnas aproximadamente M-P (índices 12-15)

    // 1º Cuatrimestre
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "1º") {
      const nota1C = obtenerPrimeraNota([fila[4], fila[5], fila[6], fila[7]])
      if (nota1C !== null) {
        calificaciones.push({
          materia: nombreMateria,
          curso: nombreCurso,
          cuatrimestre: "1º",
          nota: nota1C,
        })
      }
    }

    // 2º Cuatrimestre
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "2º") {
      const nota2C = obtenerPrimeraNota([fila[8], fila[9], fila[10], fila[11]])
      if (nota2C !== null) {
        calificaciones.push({
          materia: nombreMateria,
          curso: nombreCurso,
          cuatrimestre: "2º",
          nota: nota2C,
        })
      }
    }

    // Final
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "Final") {
      const notaFinal = obtenerPrimeraNota([fila[12], fila[13], fila[14], fila[15]])
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

// Obtener la primera nota válida de un array de celdas
function obtenerPrimeraNota(celdas) {
  for (const celda of celdas) {
    const nota = obtenerNotaLimpia(celda)
    if (nota !== null) {
      return nota
    }
  }
  return null
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

// Función de prueba
function testScript() {
  console.log("=== INICIANDO PRUEBAS ===")

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
  } catch (error) {
    console.error("Error en pruebas:", error)
  }

  console.log("=== PRUEBAS COMPLETADAS ===")
}
