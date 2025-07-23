// Google Apps Script para leer calificaciones desde Google Drive - VERSIÓN FINAL CORREGIDA
// Copia este código completo en script.google.com

// Importaciones necesarias
const ContentService = ContentService
const SpreadsheetApp = SpreadsheetApp
const DriveApp = DriveApp

// IDs de las carpetas de Google Drive
const FOLDER_IDS = {
  alimentos: "18N92XyXH2TWY95ur8MRag9PUfxnMJn_M",
  "ciclo-basico": "1vXS7lmmNqm0mNaAp7xxK-_0B1CwOOaST",
  electromecanica: "1hzQQMhanhF4swRbDlg3_2dhuRdxMdDbm",
  "maestro-mayor-obra": "1XEHHRVzFNfM13uNdblHbXbqI_Yw2hapm",
}

// Función principal que maneja las peticiones HTTP
function doGet(e) {
  try {
    if (!e || !e.parameter) {
      console.log("Llamada directa o sin parámetros")
      return ContentService.createTextOutput(
        JSON.stringify({
          message: "API de calificaciones funcionando correctamente",
          timestamp: new Date().toISOString(),
          status: "✅ Optimizado para Google Sheets",
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

    console.log(`🔍 Búsqueda: tipo=${tipo}, query=${query}, cuatrimestre=${cuatrimestre}`)

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
    console.error("❌ Error en doGet:", error)
    return ContentService.createTextOutput(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error.toString(),
        timestamp: new Date().toISOString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON)
  }
}

// Función para verificar si es Google Sheets
function esGoogleSheets(file) {
  try {
    const mimeType = file.getMimeType()
    return mimeType === "application/vnd.google-apps.spreadsheet"
  } catch (error) {
    console.error(`Error verificando tipo de archivo ${file.getName()}:`, error)
    return false
  }
}

// Obtener información del curso desde el archivo
function obtenerInfoCursoDelArchivo(file) {
  try {
    if (!esGoogleSheets(file)) {
      console.log(`⚠️ Saltando ${file.getName()} - no es Google Sheets`)
      return null
    }

    const spreadsheet = SpreadsheetApp.openById(file.getId())
    const sheets = spreadsheet.getSheets()

    if (sheets.length > 0) {
      const sheet = sheets[0]
      const data = sheet.getDataRange().getValues()

      if (data.length >= 7) {
        const fila7 = data[6] // Fila 7 (índice 6)
        const año = fila7[0] ? fila7[0].toString().replace("AÑO:", "").trim() : ""
        const seccion = fila7[1] ? fila7[1].toString().replace("SECCIÓN:", "").trim() : ""

        if (año && seccion) {
          console.log(`📋 Curso encontrado: ${año} ${seccion} en ${file.getName()}`)
          return `${año} ${seccion}`
        }
      }

      // Si no encuentra info en fila 7, usar nombre del archivo
      const nombreLimpio = file.getName().replace(/\.(xlsx|xls)$/i, "")
      console.log(`📋 Usando nombre de archivo: ${nombreLimpio}`)
      return nombreLimpio
    }
    return null
  } catch (error) {
    console.error(`❌ Error obteniendo info del curso de ${file.getName()}:`, error)
    return null
  }
}

// Obtener lista de cursos disponibles
function getCursos() {
  const cursos = []
  const errores = []
  let archivosExitosos = 0
  let archivosConError = 0
  let archivosSaltados = 0

  console.log("🔍 Iniciando búsqueda de cursos...")

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      console.log(`📁 Procesando carpeta: ${especialidad}`)

      try {
        const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
        const files = folder.getFiles()

        while (files.hasNext()) {
          const file = files.next()
          const fileName = file.getName()

          // Solo procesar Google Sheets
          if (esGoogleSheets(file)) {
            try {
              const cursoInfo = obtenerInfoCursoDelArchivo(file)
              if (cursoInfo) {
                cursos.push(`${cursoInfo} - ${especialidad.replace("-", " ").toUpperCase()}`)
                archivosExitosos++
                console.log(`✅ Procesado: ${fileName}`)
              } else {
                // Usar nombre del archivo como fallback
                const nombreCurso = fileName.replace(/\.(xlsx|xls)$/i, "")
                cursos.push(`${nombreCurso} - ${especialidad.replace("-", " ").toUpperCase()}`)
                archivosExitosos++
                console.log(`⚠️ Fallback para: ${fileName}`)
              }
            } catch (fileError) {
              console.error(`❌ Error procesando ${fileName}:`, fileError)
              archivosConError++
              errores.push(`${fileName}: ${fileError.toString().substring(0, 100)}`)
            }
          } else {
            archivosSaltados++
            console.log(`⏭️ Saltado (no es Google Sheets): ${fileName}`)
          }
        }
      } catch (folderError) {
        console.error(`❌ Error accediendo a carpeta ${especialidad}:`, folderError)
        errores.push(`Carpeta ${especialidad}: ${folderError.toString()}`)
      }
    })

    console.log(`📊 Resumen: ${archivosExitosos} exitosos, ${archivosConError} con error, ${archivosSaltados} saltados`)

    return {
      cursos: cursos.sort(),
      total: cursos.length,
      estadisticas: {
        archivosExitosos,
        archivosConError,
        archivosSaltados,
        totalErrores: errores.length,
      },
      errores: errores.length > 0 ? errores.slice(0, 5) : undefined,
    }
  } catch (error) {
    console.error("❌ Error general obteniendo cursos:", error)
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
  let archivosExitosos = 0
  let archivosConError = 0
  let archivosSaltados = 0

  if (!nombreAlumno || nombreAlumno.trim() === "") {
    return { error: "Nombre de alumno no puede estar vacío" }
  }

  console.log(`🔍 Buscando alumno: ${nombreAlumno}`)

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      try {
        const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
        const files = folder.getFiles()

        while (files.hasNext()) {
          const file = files.next()
          const fileName = file.getName()

          if (esGoogleSheets(file)) {
            try {
              const cursoInfo = obtenerInfoCursoDelArchivo(file) || fileName.replace(/\.(xlsx|xls)$/i, "")
              const alumnosEncontrados = buscarAlumnoEnArchivo(file, nombreAlumno, cursoInfo, filtroCuatrimestre)

              if (alumnosEncontrados && alumnosEncontrados.length > 0) {
                resultados.push(...alumnosEncontrados)
                archivosExitosos++
                console.log(`✅ Encontrado en: ${fileName}`)
              }
            } catch (fileError) {
              console.error(`❌ Error procesando ${fileName}:`, fileError)
              archivosConError++
            }
          } else {
            archivosSaltados++
          }
        }
      } catch (folderError) {
        console.error(`❌ Error en carpeta ${especialidad}:`, folderError)
      }
    })

    console.log(`📊 Búsqueda completada: ${resultados.length} resultados encontrados`)

    return resultados.length > 0 ? resultados : []
  } catch (error) {
    console.error("❌ Error buscando alumno:", error)
    return [{ error: error.toString() }]
  }
}

// Buscar por curso
function buscarPorCurso(nombreCurso, filtroCuatrimestre) {
  const resultados = []
  let archivosExitosos = 0
  let archivosConError = 0

  if (!nombreCurso || nombreCurso.trim() === "") {
    return { error: "Nombre de curso no puede estar vacío" }
  }

  console.log(`🔍 Buscando curso: ${nombreCurso}`)

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      try {
        const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
        const files = folder.getFiles()

        while (files.hasNext()) {
          const file = files.next()
          const fileName = file.getName()

          if (esGoogleSheets(file)) {
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
                  console.log(`✅ Curso encontrado en: ${fileName}`)
                }
              }
            } catch (fileError) {
              console.error(`❌ Error procesando ${fileName}:`, fileError)
              archivosConError++
            }
          }
        }
      } catch (folderError) {
        console.error(`❌ Error en carpeta ${especialidad}:`, folderError)
      }
    })

    console.log(`📊 Búsqueda de curso completada: ${resultados.length} alumnos encontrados`)

    return resultados.length > 0 ? resultados : []
  } catch (error) {
    console.error("❌ Error buscando curso:", error)
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
        console.error(`❌ Error procesando hoja ${sheet.getName()}:`, sheetError)
      }
    })

    return resultados
  } catch (error) {
    console.error(`❌ Error procesando archivo ${file.getName()}:`, error)
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
        console.error(`❌ Error procesando hoja ${sheet.getName()}:`, sheetError)
      }
    })

    return resultados
  } catch (error) {
    console.error(`❌ Error obteniendo alumnos del archivo ${file.getName()}:`, error)
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
    console.error("❌ Error extrayendo calificaciones:", error)
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

// Función de prueba
function testScript() {
  console.log("=== 🚀 PRUEBAS DEL SCRIPT CORREGIDO ===")

  try {
    console.log("1. 📁 Verificando acceso a carpetas...")
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      try {
        const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
        console.log(`✅ Carpeta ${especialidad}: ${folder.getName()}`)

        // Contar archivos por tipo
        const files = folder.getFiles()
        let totalFiles = 0
        let googleSheets = 0

        while (files.hasNext()) {
          const file = files.next()
          totalFiles++

          if (esGoogleSheets(file)) {
            googleSheets++
            console.log(`   📊 Google Sheet: ${file.getName()}`)
          }
        }

        console.log(`   📈 Resumen: ${totalFiles} total, ${googleSheets} Google Sheets`)
      } catch (error) {
        console.log(`❌ Error en carpeta ${especialidad}:`, error)
      }
    })

    console.log("\n2. 📚 Probando getCursos()...")
    const cursos = getCursos()
    console.log(`✅ Cursos encontrados: ${cursos.total}`)
    console.log("📊 Estadísticas:", cursos.estadisticas)

    console.log("\n3. 👨‍🎓 Probando buscarPorAlumno()...")
    const alumno = buscarPorAlumno("ACEVEDO", "todos")
    console.log(`✅ Resultados búsqueda alumno: ${alumno.length || 0}`)

    console.log("\n4. 🌐 Probando doGet() sin parámetros...")
    const testDoGet = doGet()
    console.log("✅ Respuesta doGet OK")
  } catch (error) {
    console.error("❌ Error en pruebas:", error)
  }

  console.log("\n=== ✅ PRUEBAS COMPLETADAS ===")
  console.log("🚀 Si todo funciona, puedes desplegar como aplicación web")
}

// Función para probar específicamente la conexión a Google Drive
function probarConexionDrive() {
  console.log("=== 🔄 PRUEBA DE CONEXIÓN A GOOGLE DRIVE ===")

  const resultados = {
    carpetasAccesibles: 0,
    carpetasInaccesibles: 0,
    archivosEncontrados: 0,
    googleSheetsEncontrados: 0,
    detalles: {},
  }

  try {
    // Verificar acceso a Drive en general
    try {
      const root = DriveApp.getRootFolder()
      console.log(`✅ Acceso a Drive confirmado. Root folder: ${root.getName()}`)
    } catch (error) {
      console.error("❌ ERROR CRÍTICO: No se puede acceder a Google Drive", error)
      return {
        exito: false,
        mensaje: "No se puede acceder a Google Drive. Verifica los permisos de la aplicación.",
        error: error.toString(),
      }
    }

    // Verificar cada carpeta configurada
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      const folderId = FOLDER_IDS[especialidad]
      console.log(`\n📁 Verificando carpeta ${especialidad} (ID: ${folderId})...`)

      try {
        const folder = DriveApp.getFolderById(folderId)
        console.log(`✅ Carpeta accesible: ${folder.getName()}`)

        // Intentar listar archivos
        const files = folder.getFiles()
        let contadorArchivos = 0
        let contadorSheets = 0
        const archivosListados = []

        while (files.hasNext() && contadorArchivos < 10) {
          // Limitar a 10 archivos para no sobrecargar logs
          const file = files.next()
          contadorArchivos++

          const esSheet = esGoogleSheets(file)
          if (esSheet) contadorSheets++

          archivosListados.push({
            nombre: file.getName(),
            tipo: file.getMimeType(),
            esGoogleSheet: esSheet,
            fechaModificacion: file.getLastUpdated(),
          })
        }

        console.log(`   📊 Archivos encontrados: ${contadorArchivos} (${contadorSheets} Google Sheets)`)

        resultados.carpetasAccesibles++
        resultados.archivosEncontrados += contadorArchivos
        resultados.googleSheetsEncontrados += contadorSheets

        resultados.detalles[especialidad] = {
          accesible: true,
          nombre: folder.getName(),
          archivosEncontrados: contadorArchivos,
          googleSheetsEncontrados: contadorSheets,
          muestraArchivos: archivosListados.slice(0, 3), // Solo mostrar los primeros 3
        }
      } catch (error) {
        console.error(`❌ Error accediendo a carpeta ${especialidad}:`, error)
        resultados.carpetasInaccesibles++
        resultados.detalles[especialidad] = {
          accesible: false,
          error: error.toString(),
        }
      }
    })

    // Resumen final
    console.log("\n=== 📊 RESUMEN DE CONEXIÓN ===")
    console.log(`✅ Carpetas accesibles: ${resultados.carpetasAccesibles}/${Object.keys(FOLDER_IDS).length}`)
    console.log(`❌ Carpetas inaccesibles: ${resultados.carpetasInaccesibles}`)
    console.log(`📄 Total archivos encontrados: ${resultados.archivosEncontrados}`)
    console.log(`📊 Google Sheets encontrados: ${resultados.googleSheetsEncontrados}`)

    const exito = resultados.carpetasAccesibles > 0 && resultados.carpetasInaccesibles === 0

    return {
      exito: exito,
      mensaje: exito
        ? "Conexión a Google Drive exitosa. Todas las carpetas son accesibles."
        : "Hay problemas de acceso en algunas carpetas. Verifica los IDs y permisos.",
      resultados: resultados,
    }
  } catch (error) {
    console.error("❌ Error general en prueba de conexión:", error)
    return {
      exito: false,
      mensaje: "Error al probar la conexión a Google Drive",
      error: error.toString(),
    }
  }
}
