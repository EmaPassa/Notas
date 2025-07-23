# 🚀 Guía de Configuración Completa

## 1. ✅ Service Account Creada
- Email: emanuel@calificaciones-466814.iam.gserviceaccount.com
- ID: 105099563980520655912

## 2. 📋 Pasos Restantes:

### A. Descargar la Clave Privada
1. Ve a Google Cloud Console
2. Navega a "IAM & Admin" > "Service Accounts"
3. Busca: emanuel@calificaciones-466814.iam.gserviceaccount.com
4. Haz clic en los 3 puntos (⋮) > "Manage keys"
5. Clic en "Add Key" > "Create new key"
6. Selecciona "JSON" y descarga el archivo

### B. Configurar Variables de Entorno
1. Crea el archivo `.env.local` en la raíz del proyecto
2. Abre el archivo JSON descargado
3. Copia los valores:

\`\`\`env
GOOGLE_CLIENT_EMAIL=emanuel@calificaciones-466814.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(copia toda la clave privada del JSON, incluyendo BEGIN y END)
-----END PRIVATE KEY-----"
\`\`\`

### C. Habilitar APIs Necesarias
En Google Cloud Console:
1. Ve a "APIs & Services" > "Library"
2. Busca y habilita:
   - ✅ Google Drive API
   - ✅ Google Sheets API

### D. Compartir Carpetas de Drive
Comparte cada carpeta con: emanuel@calificaciones-466814.iam.gserviceaccount.com

**Carpetas a compartir:**
- Alimentos: 18N92XyXH2TWY95ur8MRag9PUfxnMJn_M
- Ciclo Básico: 1vXS7lmmNqm0mNaAp7xxK-_0B1CwOOaST  
- Electromecánica: 1hzQQMhanhF4swRbDlg3_2dhuRdxMdDbm
- Maestro Mayor de Obra: 1XEHHRVzFNfM13uNdblHbXbqI_Yw2hapm

**Pasos para compartir:**
1. Abre Google Drive
2. Busca cada carpeta por su ID (pega el ID en la barra de búsqueda)
3. Clic derecho > "Compartir"
4. Agrega: emanuel@calificaciones-466814.iam.gserviceaccount.com
5. Rol: "Viewer" (solo lectura)
6. Desactiva "Notify people" (no enviar notificación)

## 3. 🧪 Probar la Configuración

### Instalar dependencias:
\`\`\`bash
npm install googleapis
\`\`\`

### Probar conexión:
\`\`\`bash
npm run dev
\`\`\`

Luego visita: http://localhost:3000/api/test-connection

### Resultado esperado:
\`\`\`json
{
  "conexion": {
    "exito": true,
    "usuario": "emanuel@calificaciones-466814.iam.gserviceaccount.com"
  },
  "carpetas": {
    "alimentos": {
      "exito": true,
      "nombre": "Nombre de la carpeta",
      "archivos": 5
    },
    // ... más carpetas
  }
}
\`\`\`

## 4. 🔧 Solución de Problemas

### Error: "Access denied"
- Verifica que las carpetas estén compartidas con la service account
- Confirma que las APIs estén habilitadas

### Error: "Invalid credentials"
- Revisa que la GOOGLE_PRIVATE_KEY esté correctamente formateada
- Asegúrate de que no haya espacios extra en el .env.local

### Error: "File not found"
- Verifica que los IDs de las carpetas sean correctos
- Confirma que las carpetas existan y sean accesibles
