"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Copy, ExternalLink } from "lucide-react"

interface DiagnosisResult {
  timestamp: string
  environment: {
    hasClientEmail: boolean
    hasPrivateKey: boolean
    clientEmailValue: string
    privateKeyFormat: string
    privateKeyLength: number
    privateKeyStarts: string
  }
  tests: {
    credentialFormat: boolean
    googleAuthTest: boolean
    driveApiTest: boolean
    folderAccessTest: boolean
  }
  errors: string[]
}

export default function ConnectionTester() {
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnosis = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/diagnose")
      const data = await response.json()
      setDiagnosis(data)
    } catch (error) {
      console.error("Error running diagnosis:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getTestIcon = (passed: boolean) => {
    return passed ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            Diagnóstico de Conexión a Google Drive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnosis} disabled={loading} className="w-full mb-4">
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Ejecutando diagnóstico...
              </>
            ) : (
              "🔍 Ejecutar Diagnóstico Completo"
            )}
          </Button>

          {diagnosis && (
            <div className="space-y-6">
              {/* Variables de Entorno */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Variables de Entorno</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>GOOGLE_CLIENT_EMAIL:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={diagnosis.environment.hasClientEmail ? "default" : "destructive"}>
                        {diagnosis.environment.hasClientEmail ? "✅ Presente" : "❌ Ausente"}
                      </Badge>
                      {diagnosis.environment.hasClientEmail && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(diagnosis.environment.clientEmailValue)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="text-sm bg-gray-50 p-2 rounded">
                    <strong>Valor:</strong> {diagnosis.environment.clientEmailValue}
                  </div>

                  <div className="flex items-center justify-between">
                    <span>GOOGLE_PRIVATE_KEY:</span>
                    <Badge variant={diagnosis.environment.hasPrivateKey ? "default" : "destructive"}>
                      {diagnosis.environment.hasPrivateKey ? "✅ Presente" : "❌ Ausente"}
                    </Badge>
                  </div>

                  <div className="text-sm bg-gray-50 p-2 rounded">
                    <strong>Longitud:</strong> {diagnosis.environment.privateKeyLength} caracteres
                    <br />
                    <strong>Inicia con:</strong> {diagnosis.environment.privateKeyStarts}...
                  </div>
                </CardContent>
              </Card>

              {/* Resultados de Pruebas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resultados de Pruebas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>1. Formato de credenciales:</span>
                    {getTestIcon(diagnosis.tests.credentialFormat)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span>2. Autenticación con Google:</span>
                    {getTestIcon(diagnosis.tests.googleAuthTest)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span>3. Acceso a Google Drive API:</span>
                    {getTestIcon(diagnosis.tests.driveApiTest)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span>4. Acceso a carpetas:</span>
                    {getTestIcon(diagnosis.tests.folderAccessTest)}
                  </div>
                </CardContent>
              </Card>

              {/* Errores Encontrados */}
              {diagnosis.errors.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-red-800">Errores Encontrados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-2">
                      {diagnosis.errors.map((error, index) => (
                        <li key={index} className="text-red-700 text-sm">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Acciones Recomendadas */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">Acciones Recomendadas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!diagnosis.tests.credentialFormat && (
                    <div className="p-3 bg-white rounded border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">🔧 Corregir Credenciales</h4>
                      <p className="text-sm text-blue-800 mb-2">
                        Las credenciales no tienen el formato correcto. Verifica:
                      </p>
                      <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                        <li>GOOGLE_CLIENT_EMAIL debe terminar en .iam.gserviceaccount.com</li>
                        <li>GOOGLE_PRIVATE_KEY debe incluir "BEGIN PRIVATE KEY" y "END PRIVATE KEY"</li>
                        <li>Asegúrate de que no haya espacios extra o caracteres especiales</li>
                      </ul>
                    </div>
                  )}

                  {!diagnosis.tests.googleAuthTest && diagnosis.tests.credentialFormat && (
                    <div className="p-3 bg-white rounded border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">🔑 Verificar Service Account</h4>
                      <p className="text-sm text-blue-800 mb-2">La autenticación falló. Verifica:</p>
                      <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                        <li>La service account existe en Google Cloud Console</li>
                        <li>La clave privada corresponde a la service account correcta</li>
                        <li>No hay saltos de línea adicionales en la clave privada</li>
                      </ul>
                    </div>
                  )}

                  {!diagnosis.tests.driveApiTest && diagnosis.tests.googleAuthTest && (
                    <div className="p-3 bg-white rounded border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">🚀 Habilitar APIs</h4>
                      <p className="text-sm text-blue-800 mb-2">Google Drive API no está disponible:</p>
                      <div className="space-y-2">
                        <a
                          href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=calificaciones-466814"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Habilitar Google Drive API
                        </a>
                        <a
                          href="https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=calificaciones-466814"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Habilitar Google Sheets API
                        </a>
                      </div>
                    </div>
                  )}

                  {!diagnosis.tests.folderAccessTest && diagnosis.tests.driveApiTest && (
                    <div className="p-3 bg-white rounded border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">📁 Compartir Carpetas</h4>
                      <p className="text-sm text-blue-800 mb-2">
                        No se puede acceder a las carpetas. Comparte cada carpeta con:
                      </p>
                      <div className="bg-gray-100 p-2 rounded font-mono text-sm">
                        emanuel@calificaciones-466814.iam.gserviceaccount.com
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 bg-transparent"
                        onClick={() => copyToClipboard("emanuel@calificaciones-466814.iam.gserviceaccount.com")}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copiar email
                      </Button>
                    </div>
                  )}

                  {diagnosis.tests.folderAccessTest && (
                    <div className="p-3 bg-green-100 rounded border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">🎉 ¡Configuración Exitosa!</h4>
                      <p className="text-sm text-green-800">
                        Todas las pruebas pasaron correctamente. La aplicación debería funcionar.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
