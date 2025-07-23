import SetupChecker from "@/components/setup-checker"

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración del Sistema</h1>
          <p className="text-gray-600">Verificación del estado de configuración</p>
        </div>

        <SetupChecker />
      </div>
    </div>
  )
}
