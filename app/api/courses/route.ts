import { NextResponse } from "next/server"
import { getFilesFromFolder, readSheetData, getCourseInfoFromData, FOLDER_IDS } from "@/lib/google-drive"

export async function GET() {
  try {
    const cursos: string[] = []
    const errores: string[] = []

    // Procesar cada carpeta
    for (const [especialidad, folderId] of Object.entries(FOLDER_IDS)) {
      try {
        console.log(`Procesando carpeta: ${especialidad}`)
        const files = await getFilesFromFolder(folderId)

        for (const file of files) {
          if (!file.id || !file.name) continue

          try {
            // Solo procesar Google Sheets
            if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
              const sheetData = await readSheetData(file.id)

              if (sheetData.length > 0) {
                const cursoInfo = getCourseInfoFromData(sheetData[0].data) || file.name
                cursos.push(`${cursoInfo} - ${especialidad.replace("-", " ").toUpperCase()}`)
              }
            }
          } catch (fileError) {
            console.error(`Error procesando archivo ${file.name}:`, fileError)
            errores.push(`${file.name}: ${fileError}`)
          }
        }
      } catch (folderError) {
        console.error(`Error en carpeta ${especialidad}:`, folderError)
        errores.push(`Carpeta ${especialidad}: ${folderError}`)
      }
    }

    return NextResponse.json({
      cursos: cursos.sort(),
      total: cursos.length,
      errores: errores.length > 0 ? errores : undefined,
    })
  } catch (error) {
    console.error("Error obteniendo cursos:", error)
    return NextResponse.json({ error: "Error interno del servidor", details: error }, { status: 500 })
  }
}
