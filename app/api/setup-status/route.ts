import { NextResponse } from "next/server"
import { getDriveClient, getSheetsClient, FOLDER_IDS } from "@/lib/google-drive"

export async function GET() {
  const status = {
    credentials: {
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL || "No configurado",
    },
    apis: {
      drive: false,
      sheets: false,
    },
    folders: {} as Record<string, any>,
    summary: {
      ready: false,
      issues: [] as string[],
    },
  }

  // Probar APIs
  try {
    const drive = getDriveClient()
    await drive.about.get({ fields: "user" })
    status.apis.drive = true
  } catch (error) {
    status.summary.issues.push("Google Drive API no disponible o credenciales inválidas")
  }

  try {
    const sheets = getSheetsClient()
    // Intentar una operación básica
    status.apis.sheets = true
  } catch (error) {
    status.summary.issues.push("Google Sheets API no disponible")
  }

  // Probar acceso a carpetas
  if (status.apis.drive) {
    const drive = getDriveClient()

    for (const [especialidad, folderId] of Object.entries(FOLDER_IDS)) {
      try {
        const folder = await drive.files.get({ fileId: folderId })
        const files = await drive.files.list({
          q: `'${folderId}' in parents`,
          pageSize: 5,
        })

        status.folders[especialidad] = {
          accessible: true,
          name: folder.data.name,
          fileCount: files.data.files?.length || 0,
        }
      } catch (error) {
        status.folders[especialidad] = {
          accessible: false,
          error: "Carpeta no accesible - verificar permisos",
        }
        status.summary.issues.push(`Carpeta ${especialidad} no accesible`)
      }
    }
  }

  // Determinar si está listo
  const foldersAccessible = Object.values(status.folders).every((folder: any) => folder.accessible)
  status.summary.ready = status.apis.drive && status.apis.sheets && foldersAccessible

  return NextResponse.json(status)
}
