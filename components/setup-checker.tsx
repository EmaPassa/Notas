"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react"

interface SetupStatus {
  credentials: {
    hasClientEmail: boolean
    hasPrivateKey: boolean
    clientEmail: string
  }
  apis: {
    drive: boolean
    sheets: boolean
  }
  folders: Record<string, any>
  summary: {
    ready: boolean
    issues: string[]
  }
}

export default function SetupChecker() {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const checkStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/setup-status")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error("Error checking setup:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  if (!status) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Verificando configuración...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Estado General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.summary.ready ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            Estado de Configuración
            <Button variant="outline" size="sm" onClick={checkStatus} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status.summary.ready ? (
            <div className="text-green-600 font-semibold">
              ✅ Configuración completa - La aplicación está lista para usar
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-red-600 font-semibold">❌ Configuración incompleta</div>
              <div className="text-sm text-gray-600">
                <strong>Problemas encontrados:</strong>
                <ul className="list-disc list-inside mt-1">
                  {status.summary.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credenciales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.credentials.hasClientEmail && status.credentials.hasPrivateKey ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            Credenciales de Service Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Email del cliente:</span>
            <Badge variant={status.credentials.hasClientEmail ? "default" : "destructive"}>
              {status.credentials.hasClientEmail ? "✅ Configurado" : "❌ Faltante"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Clave privada:</span>
            <Badge variant={status.credentials.hasPrivateKey ? "default" : "destructive"}>
              {status.credentials.hasPrivateKey ? "✅ Configurado" : "❌ Faltante"}
            </Badge>
          </div>
          <div className="text-sm text-gray-600">
            <strong>Service Account:</strong> {status.credentials.clientEmail}
          </div>
        </CardContent>
      </Card>

      {/* APIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.apis.drive && status.apis.sheets ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            APIs de Google
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Google Drive API:</span>
            <Badge variant={status.apis.drive ? "default" : "destructive"}>
              {status.apis.drive ? "✅ Habilitada" : "❌ No disponible"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Google Sheets API:</span>
            <Badge variant={status.apis.sheets ? "default" : "destructive"}>
              {status.apis.sheets ? "✅ Habilitada" : "❌ No disponible"}
            </Badge>
          </div>
          {(!status.apis.drive || !status.apis.sheets) && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <strong>Acción requerida:</strong> Habilita las APIs en Google Cloud Console
                  <div className="mt-2 space-y-1">
                    <a
                      href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=calificaciones-466814"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Habilitar Google Drive API
                    </a>
                    <a
                      href="https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=calificaciones-466814"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Habilitar Google Sheets API
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Carpetas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {Object.values(status.folders).every((folder: any) => folder.accessible) ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            Acceso a Carpetas de Drive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(status.folders).map(([especialidad, folder]: [string, any]) => (
            <div key={especialidad} className="flex items-center justify-between">
              <span className="capitalize">{especialidad.replace("-", " ")}:</span>
              <div className="flex items-center gap-2">
                <Badge variant={folder.accessible ? "default" : "destructive"}>
                  {folder.accessible ? "✅ Accesible" : "❌ Sin acceso"}
                </Badge>
                {folder.accessible && <span className="text-sm text-gray-500">({folder.fileCount} archivos)</span>}
              </div>
            </div>
          ))}

          {Object.values(status.folders).some((folder: any) => !folder.accessible) && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <strong>Acción requerida:</strong> Comparte las carpetas con la Service Account
                  <div className="mt-2">
                    Email para compartir:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      emanuel@calificaciones-466814.iam.gserviceaccount.com
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      {status.summary.ready && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">¡Configuración Completa!</h3>
              <p className="text-green-700 mb-4">La aplicación está lista para usar</p>
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <a href="/">Ir a la Aplicación</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
