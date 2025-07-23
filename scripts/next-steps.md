# 🚀 Configuración Completada - Siguientes Pasos

## ✅ Credenciales Configuradas
- Service Account: emanuel@calificaciones-466814.iam.gserviceaccount.com
- Archivo .env.local creado con las credenciales

## 📋 Pasos Restantes:

### 1. 🔧 Habilitar APIs en Google Cloud Console

Ve a: https://console.cloud.google.com/apis/library?project=calificaciones-466814

**APIs a habilitar:**
- ✅ Google Drive API: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=calificaciones-466814
- ✅ Google Sheets API: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=calificaciones-466814

### 2. 📁 Compartir Carpetas de Google Drive

**Carpetas a compartir con: emanuel@calificaciones-466814.iam.gserviceaccount.com**

| Especialidad | ID de Carpeta | Enlace Directo |
|--------------|---------------|----------------|
| Alimentos | 18N92XyXH2TWY95ur8MRag9PUfxnMJn_M | https://drive.google.com/drive/folders/18N92XyXH2TWY95ur8MRag9PUfxnMJn_M |
| Ciclo Básico | 1vXS7lmmNqm0mNaAp7xxK-_0B1CwOOaST | https://drive.google.com/drive/folders/1vXS7lmmNqm0mNaAp7xxK-_0B1CwOOaST |
| Electromecánica | 1hzQQMhanhF4swRbDlg3_2dhuRdxMdDbm | https://drive.google.com/drive/folders/1hzQQMhanhF4swRbDlg3_2dhuRdxMdDbm |
| Maestro Mayor de Obra | 1XEHHRVzFNfM13uNdblHbXbqI_Yw2hapm | https://drive.google.com/drive/folders/1XEHHRVzFNfM13uNdblHbXbqI_Yw2hapm |

**Para cada carpeta:**
1. Haz clic en el enlace directo
2. Clic derecho en la carpeta > "Compartir" (o ícono de compartir)
3. Agregar: emanuel@calificaciones-466814.iam.gserviceaccount.com
4. Rol: "Viewer" (solo lectura)
5. ✅ Desmarcar "Notify people" (no enviar notificación)
6. Clic en "Compartir"

### 3. 🧪 Instalar Dependencias y Probar

\`\`\`bash
# Instalar dependencias
npm install googleapis

# Iniciar servidor de desarrollo
npm run dev
\`\`\`

### 4. 🔍 Verificar Configuración

Visita estos endpoints para probar:

1. **Validar configuración:** http://localhost:3000/api/validate-setup
2. **Probar conexión:** http://localhost:3000/api/test-connection
3. **Ver cursos disponibles:** http://localhost:3000/api/courses
4. **Buscar alumno:** http://localhost:3000/api/students?tipo=alumno&q=ACEVEDO

### 5. 📱 Usar la Aplicación

Una vez que todo esté configurado, visita: http://localhost:3000

## 🔧 Solución de Problemas

### Error: "Access denied" o "Forbidden"
- ✅ Verifica que las APIs estén habilitadas
- ✅ Confirma que las carpetas estén compartidas con la service account
- ✅ Espera 1-2 minutos después de compartir (propagación de permisos)

### Error: "Invalid credentials"
- ✅ Verifica que el archivo .env.local esté en la raíz del proyecto
- ✅ Confirma que no haya espacios extra en las credenciales
- ✅ Reinicia el servidor de desarrollo (npm run dev)

### Error: "File not found"
- ✅ Verifica que los IDs de las carpetas sean correctos
- ✅ Confirma que las carpetas existan y sean accesibles
