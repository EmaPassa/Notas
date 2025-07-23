// Google Apps Script para leer calificaciones desde Google Drive - CON MANEJO DE PERMISOS
// Este código debe copiarse en script.google.com

// IDs de las carpetas de Google Drive
const FOLDER_IDS = {
  alimentos: "1S8rb_MQzw3gk2oINyrJlOVcGFz_4Ilx1",
  "ciclo-basico": "1KlL6VwcTKtPwoTeinY3Lr0ZXbAn0z2Ek",
  electromecanica: "17Iu3LvPrshvJiX7je-TQlXWkwl47hSxE",
  "maestro-mayor-obra": "1nfm9VtYRh7zdjB20WWtp7k6vxBPiZ9uk",
}

// Importaciones necesarias
const ContentService = GoogleAppsScript.ContentService
const DriveApp = GoogleAppsScript.DriveApp
const SpreadsheetApp = GoogleAppsScript.SpreadsheetApp
const Drive = GoogleAppsScript.Drive
const MimeType = GoogleAppsScript.MimeType // Declare the MimeType variable

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

    if (tipo === "cursos") {
      const resultados = getCursos()
      return ContentService.createTextOutput(JSON.stringify(resultados)).setMimeType(ContentService.MimeType.JSON)
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
  const archivosConError = []
  const archivosExitosos = []

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

            try {
              const alumnosEncontrados = buscarAlumnoEnArchivo(file, nombreAlumno, nombreCurso, filtroCuatrimestre)
              if (alumnosEncontrados.length > 0) {
                resultados.push(...alumnosEncontrados)
                archivosExitosos.push(fileName)
              }
            } catch (fileError) {
              console.error(`Error procesando ${fileName}:`, fileError)
              archivosConError.push({
                archivo: fileName,
                error: fileError.toString(),
              })
            }
          }
        }
      } catch (folderError) {
        console.error(`Error en carpeta ${especialidad}:`, folderError)
      }
    })

    return {
      resultados: resultados,
      estadisticas: {
        archivosExitosos: archivosExitosos.length,
        archivosConError: archivosConError.length,
        totalResultados: resultados.length,
      },
      errores: archivosConError.length > 0 ? archivosConError.slice(0, 5) : undefined, // Solo primeros 5 errores
    }
  } catch (error) {
    console.error("Error buscando alumno:", error)
    return { error: error.toString() }
  }
}

// Buscar por curso
function buscarPorCurso(nombreCurso, filtroCuatrimestre) {
  const resultados = []
  const archivosConError = []
  const archivosExitosos = []

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
            try {
              const todosLosAlumnos = obtenerTodosLosAlumnosDelArchivo(file, nombreArchivo, filtroCuatrimestre)
              if (todosLosAlumnos.length > 0) {
                resultados.push(...todosLosAlumnos)
                archivosExitosos.push(fileName)
              }
            } catch (fileError) {
              console.error(`Error procesando ${fileName}:`, fileError)
              archivosConError.push({
                archivo: fileName,
                error: fileError.toString(),
              })
            }
          }
        }
      } catch (folderError) {
        console.error(`Error en carpeta ${especialidad}:`, folderError)
      }
    })

    return {
      resultados: resultados,
      estadisticas: {
        archivosExitosos: archivosExitosos.length,
        archivosConError: archivosConError.length,
        totalResultados: resultados.length,
      },
      errores: archivosConError.length > 0 ? archivosConError.slice(0, 5) : undefined,
    }
  } catch (error) {
    console.error("Error buscando curso:", error)
    return { error: error.toString() }
  }
}

// Función para convertir archivo Excel a Google Sheets si es necesario
function convertirArchivoSiEsNecesario(file) {
  try {
    // Si el archivo ya es un Google Sheets, devolverlo tal como está
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      return SpreadsheetApp.openById(file.getId())
    }

    // Si es un archivo Excel, intentar convertirlo
    if (file.getMimeType() === MimeType.MICROSOFT_EXCEL || file.getMimeType() === MimeType.MICROSOFT_EXCEL_LEGACY) {
      console.log(`Convirtiendo archivo Excel: ${file.getName()}`)

      // Crear una copia como Google Sheets
      const blob = file.getBlob()
      const convertedFile = Drive.Files.insert(
        {
          title: file.getName() + "_converted",
          parents: [{ id: file.getParents().next().getId() }],
        },
        blob,
        {
          convert: true,
        },
      )

      return SpreadsheetApp.openById(convertedFile.id)
    }

    // Si no es ninguno de los tipos esperados, intentar abrirlo directamente
    return SpreadsheetApp.openById(file.getId())
  } catch (error) {
    console.error(`Error convirtiendo archivo ${file.getName()}:`, error)
    throw error
  }
}

// Buscar alumno específico en un archivo - MEJORADO
function buscarAlumnoEnArchivo(file, nombreAlumno, nombreCurso, filtroCuatrimestre) {
  const resultados = []

  try {
    const spreadsheet = convertirArchivoSiEsNecesario(file)
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
    console.error(`Error procesando archivo ${file.getName()}:`, error)
    throw error // Re-lanzar el error para que sea manejado por la función llamadora
  }
}

// Obtener todos los alumnos de un archivo - MEJORADO
function obtenerTodosLosAlumnosDelArchivo(file, nombreCurso, filtroCuatrimestre) {
  const resultados = []

  try {
    const spreadsheet = convertirArchivoSiEsNecesario(file)
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
    console.error(`Error obteniendo alumnos del archivo ${file.getName()}:`, error)
    throw error
  }
}

// Extraer calificaciones de una fila
function extraerCalificacionesDeFilaAlumno(fila, nombreMateria, nombreCurso, filtroCuatrimestre) {
  const calificaciones = []

  try {
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

  if (valorStr === "s/e" || valorStr === "sin evaluar" || valorStr === "" || valorStr === "null") {
    return "Sin nota"
  }

  const numero = Number.parseFloat(valorStr)
  if (!isNaN(numero) && numero >= 0 && numero <= 10) {
    return numero
  }

  return null
}

// Función para verificar permisos de un archivo específico
function verificarPermisos() {
  console.log("=== VERIFICANDO PERMISOS ===")

  try {
    Object.keys(FOLDER_IDS).forEach((especialidad) => {
      console.log(`\nVerificando carpeta: ${especialidad}`)
      const folder = DriveApp.getFolderById(FOLDER_IDS[especialidad])
      const files = folder.getFiles()

      let contador = 0
      while (files.hasNext() && contador < 3) {
        // Solo verificar primeros 3 archivos
        const file = files.next()
        const fileName = file.getName()

        if (fileName.match(/\.(xlsx|xls)$/i)) {
          try {
            console.log(`  ✓ Archivo accesible: ${fileName}`)
            const spreadsheet = SpreadsheetApp.openById(file.getId())
            const sheets = spreadsheet.getSheets()
            console.log(`    - Hojas encontradas: ${sheets.length}`)
            contador++
          } catch (error) {
            console.log(`  ✗ Error accediendo: ${fileName} - ${error.toString()}`)
          }
        }
      }
    })
  } catch (error) {
    console.error("Error verificando permisos:", error)
  }

  console.log("=== VERIFICACIÓN COMPLETADA ===")
}

// Función de prueba mejorada
function testScript() {
  console.log("=== INICIANDO PRUEBAS ===")

  try {
    console.log("1. Probando getCursos()...")
    const cursos = getCursos()
    console.log("Cursos encontrados:", cursos.total)

    console.log("2. Verificando permisos...")
    verificarPermisos()

    console.log("3. Probando buscarPorAlumno()...")
    const alumno = buscarPorAlumno("ACEVEDO", "todos")
    console.log("Resultado búsqueda alumno:", JSON.stringify(alumno, null, 2))
  } catch (error) {
    console.error("Error en pruebas:", error)
  }

  console.log("=== PRUEBAS COMPLETADAS ===")
}
