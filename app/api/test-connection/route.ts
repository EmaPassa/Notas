import { NextResponse } from "next/server"
import { getDriveClient, FOLDER_IDS } from "@/lib/google-drive"

export async function GET() {
  try {
    const drive = getDriveClient()
    const resultados: any = {}

    // Probar conexión básica
    try {
      const about = await drive.about.get({ fields: "user" })
      resultados.conexion = {
        exito: true,
        usuario: about.data.user?.emailAddress,
      }
    } catch (error) {
      resultados.conexion = {
        exito: false,
        error: error,
      }
    }

    // Probar acceso a cada carpeta
    resultados.carpetas = {}
    for (const [especialidad, folderId] of Object.entries(FOLDER_IDS)) {
      try {
        const folder = await drive.files.get({ fileId: folderId })
        const files = await drive.files.list({
          q: `'${folderId}' in parents`,
          pageSize: 5,
        })

        resultados.carpetas[especialidad] = {
          exito: true,
          nombre: folder.data.name,
          archivos: files.data.files?.length || 0,
        }
      } catch (error) {
        resultados.carpetas[especialidad] = {
          exito: false,
          error: error,
        }
      }
    }

    return NextResponse.json(resultados)
  } catch (error) {
    return NextResponse.json({ error: "Error probando conexión", details: error }, { status: 500 })
  }
}
