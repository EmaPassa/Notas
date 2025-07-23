import { NextResponse } from "next/server"

export async function GET() {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    environment: {
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      clientEmailValue: process.env.GOOGLE_CLIENT_EMAIL || "No configurado",
      privateKeyFormat: process.env.GOOGLE_PRIVATE_KEY ? "Presente" : "Ausente",
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
      privateKeyStarts: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50) || "N/A",
    },
    tests: {
      credentialFormat: false,
      googleAuthTest: false,
      driveApiTest: false,
      folderAccessTest: false,
    },
    errors: [] as string[],
  }

  // Test 1: Verificar formato de credenciales
  try {
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      // Verificar que el email termine con .iam.gserviceaccount.com
      if (
        process.env.GOOGLE_CLIENT_EMAIL.includes("@") &&
        process.env.GOOGLE_CLIENT_EMAIL.includes(".iam.gserviceaccount.com")
      ) {
        // Verificar que la clave privada tenga el formato correcto
        if (
          process.env.GOOGLE_PRIVATE_KEY.includes("BEGIN PRIVATE KEY") &&
          process.env.GOOGLE_PRIVATE_KEY.includes("END PRIVATE KEY")
        ) {
          diagnosis.tests.credentialFormat = true
        } else {
          diagnosis.errors.push("Formato de clave privada inválido")
        }
      } else {
        diagnosis.errors.push("Email de service account inválido")
      }
    } else {
      diagnosis.errors.push("Variables de entorno faltantes")
    }
  } catch (error) {
    diagnosis.errors.push(`Error verificando credenciales: ${error}`)
  }

  // Test 2: Probar autenticación con Google
  if (diagnosis.tests.credentialFormat) {
    try {
      const { google } = require("googleapis")

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      })

      const authClient = await auth.getClient()
      diagnosis.tests.googleAuthTest = true
    } catch (error) {
      diagnosis.errors.push(`Error de autenticación: ${error}`)
    }
  }

  // Test 3: Probar Google Drive API
  if (diagnosis.tests.googleAuthTest) {
    try {
      const { google } = require("googleapis")

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      })

      const drive = google.drive({ version: "v3", auth })
      const about = await drive.about.get({ fields: "user" })

      diagnosis.tests.driveApiTest = true
    } catch (error) {
      diagnosis.errors.push(`Error de Drive API: ${error}`)
    }
  }

  // Test 4: Probar acceso a carpeta específica
  if (diagnosis.tests.driveApiTest) {
    try {
      const { google } = require("googleapis")

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      })

      const drive = google.drive({ version: "v3", auth })

      // Probar acceso a la primera carpeta
      const testFolderId = "18N92XyXH2TWY95ur8MRag9PUfxnMJn_M" // Alimentos
      const folder = await drive.files.get({ fileId: testFolderId })

      diagnosis.tests.folderAccessTest = true
    } catch (error) {
      diagnosis.errors.push(`Error accediendo a carpeta: ${error}`)
    }
  }

  return NextResponse.json(diagnosis)
}
