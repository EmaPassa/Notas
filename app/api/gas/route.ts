import { type NextRequest, NextResponse } from "next/server"

// Actualizar la URL del Google Apps Script con tu nuevo ID específico
const GAS_BASE =
  "https://script.google.com/macros/s/AKfycbxSA6viW_kq8GSjSOVd4pV2C0qjqVZNtvQa5kefST_O7Csp4235mzFXh5X1LtPMcHaMjg/exec"

export async function GET(req: NextRequest) {
  try {
    // Reenviamos todos los parámetros recibidos al GAS
    const search = req.nextUrl.searchParams
    const proxiedURL = `${GAS_BASE}?${search.toString()}`
    const gasRes = await fetch(proxiedURL, { cache: "no-store" })

    // Intentar siempre parsear como JSON, independientemente del Content-Type
    const raw = await gasRes.text()
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      body = {
        error: "Respuesta no-JSON desde Google Apps Script",
        status: gasRes.status,
        raw,
      }
    }

    return NextResponse.json(body, { status: gasRes.status })
  } catch (err) {
    console.error("Proxy error:", err)
    return NextResponse.json({ error: "Proxy error", details: (err as Error).message }, { status: 500 })
  }
}
