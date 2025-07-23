import { NextResponse } from "next/server"
import { validateSetup } from "@/lib/setup-validator"

export async function GET() {
  try {
    const validation = await validateSetup()

    return NextResponse.json({
      ...validation,
      envVars: {
        hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL
          ? process.env.GOOGLE_CLIENT_EMAIL.substring(0, 20) + "..."
          : "No configurado",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        isValid: false,
        errors: ["Error validando configuración"],
        details: error,
      },
      { status: 500 },
    )
  }
}
