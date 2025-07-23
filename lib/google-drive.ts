import { google } from "googleapis"

// Configuración de Google Drive API
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

// IDs de las carpetas de Google Drive
export const FOLDER_IDS = {
  alimentos: "18N92XyXH2TWY95ur8MRag9PUfxnMJn_M",
  "ciclo-basico": "1vXS7lmmNqm0mNaAp7xxK-_0B1CwOOaST",
  electromecanica: "1hzQQMhanhF4swRbDlg3_2dhuRdxMdDbm",
  "maestro-mayor-obra": "1XEHHRVzFNfM13uNdblHbXbqI_Yw2hapm",
}

// Configurar cliente de Google Drive
export function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: SCOPES,
  })

  return google.drive({ version: "v3", auth })
}

// Configurar cliente de Google Sheets
export function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  return google.sheets({ version: "v4", auth })
}

// Tipos de datos
export interface Grade {
  materia: string
  curso: string
  cuatrimestre: "1º" | "2º" | "Final"
  nota: number | "Sin nota"
}

export interface Student {
  nombre: string
  calificaciones: Grade[]
}

// Obtener archivos de una carpeta
export async function getFilesFromFolder(folderId: string) {
  const drive = getDriveClient()

  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')`,
      fields: "files(id, name, mimeType, modifiedTime)",
    })

    return response.data.files || []
  } catch (error) {
    console.error(`Error obteniendo archivos de carpeta ${folderId}:`, error)
    return []
  }
}

// Leer datos de Google Sheets
export async function readSheetData(fileId: string) {
  const sheets = getSheetsClient()

  try {
    // Obtener información del spreadsheet
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: fileId,
    })

    const sheetData: any[] = []

    // Leer cada hoja
    for (const sheet of spreadsheet.data.sheets || []) {
      const sheetName = sheet.properties?.title
      if (!sheetName) continue

      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: fileId,
          range: `${sheetName}!A1:Z1000`, // Rango amplio para capturar todos los datos
        })

        sheetData.push({
          name: sheetName,
          data: response.data.values || [],
        })
      } catch (sheetError) {
        console.error(`Error leyendo hoja ${sheetName}:`, sheetError)
      }
    }

    return sheetData
  } catch (error) {
    console.error(`Error leyendo spreadsheet ${fileId}:`, error)
    return []
  }
}

// Obtener información del curso desde los datos
export function getCourseInfoFromData(data: any[][]): string | null {
  try {
    if (data.length >= 7) {
      const fila7 = data[6] // Fila 7 (índice 6)
      const año = fila7[0] ? fila7[0].toString().replace("AÑO:", "").trim() : ""
      const seccion = fila7[1] ? fila7[1].toString().replace("SECCIÓN:", "").trim() : ""

      if (año && seccion) {
        return `${año} ${seccion}`
      }
    }
    return null
  } catch (error) {
    console.error("Error obteniendo info del curso:", error)
    return null
  }
}

// Limpiar y validar notas
export function cleanGrade(valor: any): number | "Sin nota" | null {
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

// Extraer calificaciones de una fila
export function extractGradesFromRow(
  fila: any[],
  nombreMateria: string,
  nombreCurso: string,
  filtroCuatrimestre: string,
): Grade[] {
  const calificaciones: Grade[] = []

  try {
    // Índices de columnas según la estructura:
    // CALIFICACIÓN 1º CUATRIMESTRE: Columna J (índice 9)
    // CALIFICACIÓN 2º CUATRIMESTRE: Columna R (índice 17)
    // CALIFICACIÓN FINAL: Columna W (índice 22)

    // 1º Cuatrimestre
    if (filtroCuatrimestre === "todos" || filtroCuatrimestre === "1º") {
      const nota1C = cleanGrade(fila[9]) // Columna J
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
      const nota2C = cleanGrade(fila[17]) // Columna R
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
      const notaFinal = cleanGrade(fila[22]) // Columna W
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
