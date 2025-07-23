// Utilidad para validar la configuración
export async function validateSetup() {
  const errors: string[] = []
  const warnings: string[] = []

  // Verificar variables de entorno
  if (!process.env.GOOGLE_CLIENT_EMAIL) {
    errors.push("GOOGLE_CLIENT_EMAIL no está configurado")
  } else if (!process.env.GOOGLE_CLIENT_EMAIL.includes("@")) {
    errors.push("GOOGLE_CLIENT_EMAIL no parece ser un email válido")
  }

  if (!process.env.GOOGLE_PRIVATE_KEY) {
    errors.push("GOOGLE_PRIVATE_KEY no está configurado")
  } else if (!process.env.GOOGLE_PRIVATE_KEY.includes("BEGIN PRIVATE KEY")) {
    errors.push("GOOGLE_PRIVATE_KEY no parece ser una clave privada válida")
  }

  // Verificar formato del email de service account
  const expectedEmail = "emanuel@calificaciones-466814.iam.gserviceaccount.com"
  if (process.env.GOOGLE_CLIENT_EMAIL !== expectedEmail) {
    warnings.push(`Email esperado: ${expectedEmail}, actual: ${process.env.GOOGLE_CLIENT_EMAIL}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
