// Google Apps Script para leer calificaciones desde Google Drive - OPTIMIZADO PARA GOOGLE SHEETS
// Copia este código completo en script.google.com

// Declaración de variables necesarias
const ContentService = SpreadsheetApp.newTextOutput
const DriveApp = DriveApp
const google = { script: { runtime: { ContentService, SpreadsheetApp, DriveApp } } }

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
      return ContentService()
        .setText(
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
        )
        .setMimeType(ContentService.MimeType.JSON)
    }

    const tipo = e.parameter.tipo || ""
    const query = e.parameter.q || ""
    const cuatrimestre = e.parameter.cuatrimestre || "todos"

    console.log(`🔍 Búsqueda: tipo=${tipo}, query=${query}, cuatrimestre=${cuatrimestre}`)

    if (!tipo) {
      return ContentService()
        .setText(
          JSON.stringify({
            error: "Parámetro 'tipo' requerido",
            validTypes: ["cursos", "alumno", "curso"],
          }),
        )
        .setMimeType(ContentService.MimeType.JSON)
    }

    let resultados

    if (tipo === "cursos") {
      resultados = getCursos()
    } else if (tipo === "alumno") {
      if (!query) {
        return ContentService()
          .setText(JSON.stringify({ error: "Parámetro 'q' requerido para búsqueda por alumno" }))
          .setMimeType(ContentService.MimeType.JSON)
      }
      resultados = buscarPorAlumno(query, cuatrimestre)
    } else if (tipo === "curso") {
      if (!query) {
        return ContentService()
          .setText(JSON.stringify({ error: "Parámetro 'q' requerido para búsqueda por curso" }))
          .setMimeType(ContentService.MimeType.JSON)
      }
      resultados = buscarPorCurso(query, cuatrimestre)
    } else {
      return ContentService()
        .setText(
          JSON.stringify({
            error: "Tipo de búsqueda no válido",
            validTypes: ["cursos", "alumno", "curso"],
          }),
        )
        .setMimeType(ContentService.MimeType.JSON)
    }

    return ContentService().setText(JSON.stringify(resultados)).setMimeType(ContentService.MimeType.JSON)
  } catch (error) {
    console.error("❌ Error en doGet:", error)
    return ContentService()
      .setText(
        JSON.stringify({
          error: "Error interno del servidor",
          details: error.toString(),
          timestamp: new Date().toISOString(),
        }),
      )
      .setMimeType(ContentService.MimeType.JSON)
  }
}

// Función optimizada para verificar si es Google Sheets
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

// Función de prueba optimizada para Google Sheets
function testScript() {
  console.log("=== 🚀 PRUEBAS OPTIMIZADAS PARA GOOGLE SHEETS ===")

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
        let otrosArchivos = 0

        while (files.hasNext()) {
          const file = files.next()
          totalFiles++

          if (esGoogleSheets(file)) {
            googleSheets++
            console.log(`   📊 Google Sheet: ${file.getName()}`)
          } else {
            otrosArchivos++
            console.log(`   📄 Otro archivo: ${file.getName()} (${file.getMimeType()})`)
          }
        }

        console.log(`   📈 Resumen: ${totalFiles} total, ${googleSheets} Google Sheets, ${otrosArchivos} otros`)
      } catch (error) {
        console.log(`❌ Error en carpeta ${especialidad}:`, error)
      }
    })

    console.log("\n2. 📚 Probando getCursos()...")
    const cursos = getCursos()
    console.log(`✅ Cursos encontrados: ${cursos.total}`)
    console.log("📊 Estadísticas:", cursos.estadisticas)
    if (cursos.cursos && cursos.cursos.length > 0) {
      console.log("📋 Primeros 3 cursos:", cursos.cursos.slice(0, 3))
    }
    if (cursos.errores) {
      console.log("⚠️ Errores encontrados:", cursos.errores.length)
    }

    console.log("\n3. 👨‍🎓 Probando buscarPorAlumno()...")
    const alumno = buscarPorAlumno("ACEVEDO", "todos")
    console.log(`✅ Resultados búsqueda alumno: ${alumno.length || 0}`)

    console.log("\n4. 🌐 Probando doGet() sin parámetros...")
    const testDoGet = doGet()
    const response = JSON.parse(testDoGet.getContent())
    console.log("✅ Respuesta doGet:", response.message)
    console.log("📊 Status:", response.status)

    console.log("\n5. 🔍 Probando búsqueda de curso...")
    const curso = buscarPorCurso("1", "todos")
    console.log(`✅ Resultados búsqueda curso: ${curso.length || 0}`)
  } catch (error) {
    console.error("❌ Error en pruebas:", error)
  }

  console.log("\n=== ✅ PRUEBAS COMPLETADAS ===")
  console.log("🚀 Si todo está funcionando, puedes desplegar como aplicación web")
  console.log("📝 Recuerda actualizar el ID del script en tu aplicación Next.js")
}

// Función para obtener estadísticas detalladas
function obtenerEstadisticas() {
  console.log("=== 📊 ESTADÍSTICAS DETALLADAS ===")

  let totalArchivos = 0
  let totalGoogleSheets = 0
  let totalAlumnos = 0
  let totalCalificaciones = 0

  Object.keys(FOLDER_IDS).forEach((especialidad) => {
    try {
      const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
      const files = folder.getFiles()

      console.log(`\n📁 ${especialidad.toUpperCase()}:`)

      while (files.hasNext()) {
        const file = files.next()
        totalArchivos++

        if (esGoogleSheets(file)) {
          totalGoogleSheets++

          try {
            const spreadsheet = SpreadsheetApp.openById(file.getId())
            const sheets = spreadsheet.getSheets()

            let alumnosEnArchivo = 0
            let calificacionesEnArchivo = 0

            sheets.forEach((sheet) => {
              const data = sheet.getDataRange().getValues()
              for (let i = 10; i < data.length; i++) {
                const nombreAlumno = data[i][1]
                if (nombreAlumno && nombreAlumno.toString().trim() !== "") {
                  alumnosEnArchivo++
                  // Contar calificaciones no vacías
                  ;[9, 17, 22].forEach((col) => {
                    if (obtenerNotaLimpia(data[i][col]) !== null) {
                      calificacionesEnArchivo++
                    }
                  })
                }
              }
            })

            totalAlumnos += alumnosEnArchivo
            totalCalificaciones += calificacionesEnArchivo

            console.log(
              `   📊 ${file.getName()}: ${alumnosEnArchivo} alumnos, ${calificacionesEnArchivo} calificaciones`,
            )
          } catch (error) {
            console.log(`   ❌ Error procesando ${file.getName()}:`, error)
          }
        }
      }
    } catch (error) {
      console.log(`❌ Error en carpeta ${especialidad}:`, error)
    }
  })

  console.log("\n=== 📈 RESUMEN GENERAL ===")
  console.log(`📄 Total archivos: ${totalArchivos}`)
  console.log(`📊 Google Sheets: ${totalGoogleSheets}`)
  console.log(`👨‍🎓 Total alumnos: ${totalAlumnos}`)
  console.log(`📝 Total calificaciones: ${totalCalificaciones}`)

  return {
    totalArchivos,
    totalGoogleSheets,
    totalAlumnos,
    totalCalificaciones,
  }
}
