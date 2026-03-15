# API de Análisis Nutricional con Visión - Diseño

## 1. Visión General

**Objetivo:** Crear una API en NestJS que acepte imágenes en Base64 de alimentos, las analice usando la API de visión de Anthropic (Claude), y devuelva un desglose nutricional completo.

**Usuario objetivo:** Aplicaciones móviles o web que permitan a usuarios registrar alimentos mediante fotografías para obtener información nutricional.

---

## 2. Arquitectura

### Stack Tecnológico
- **Framework:** NestJS con TypeScript
- **Autenticación:** JWT (JSON Web Tokens)
- **AI:** Anthropic Claude Vision API
- **Paquetes clave:**
  - `@nestjs/passport` + `passport-jwt` para auth
  - `@anthropic-ai/sdk` para integración con Anthropic
  - `class-validator` + `class-transformer` para DTOs

### Diagrama de Flujo

```
┌─────────────┐     JWT      ┌─────────────┐    ┌─────────────┐
│   Cliente   │ ──────────►  │   NestJS    │ ──►│  Anthropic  │
│             │               │    API      │    │   Vision    │
└─────────────┘               └─────────────┘    └─────────────┘
                                    │
                              ┌─────┴─────┐
                              │  Validar  │
                              │   JWT     │
                              └───────────┘
```

---

## 3. Autenticación JWT

### Endpoints de Auth

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Genera token JWT |
| POST | `/auth/register` | Registra nuevo usuario |

### Estructura del Token
- **Algoritmo:** HS256
- **Expiración:** Configurable (default 24h)
- **Payload:** `{ sub: userId, email: userEmail }`

### Guía para el Cliente
- **Recomendado:** Almacenar JWT en cookies HttpOnly para mayor seguridad (previene XSS)
- **Alternativa:** localStorage si no es posible usar cookiesHttpOnly (menos seguro)

> **Nota para MVP:** Por simplicidad, el cliente envía el JWT en el header `Authorization: Bearer <token>`. La implementación de HttpOnly cookies puede agregarse en una iteración futura.

### Persistencia de Usuarios
- **MVP:** Almacenamiento en memoria (array en memoria) - solo para desarrollo/pruebas
- **Producción:** Integrar con base de datos (MongoDB, PostgreSQL) - fuera del alcance actual

### Seguridad
- Secret key configurable via variable de entorno `JWT_SECRET`
- Estrategia Passport JWT
- Guard global para endpoints protegidos

---

## 4. Módulo de Análisis Nutricional

### Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Health check para load balancers |
| POST | `/nutrition/analyze` | JWT | Analiza imagen y devuelve nutrients |

### Request

```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
  "mimeType": "image/jpeg"
}
```

- **imageBase64** (string, required): Imagen codificada en Base64. Acepta prefijos `data:image/*;base64,` o solo la data cruda.
  - **Límite máximo:** 5MB (5,242,880 bytes) - validar antes de enviar a Anthropic para evitar costos excesivos.
- **mimeType** (string, optional): Tipo MIME de la imagen. Default: `image/png`. Valores válidos: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.

### Response - Éxito (200)

```json
{
  "isValidFood": true,
  "foodName": "Pizza Margarita",
  "servingSize": "1 porción (150g)",
  "nutrients": {
    "calories": "350 kcal",
    "protein": "15g",
    "fat": "12g",
    "carbohydrates": "40g",
    "saturatedFat": "4g",
    "transFat": "0g",
    "fiber": "3g",
    "sugar": "8g",
    "sodium": "250mg"
  },
  "description": "Una porción de pizza Margarita con tomate fresco, mozzarella y albahaca. El queso aporta calcio y proteínas, la masa proporciona carbohidratos complejos."
}
```

> **Nota:** Todos los nutrientes son strings con unidades para consistencia.

### Response - No es alimento (200)

```json
{
  "isValidFood": false,
  "foodName": null,
  "servingSize": null,
  "nutrients": null,
  "description": "La imagen proporcionada no parece contener un alimento. Por favor, envíe una foto de comida, bebida o ingrediente alimenticio."
}
```

### Response - Error (4xx/5xx)

```json
{
  "statusCode": 400,
  "message": "La imagen es requerida",
  "error": "Bad Request"
}
```

---

## 5. Integración con Anthropic

### Prompt del Sistema

```
Eres un asistente de nutrición experto. Analiza la imagen proporcionada e identifica el alimento o alimentos visibles.

Si la imagen CONTIENE un alimento (comida, bebida, postre, ingrediente, etc.):
1. Identifica el nombre del alimento
2. Estima una porción razonable
3. Proporciona el desglose nutricional detallado

Si la imagen NO CONTIENE un alimento (paisaje, persona, objeto, animal, etc.):
1. Devuelve isValidFood: false
2. Explica brevemente por qué no es válido

Formato de respuesta OBLIGATORIO (JSON):
{
  "isValidFood": boolean,
  "foodName": string | null,
  "servingSize": string | null,
  "nutrients": {
    "calories": "350 kcal",
    "protein": "15g",
    "fat": "12g",
    "carbohydrates": "40g",
    "saturatedFat": "4g",
    "transFat": "0g",
    "fiber": "3g",
    "sugar": "8g",
    "sodium": "250mg"
  } | null,
  "description": string
}
```

### Modelo a Usar
- **Modelo:** Claude Sonnet 4.6 (claude-sonnet-4-6-20250101)
- **Capacidad de visión:** Habilitada por defecto

---

## 6. Estructura del Proyecto

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   └── interfaces/
│       └── auth-response.interface.ts
├── nutrition/
│   ├── nutrition.module.ts
│   ├── nutrition.controller.ts
│   ├── nutrition.service.ts
│   ├── dto/
│   │   └── analyze-image.dto.ts
│   └── interfaces/
│       └── nutrition-response.interface.ts
├── anthropic/
│   ├── anthropic.module.ts
│   └── anthropic.service.ts
├── health/
│   ├── health.controller.ts
│   └── health.module.ts
├── common/
│   └── filters/
│       └── http-exception.filter.ts
├── config/
│   └── configuration.ts
├── app.module.ts
└── main.ts
```

---

## 7. Validaciones y Manejo de Errores

### Validaciones de Input
- `imageBase64`: Requerido, debe ser string no vacío
- `mimeType`: Debe ser un tipo de imagen válido

### Errores Posibles

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | La imagen es requerida | imageBase64 vacío o nulo |
| 400 | Tipo de imagen no válido | mimeType no reconocido |
| 400 | Imagen demasiado grande | Supera el límite de 5MB |
| 401 | Unauthorized | JWT inválido o expirado |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Error al analizar la imagen | Error de Anthropic |
| 503 | Servicio de IA no disponible | Anthropic fuera de línea |

### Rate Limiting
- **Límite:** 10 solicitudes por minuto por usuario (configurable via `RATE_LIMIT`)
- **Proveedor:** `nestjs/throttler`

### Timeout y Retry
- **Timeout:** 30 segundos para llamadas a Anthropic
- **Retry:** Reintento automático en errores 5xx (máximo 2 reintentos)

---

## 8. Variables de Entorno

```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=tu-secret-key-aqui
JWT_EXPIRES_IN=24h

# Anthropic
ANTHROPIC_API_KEY=sk-ant-tu-api-key-aqui
ANTHROPIC_MODEL=claude-sonnet-4-6-20250101
ANTHROPIC_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT=10
RATE_LIMIT_TTL=60000
```

---

## 9. Pruebas

### Unitarias
- AuthService: login, register, validateUser
- NutritionService: analyzeImage, parseAnthropicResponse
- AnthropicService: sendImage, parseResponse

### Integración
- POST /auth/login - retorna token
- POST /nutrition/analyze con JWT válido - retorna análisis
- POST /nutrition/analyze sin JWT - retorna 401
- POST /nutrition/analyze con imagen no válida - retorna isValidFood: false

---

## 10. Criterios de Éxito

1. ✅ El endpoint /nutrition/analyze devuelve análisis nutricional válido para imágenes de alimentos
2. ✅ El endpoint devuelve isValidFood: false para imágenes que no son alimentos
3. ✅ Solo usuarios autenticados con JWT pueden acceder al endpoint de análisis
4. ✅ La respuesta sigue exactamente el formato JSON definido
5. ✅ Errores apropiados con códigos HTTP correctos (400, 401, 500, 503)
6. ✅ Código en TypeScript con tipos definidos