# Flujo de Funcionamiento Detallado de la Aplicación

## 1. Pantalla de Inicio (Splash Screen)

**Duración:** 2-3 segundos

**Contenido:**
- Logo de la aplicación
- Animación de carga

**Acción:**
- Verifica si hay una sesión activa:
  - Si existe sesión: Redirige al Menú Principal
  - Si no existe sesión: Redirige al Login/Registro

## 2. Autenticación de Usuario

### a. Login/Registro

**Componentes:**
- Campos para correo electrónico y contraseña
- Botón "Iniciar sesión con Google"
- Enlace "¿No tienes cuenta? Regístrate aquí"

**Validaciones:**
- Formato de correo válido
- Contraseña con al menos 6 caracteres

**Flujo Exitoso:**
- Guarda datos del usuario (nombre, correo) en Firebase Auth
- Redirige al Menú Principal

## 3. Menú Principal

**Componentes:**
- Botón "Nuevo Documento"
- Botón "Documentos Creados"
- Avatar con nombre de usuario (desde el login)

**Acciones:**
- "Nuevo Documento": Abre el Formulario 01
- "Documentos Creados": Muestra el Historial de Documentos

## 4. Creación de Documento (Form01)

### a. Campos del Formulario

| Campo | Descripción |
|-------|-------------|
| Nombre del creador | Autocompletado desde el perfil del usuario |
| Empresa | Dropdown con 3 opciones predefinidas |
| Código único | Generado automáticamente (ej: ASIST-9X8Y7Z) |
| Fecha | Selector de fecha (predeterminada: día actual) |

### b. Botones y Validaciones

**"Escanear Documento":**
- Abre la Interfaz de Escaneo
- Requiere al menos 1 página escaneada para habilitar "Procesar Imágenes"

**"Procesar Documento con IA":**
- Habilitado solo si:
  - Todos los campos del formulario están completos
  - Hay al menos 1 imagen escaneada
- Acción: Ejecuta el OCR y redirige al Form02

### c. Interfaz de Escaneo

**Componentes:**
- Vista previa de la cámara
- Botón "Escanear más páginas" (permite capturar múltiples hojas)
- Botón "Procesar Imágenes" (cierra la cámara y regresa al Form01)

**Alerta al salir:**
- Si hay datos no guardados, muestra:
  - "¿Está seguro? Se perderán los cambios no guardados"

## 5. Edición y Envío (Form02)

### a. Previsualización de Datos

**Componentes:**
- Tabla editable con 3 columnas (Nombre, Entrada, Salida)
- Botón "Editar" por fila para correcciones manuales
- Indicador de errores de formato (ej: hora inválida resaltada en rojo)

### b. Configuración de Exportación

| Campo | Validaciones |
|-------|--------------|
| Tipo de documento | Dropdown: XLS, CSV, PDF (obligatorio) |
| Correos electrónicos | Múltiples correos separados por comas. Al menos 1 correo válido (regex de validación) |

### c. Botón "Enviar Documento"

**Habilitado solo si:**
- Tipo de documento seleccionado
- Al menos 1 correo válido ingresado

**Acciones al enviar:**
1. Genera el archivo con cabecera:
   ```
   Código: ASIST-9X8Y7Z
   Fecha: 2024-05-20 14:30
   Empresa: Constructora Alpha
   Creador: usuario@empresa.com
   ```
2. Envía el documento por correo usando SMTP o API de EmailJS
3. Guarda una copia en el Historial de Documentos

## 6. Historial de Documentos

**Listado:**
- Orden descendente por fecha (más recientes primero)
- Nombre del documento: [Código] [Timestamp] (ej: ASIST-9X8Y7Z 2024-05-20 14:30)

**Detalle del Documento:**
- Vista de solo lectura con:
  - Cabecera completa
  - Tabla de datos procesados
  - Botón "Volver al Inicio"

## 7. Estructura de Carpetas del Proyecto

```
digital-assistance/
├── src/
│   ├── assets/
│   │   ├── images/
│   │   │   ├── logo.png
│   │   │   └── icons/
│   │   └── styles/
│   │       ├── main.css
│   │       └── variables.css
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── documents/
│   │   │   ├── DocumentForm.jsx
│   │   │   ├── DocumentHistory.jsx
│   │   │   └── DocumentViewer.jsx
│   │   ├── scanner/
│   │   │   ├── Scanner.jsx
│   │   │   └── ImagePreview.jsx
│   │   └── common/
│   │       ├── Header.jsx
│   │       ├── Footer.jsx
│   │       └── Loading.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   └── DocumentContext.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useScanner.js
│   │   └── useDocuments.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── document.service.js
│   │   ├── email.service.js
│   │   └── ocr.service.js
│   ├── utils/
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   └── constants.js
│   ├── pages/
│   │   ├── Splash.jsx
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── DocumentForm.jsx
│   │   └── DocumentHistory.jsx
│   ├── App.jsx
│   └── main.jsx
├── public/
│   ├── index.html
│   └── favicon.ico
├── docs/
│   └── context.md
├── tests/
│   ├── unit/
│   └── integration/
├── .env
├── .gitignore
├── package.json
└── README.md
```

## 8. Esquema de Base de Datos (Firebase)

### Colección: users
```javascript
{
  uid: string,                    // ID único de Firebase Auth
  email: string,                  // Correo electrónico
  displayName: string,            // Nombre completo
  company: string,                // Empresa seleccionada
  createdAt: timestamp,           // Fecha de creación
  lastLogin: timestamp,           // Último inicio de sesión
  role: string                    // Rol del usuario (admin/user)
}
```

### Colección: documents
```javascript
{
  id: string,                     // ID único del documento
  code: string,                   // Código único (ej: ASIST-9X8Y7Z)
  creatorId: string,              // Referencia al usuario creador
  company: string,                // Empresa
  createdAt: timestamp,           // Fecha de creación
  status: string,                 // Estado (draft/processed/sent)
  type: string,                   // Tipo de documento (XLS/CSV/PDF)
  recipients: string[],           // Lista de correos destinatarios
  pages: {                        // Subcolección de páginas escaneadas
    id: string,                   // ID de la página
    imageUrl: string,             // URL de la imagen en Storage
    processedText: string,        // Texto extraído por OCR
    order: number                 // Orden de la página
  }[],
  data: {                         // Datos procesados
    entries: {
      name: string,               // Nombre del empleado
      entryTime: string,          // Hora de entrada
      exitTime: string,           // Hora de salida
      validated: boolean          // Estado de validación
    }[]
  },
  metadata: {
    processedAt: timestamp,       // Fecha de procesamiento
    sentAt: timestamp,            // Fecha de envío
    fileUrl: string,              // URL del archivo generado
    errorCount: number            // Número de errores detectados
  }
}
```

### Colección: companies
```javascript
{
  id: string,                     // ID único de la empresa
  name: string,                   // Nombre de la empresa
  code: string,                   // Código interno
  active: boolean,                // Estado de la empresa
  createdAt: timestamp,           // Fecha de creación
  updatedAt: timestamp            // Última actualización
}
```

### Reglas de Seguridad
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para usuarios
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Reglas para documentos
    match /documents/{documentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                   resource.data.creatorId == request.auth.uid;
      allow delete: if request.auth != null && 
                   resource.data.creatorId == request.auth.uid;
    }
    
    // Reglas para empresas
    match /companies/{companyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Índices
```javascript
// Colección: documents
{
  "fields": [
    { "fieldPath": "creatorId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}

{
  "fields": [
    { "fieldPath": "company", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```
