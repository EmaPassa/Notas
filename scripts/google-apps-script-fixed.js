// Google Apps Script para leer calificaciones desde Google Drive - VERSIÓN MEJORADA
// Copia este código completo en script.google.com

// IDs de las carpetas de Google Drive
const FOLDER_IDS = {
  alimentos: "18N92XyXH2TWY95ur8MRag9PUfxnMJn_M",
  "ciclo-basico": "1vXS7lmmNqm0mNaAp7xxK-_0B1CwOOaST",
  electromecanica: "1hzQQMhanhF4swRbDlg3_2dhuRdxMdDbm",
  "maestro-mayor-obra": "1XEHHRVzFNfM13uNdblHbXbqI_Yw2hapm",
}

// Declaración de variables necesarias
const ContentService = GoogleAppsScript.Content
const SpreadsheetApp = GoogleAppsScript.Spreadsheet
const DriveApp = GoogleAppsScript.Drive
const GoogleAppsScript = {} // Declare the variable before using it

// Función principal que maneja las peticiones HTTP
function doGet(e) {
  try {
    if (!e || !e.parameter) {
      console.log("Llamada directa o sin parámetros")
      return ContentService.createTextOutput(
        JSON.stringify({
          message: "API de calificaciones funcionando correctamente",
          timestamp: new Date().toISOString(),
          endpoints: [
            "?tipo=cursos - Lista todos los cursos disponibles",
            "?tipo=alumno&q=NOMBRE - Busca un alumno específico",
            "?tipo=curso&q=NOMBRE - Busca todos los alumnos de un curso",
          ],
        }),
      ).setMimeType(ContentService.MimeType.JSON)
    }

    const tipo = e.parameter.tipo || ""
    const query = e.parameter.q || ""
    const cuatrimestre = e.parameter.cuatrimestre || "todos"

    console.log(`Búsqueda: tipo=${tipo}, query=${query}, cuatrimestre=${cuatrimestre}`)

    if (!tipo) {
      return ContentService.createTextOutput(
        JSON.stringify({
          error: "Parámetro 'tipo' requerido",
          validTypes: ["cursos", "alumno", "curso"],
        }),
      ).setMimeType(ContentService.MimeType.JSON)
    }

    let resultados

    if (tipo === "cursos") {
      resultados = getCursos()
    } else if (tipo === "alumno") {
      if (!query) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: "Parámetro 'q' requerido para búsqueda por alumno" }),
        ).setMimeType(ContentService.MimeType.JSON)
      }
      resultados = buscarPorAlumno(query, cuatrimestre)
    } else if (tipo === "curso") {
      if (!query) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: "Parámetro 'q' requerido para búsqueda por curso" }),
        ).setMimeType(ContentService.MimeType.JSON)
      }
      resultados = buscarPorCurso(query, cuatrimestre)
    } else {
      return ContentService.createTextOutput(
        JSON.stringify({
          error: "Tipo de búsqueda no válido",
          validTypes: ["cursos", "alumno", "curso"],
        }),
      ).setMimeType(ContentService.MimeType.JSON)
    }

    return ContentService.createTextOutput(JSON.stringify(resultados)).setMimeType(ContentService.MimeType.JSON)
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

// Función mejorada para verificar si un archivo se puede abrir como spreadsheet
function puedeAbrirseComoSpreadsheet(file) {
  try {
    const mimeType = file.getMimeType()
    console.log(`Archivo: ${file.getName()}, MimeType: ${mimeType}`)

    // Tipos de archivo que se pueden abrir con SpreadsheetApp
    const tiposCompatibles = [
      "application/vnd.google-apps.spreadsheet",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ]

    return tiposCompatibles.includes(mimeType)
  } catch (error) {
    console.error(`Error verificando tipo de archivo ${file.getName()}:`, error)
    return false
  }
}

// Función mejorada para abrir spreadsheet con manejo de errores
function abrirSpreadsheetSeguro(file) {
  try {
    // Verificar si es un tipo compatible
    if (!puedeAbrirseComoSpreadsheet(file)) {
      console.log(`Saltando archivo ${file.getName()} - tipo no compatible`)
      return null
    }

    // Intentar abrir el archivo
    const spreadsheet = SpreadsheetApp.openById(file.getId())
    console.log(`✅ Archivo abierto exitosamente: ${file.getName()}`)
    return spreadsheet
  } catch (error) {
    console.error(`❌ Error abriendo archivo ${file.getName()}:`, error.toString())

    // Intentar convertir si es un archivo Excel
    try {
      if (file.getName().match(/\.(xlsx|xls)$/i)) {
        console.log(`Intentando convertir archivo Excel: ${file.getName()}`)
        return convertirExcelAGoogleSheets(file)
      }
    } catch (conversionError) {
      console.error(`Error en conversión de ${file.getName()}:`, conversionError.toString())
    }

    return null
  }
}

// Función para convertir Excel a Google Sheets (opcional)
function convertirExcelAGoogleSheets(file) {
  try {
    // Esta función requiere permisos adicionales y puede no funcionar en todos los casos
    console.log(`Intentando conversión de ${file.getName()}...`)

    // Por ahora, simplemente retornamos null para saltar el archivo
    // En el futuro se puede implementar la conversión real
    return null
  } catch (error) {
    console.error(`Error convirtiendo ${file.getName()}:`, error)
    return null
  }
}

// Obtener información del curso desde el archivo (mejorada)
function obtenerInfoCursoDelArchivo(file) {
  try {
    const spreadsheet = abrirSpreadsheetSeguro(file)
    if (!spreadsheet) {
      return null
    }

    const sheets = spreadsheet.getSheets()
    if (sheets.length > 0) {
      const sheet = sheets[0]
      const data = sheet.getDataRange().getValues()

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
    console.error(`Error obteniendo info del curso de ${file.getName()}:`, error.toString())
    return null
  }
}

// Obtener lista de cursos disponibles (mejorada)
function getCursos() {
  const cursos = []
  const errores = []
  let archivosExitosos = 0
  let archivosConError = 0

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      try {
        const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
        const files = folder.getFiles()

        while (files.hasNext()) {
          const file = files.next()
          const fileName = file.getName()

          if (fileName.match(/\.(xlsx|xls)$/i) || file.getMimeType() === "application/vnd.google-apps.spreadsheet") {
            try {
              const cursoInfo = obtenerInfoCursoDelArchivo(file)
              const nombreCurso = cursoInfo || fileName.replace(/\.(xlsx|xls)$/i, "")
              cursos.push(`${nombreCurso} - ${especialidad.replace("-", " ").toUpperCase()}`)
              archivosExitosos++
            } catch (fileError) {
              console.error(`Error procesando archivo ${fileName}:`, fileError.toString())
              // Usar nombre del archivo como fallback
              const nombreCurso = fileName.replace(/\.(xlsx|xls)$/i, "")
              cursos.push(`${nombreCurso} - ${especialidad.replace("-", " ").toUpperCase()}`)
              archivosConError++
              errores.push(`${fileName}: ${fileError.toString().substring(0, 100)}`)
            }
          }
        }
      } catch (folderError) {
        console.error(`Error accediendo a carpeta ${especialidad}:`, folderError.toString())
        errores.push(`Carpeta ${especialidad}: ${folderError.toString()}`)
      }
    })

    return {
      cursos: cursos.sort(),
      total: cursos.length,
      estadisticas: {
        archivosExitosos,
        archivosConError,
        totalErrores: errores.length,
      },
      errores: errores.length > 0 ? errores.slice(0, 5) : undefined, // Solo primeros 5 errores
    }
  } catch (error) {
    console.error("Error general obteniendo cursos:", error.toString())
    return {
      cursos: [],
      error: error.toString(),
      timestamp: new Date().toISOString(),
    }
  }
}

// Buscar por nombre de alumno (mejorada)
function buscarPorAlumno(nombreAlumno, filtroCuatrimestre) {
  const resultados = []
  let archivosExitosos = 0
  let archivosConError = 0

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

          if (fileName.match(/\.(xlsx|xls)$/i) || file.getMimeType() === "application/vnd.google-apps.spreadsheet") {
            try {
              const cursoInfo = obtenerInfoCursoDelArchivo(file) || fileName.replace(/\.(xlsx|xls)$/i, "")
              const alumnosEncontrados = buscarAlumnoEnArchivo(file, nombreAlumno, cursoInfo, filtroCuatrimestre)
              if (alumnosEncontrados && alumnosEncontrados.length > 0) {
                resultados.push(...alumnosEncontrados)
                archivosExitosos++
              }
            } catch (fileError) {
              console.error(`Error procesando archivo ${fileName}:`, fileError.toString())
              archivosConError++
            }
          }
        }
      } catch (folderError) {
        console.error(`Error en carpeta ${especialidad}:`, folderError.toString())
      }
    })

    return {
      resultados: resultados,
      estadisticas: {
        archivosExitosos,
        archivosConError,
        totalResultados: resultados.length,
      },
    }
  } catch (error) {
    console.error("Error buscando alumno:", error.toString())
    return [{ error: error.toString() }]
  }
}

// Buscar por curso (mejorada)
function buscarPorCurso(nombreCurso, filtroCuatrimestre) {
  const resultados = []
  let archivosExitosos = 0
  let archivosConError = 0

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

          if (fileName.match(/\.(xlsx|xls)$/i) || file.getMimeType() === "application/vnd.google-apps.spreadsheet") {
            try {
              const cursoInfo = obtenerInfoCursoDelArchivo(file) || fileName.replace(/\.(xlsx|xls)$/i, "")

              if (
                fileName.toLowerCase().includes(nombreCurso.toLowerCase()) ||
                cursoInfo.toLowerCase().includes(nombreCurso.toLowerCase())
              ) {
                const todosLosAlumnos = obtenerTodosLosAlumnosDelArchivo(file, cursoInfo, filtroCuatrimestre)
                if (todosLosAlumnos && todosLosAlumnos.length > 0) {
                  resultados.push(...todosLosAlumnos)
                  archivosExitosos++
                }
              }
            } catch (fileError) {
              console.error(`Error procesando archivo ${fileName}:`, fileError.toString())
              archivosConError++
            }
          }
        }
      } catch (folderError) {
        console.error(`Error en carpeta ${especialidad}:`, folderError.toString())
      }
    })

    return {
      resultados: resultados,
      estadisticas: {
        archivosExitosos,
        archivosConError,
        totalResultados: resultados.length,
      },
    }
  } catch (error) {
    console.error("Error buscando curso:", error.toString())
    return [{ error: error.toString() }]
  }
}

// Buscar alumno específico en un archivo (mejorada)
function buscarAlumnoEnArchivo(file, nombreAlumno, nombreCurso, filtroCuatrimestre) {
  const resultados = []

  try {
    const spreadsheet = abrirSpreadsheetSeguro(file)
    if (!spreadsheet) {
      return []
    }

    const sheets = spreadsheet.getSheets()

    sheets.forEach((sheet) => {
      try {
        const nombreMateria = sheet.getName()
        const data = sheet.getDataRange().getValues()

        // Buscar desde la fila 11 (índice 10)
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
        console.error(`Error procesando hoja ${sheet.getName()}:`, sheetError.toString())
      }
    })

    return resultados
  } catch (error) {
    console.error(`Error procesando archivo ${file.getName()}:`, error.toString())
    return []
  }
}

// Obtener todos los alumnos de un archivo (mejorada)
function obtenerTodosLosAlumnosDelArchivo(file, nombreCurso, filtroCuatrimestre) {
  const resultados = []

  try {
    const spreadsheet = abrirSpreadsheetSeguro(file)
    if (!spreadsheet) {
      return []
    }

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
        console.error(`Error procesando hoja ${sheet.getName()}:`, sheetError.toString())
      }
    })

    return resultados
  } catch (error) {
    console.error(`Error obteniendo alumnos del archivo ${file.getName()}:`, error.toString())
    return []
  }
}

// Extraer calificaciones de una fila
function extraerCalificacionesDeFilaAlumno(fila, nombreMateria, nombreCurso, filtroCuatrimestre) {
  const calificaciones = []

  try {
    // Índices de columnas según la estructura:
    // CALIFICACIÓN 1º CUATRIMESTRE: Columna J (índice 9)
    // CALIFICACIÓN 2º CUATRIMESTRE: Columna R (índice 17)
    // CALIFICACIÓN FINAL: Columna W (índice 22)

    // 1º Cuatrimestre
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "1º") {
      const nota1C = obtenerNotaLimpia(fila[9]) // Columna J
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
      const nota2C = obtenerNotaLimpia(fila[17]) // Columna R
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
      const notaFinal = obtenerNotaLimpia(fila[22]) // Columna W
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
    console.error("Error extrayendo calificaciones:", error.toString())
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
  console.log("=== INICIANDO PRUEBAS DEL SCRIPT MEJORADO ===")

  try {
    console.log("1. Verificando acceso a carpetas...")
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      try {
        const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
        console.log(`✅ Carpeta ${especialidad}: ${folder.getName()}`)

        // Analizar archivos
        const files = folder.getFiles()
        let totalFiles = 0
        let compatibleFiles = 0
        let excelFiles = 0
        let googleSheets = 0

        while (files.hasNext()) {
          const file = files.next()
          totalFiles++

          const mimeType = file.getMimeType()
          if (file.getName().match(/\.(xlsx|xls)$/i)) {
            excelFiles++
          }
          if (mimeType === "application/vnd.google-apps.spreadsheet") {
            googleSheets++
          }
          if (puedeAbrirseComoSpreadsheet(file)) {
            compatibleFiles++
          }
        }

        console.log(`   📁 Total archivos: ${totalFiles}`)
        console.log(`   📊 Google Sheets: ${googleSheets}`)
        console.log(`   📋 Archivos Excel: ${excelFiles}`)
        console.log(`   ✅ Archivos compatibles: ${compatibleFiles}`)
      } catch (error) {
        console.log(`❌ Error en carpeta ${especialidad}:`, error.toString())
      }
    })

    console.log("\n2. Probando getCursos()...")
    const cursos = getCursos()
    console.log("Cursos encontrados:", cursos.total)
    console.log("Estadísticas:", cursos.estadisticas)
    if (cursos.errores) {
      console.log("Errores encontrados:", cursos.errores.length)
    }

    console.log("\n3. Probando buscarPorAlumno()...")
    const alumno = buscarPorAlumno("ACEVEDO", "todos")
    if (alumno.resultados) {
      console.log("Resultados búsqueda alumno:", alumno.resultados.length)
      console.log("Estadísticas búsqueda:", alumno.estadisticas)
    } else {
      console.log("Resultados búsqueda alumno:", alumno.length || "Error")
    }

    console.log("\n4. Probando doGet() sin parámetros...")
    const testDoGet = doGet()
    console.log("Respuesta doGet OK:", testDoGet.getContent().length > 0)
  } catch (error) {
    console.error("❌ Error en pruebas:", error.toString())
  }

  console.log("\n=== PRUEBAS COMPLETADAS ===")
  console.log("Si hay archivos compatibles ✅, puedes desplegar como aplicación web")
}

// Función adicional para diagnosticar archivos problemáticos
function diagnosticarArchivos() {
  console.log("=== DIAGNÓSTICO DETALLADO DE ARCHIVOS ===")

  Object.keys(FOLDER_IDS).forEach((especialidad) => {
    try {
      const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
      const files = folder.getFiles()

      console.log(`\n📁 Carpeta: ${especialidad}`)

      while (files.hasNext()) {
        const file = files.next()
        const fileName = file.getName()
        const mimeType = file.getMimeType()

        console.log(`\n  📄 Archivo: ${fileName}`)
        console.log(`     MimeType: ${mimeType}`)
        console.log(`     Compatible: ${puedeAbrirseComoSpreadsheet(file) ? "✅" : "❌"}`)

        if (puedeAbrirseComoSpreadsheet(file)) {
          try {
            const spreadsheet = SpreadsheetApp.openById(file.getId())
            const sheets = spreadsheet.getSheets()
            console.log(`     Hojas: ${sheets.length}`)
            if (sheets.length > 0) {
              console.log(`     Primera hoja: ${sheets[0].getName()}`)
            }
          } catch (openError) {
            console.log(`     Error abriendo: ${openError.toString().substring(0, 100)}`)
          }
        }
      }
    } catch (error) {
      console.log(`❌ Error en carpeta ${especialidad}:`, error.toString())
    }
  })
}
