# SOLARILABS — Inventory System
> Guía de construcción dividida por agente para máxima eficiencia de tokens.

---

## Stack

| Capa | Tecnología | Plataforma |
|------|-----------|------------|
| Frontend | HTML / CSS / JS vanilla | Vercel (static) |
| Backend | Node.js Serverless Functions | Vercel (`/api`) |
| Base de datos | MongoDB Atlas + Mongoose | Free tier M0 |
| Imágenes | Cloudinary | Free tier |

---

## Estructura de archivos

```
solarilabs-inventory/
├── api/
│   ├── _lib/
│   │   ├── db.js               ← Conexión Mongoose singleton
│   │   ├── Product.js          ← Schema + Model
│   │   └── cloudinary.js       ← Config multer-storage-cloudinary
│   ├── products/
│   │   ├── index.js            ← GET (listar) + POST (crear)
│   │   └── [id].js             ← GET (detalle) + PUT (editar) + DELETE
│   └── stats.js                ← GET métricas del inventario
├── public/
│   ├── index.html              ← Catálogo público tipo tienda
│   ├── product.html            ← Detalle de un lente
│   ├── admin.html              ← Panel CRUD admin
│   ├── css/
│   │   └── style.css           ← Estilos globales
│   └── js/
│       ├── catalog.js          ← Lógica catálogo
│       ├── product.js          ← Lógica detalle
│       └── admin.js            ← Lógica panel admin
├── vercel.json
├── package.json
└── CLAUDE.md                   ← Este archivo
```

---

## Modelo de datos — Product

```js
// api/_lib/Product.js
{
  name:          String,   // requerido
  brand:         String,   // default: "Solarilabs"
  sku:           String,   // único
  price:         Number,   // requerido, en colones
  comparePrice:  Number,   // precio tachado opcional
  category:      enum ["clásicos","deportivos","cat-eye","aviador","redondos"],
  gender:        enum ["unisex","hombre","mujer"],
  frameColor:    String,
  lensColor:     String,
  material:      String,
  uvProtection:  String,   // default: "UV400"
  polarized:     Boolean,  // default: false
  stock:         Number,   // default: 0
  images:        [String], // URLs de Cloudinary
  description:   String,
  featured:      Boolean,  // default: false
  active:        Boolean,  // default: true
  createdAt:     Date      // default: Date.now
}
```

---

## Rutas API

```
GET    /api/products           → listar con ?category=&gender=&polarized=&search=&sort=
POST   /api/products           → crear (multipart/form-data con campo "image")
GET    /api/products/[id]      → detalle
PUT    /api/products/[id]      → editar (puede incluir nueva imagen)
DELETE /api/products/[id]      → eliminar + borrar imagen de Cloudinary
GET    /api/stats              → { total, totalStock, totalValue, lowStock, featured }
```

---

## Variables de entorno (Vercel Dashboard → Settings → Env Vars)

```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/solarilabs
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=abcdefghij
```

---

## vercel.json

```json
{
  "version": 2,
  "buildCommand": "echo 'static site'",
  "outputDirectory": "public",
  "functions": {
    "api/**/*.js": { "memory": 512, "maxDuration": 10 }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ]
}
```

---

## Diseño / UI

```
Paleta:
  --bg:         #080808
  --surface:    #111111
  --border:     #222222
  --gold:       #c9a96e
  --text:       #f0ebe0
  --muted:      #888888
  --danger:     #e05555

Fuentes (Google Fonts):
  - Cormorant Garamond 400/600 → títulos, logo, hero
  - DM Sans 400/500            → UI, body, botones

Estilo general:
  - Dark luxury, espaciado generoso
  - Bordes sutiles 1px --border
  - Hover con transición 200ms en gold
  - Cards con border-radius 8px
```

---

---

# 🤖 DIVISIÓN DE TAREAS POR AGENTE

---

## CLAUDE CODE — Tareas de alta complejidad

> Ejecutar en orden. Cada tarea depende de la anterior.

---

### TAREA CC-01 — Setup del proyecto

**Prompt para Claude Code:**
```
Inicializa el proyecto "solarilabs-inventory" con esta estructura:

solarilabs-inventory/
├── api/_lib/
├── api/products/
├── public/css/
├── public/js/
├── vercel.json
└── package.json

package.json con estas dependencias exactas:
{
  "name": "solarilabs-inventory",
  "version": "1.0.0",
  "engines": { "node": "18.x" },
  "dependencies": {
    "mongoose": "^8.0.0",
    "cloudinary": "^2.0.0",
    "multer": "^1.4.5-lts.1",
    "multer-storage-cloudinary": "^4.0.0",
    "busboy": "^1.6.0"
  }
}

vercel.json:
{
  "version": 2,
  "buildCommand": "echo 'static site'",
  "outputDirectory": "public",
  "functions": { "api/**/*.js": { "memory": 512, "maxDuration": 10 } },
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/$1" }]
}

Solo crea la estructura. No agregues código todavía.
```

---

### TAREA CC-02 — Capa de datos (_lib)

**Prompt para Claude Code:**
```
Crea los 3 archivos en api/_lib/:

1. api/_lib/db.js
   - Conexión Mongoose con patrón singleton (cached global) para evitar
     múltiples conexiones en Vercel serverless cold starts
   - Usa process.env.MONGODB_URI
   - Exporta: export default async function connectDB()

2. api/_lib/Product.js
   - Schema Mongoose con estos campos:
     name (String, required), brand (String, default "Solarilabs"),
     sku (String, unique, sparse), price (Number, required),
     comparePrice (Number), 
     category (enum: clásicos/deportivos/cat-eye/aviador/redondos),
     gender (enum: unisex/hombre/mujer),
     frameColor, lensColor, material (todos String),
     uvProtection (String, default "UV400"),
     polarized (Boolean, default false),
     stock (Number, default 0, min 0),
     images ([String]), description (String),
     featured (Boolean, default false),
     active (Boolean, default true),
     createdAt (Date, default Date.now)
   - Exporta: export default mongoose.models.Product || mongoose.model('Product', schema)

3. api/_lib/cloudinary.js
   - Configura cloudinary v2 con las env vars CLOUDINARY_CLOUD_NAME,
     CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
   - Crea storage de multer-storage-cloudinary con:
     folder: "solarilabs"
     allowed_formats: ["jpg","jpeg","png","webp"]
     transformation: [{ width: 1200, height: 900, crop: "limit", quality: "auto" }]
   - Exporta: export { cloudinary, upload }
     donde upload = multer({ storage })
```

---

### TAREA CC-03 — API products/index.js (GET + POST)

**Prompt para Claude Code:**
```
Crea api/products/index.js con dos handlers en una sola función:

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  await connectDB()

  if (req.method === 'GET') {
    // Query params: category, gender, polarized (boolean), search (text), sort
    // sort values: price_asc | price_desc | newest | featured
    // Solo retorna productos donde active: true
    // search hace búsqueda en name y description con RegExp case-insensitive
    // Retorna array de productos
  }

  if (req.method === 'POST') {
    // Usa upload.single('image') de cloudinary.js
    // Parsea el form con multer como middleware manual (run en promise)
    // Si hay archivo subido, agrega la URL a images[]
    // Crea el producto y retorna 201 con el producto creado
  }
}

Maneja errores con try/catch y retorna { error: mensaje } con status apropiado.
Incluye helper function runMiddleware(req, res, fn) para usar multer como promise.
```

---

### TAREA CC-04 — API products/[id].js (GET + PUT + DELETE)

**Prompt para Claude Code:**
```
Crea api/products/[id].js con handlers para GET, PUT y DELETE:

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  // CORS headers igual que products/index.js
  await connectDB()
  const { id } = req.query

  GET:  retorna el producto por _id, 404 si no existe

  PUT:  
    - Usa multer para parsear multipart (igual que POST)
    - Si viene nueva imagen en req.file:
      * Sube a Cloudinary
      * Si el producto tenía imagen anterior, eliminarla de Cloudinary
        (extraer public_id de la URL: la parte entre /solarilabs/ y el .ext)
      * Actualiza images[0] con la nueva URL
    - Actualiza los campos recibidos con findByIdAndUpdate
    - Retorna el producto actualizado

  DELETE:
    - Si el producto tiene imágenes, eliminarlas de Cloudinary
      (usa cloudinary.uploader.destroy(public_id))
    - Elimina el producto de MongoDB
    - Retorna { success: true }
}
```

---

### TAREA CC-05 — API stats.js

**Prompt para Claude Code:**
```
Crea api/stats.js:

export default async function handler(req, res) {
  // CORS + solo acepta GET
  await connectDB()

  Ejecuta estas aggregations en paralelo con Promise.all:
  1. Total de productos activos
  2. Suma total de stock (sum de field stock donde active:true)
  3. Valor total del inventario (sum de price * stock donde active:true)
  4. Productos con stock bajo: stock > 0 AND stock < 5
  5. Productos destacados (featured: true, active: true)

  Retorna:
  {
    total: Number,
    totalStock: Number,
    totalValue: Number,
    lowStock: Number,
    featured: Number
  }
}
```

---

## CODEX — Tareas de UI y componentes repetitivos

> Ejecutar después de que Claude Code termine CC-01 al CC-05.
> Codex trabaja mejor con instrucciones específicas y acotadas.

---

### TAREA CX-01 — CSS global (style.css)

**Prompt para Codex:**
```
Crea public/css/style.css para el sistema Solarilabs.

Variables CSS:
--bg: #080808
--surface: #111111  
--surface2: #181818
--border: #1e1e1e
--gold: #c9a96e
--gold-light: #e8c98e
--text: #f0ebe0
--muted: #777777
--danger: #e05555
--success: #4caf7d
--radius: 8px
--radius-lg: 14px
--transition: 200ms ease

Google Fonts import: Cormorant Garamond (400,600) + DM Sans (400,500)

Incluye estilos para:

1. Reset y base: box-sizing, margin 0, font DM Sans, color --text, bg --bg
2. .container: max-width 1200px, margin auto, padding 0 24px
3. Header sticky: bg --bg con border-bottom --border, logo en Cormorant Garamond
   letra-spacing 4px uppercase, nav links hover gold
4. Botones:
   .btn-primary: bg --gold, color #080808, font-weight 500, padding 10px 24px, radius
   .btn-secondary: border 1px --border, color --text, bg transparent
   .btn-danger: bg transparent, color --danger, border 1px --danger
   Todos con hover transition y cursor pointer
5. Cards de producto: bg --surface, border --border, radius --radius-lg
   .product-card: hover border-color --gold, transition
   .product-card img: aspect-ratio 4/3, object-fit cover, width 100%
   .badge: pequeños pills para "Polarizado", "UV400", "Agotado"
6. Modal: overlay bg rgba(0,0,0,0.85), modal bg --surface, max-width 560px,
   centered con position fixed, z-index 1000
7. Tabla admin: th bg --surface2, td border-bottom --border, hover row --surface2
8. Formulario: inputs y selects con bg --surface2, border --border, color --text,
   padding 10px 14px, radius, focus border-color --gold outline none
9. Toast notifications: fixed bottom-right, slide-in animation, colores por tipo
10. Grid catálogo: CSS Grid, auto-fill, minmax(260px, 1fr), gap 24px
11. Stats cards: grid 4 columnas, bg --surface, número grande en --gold, Cormorant
12. Drag & drop upload zone: border 2px dashed --border, hover --gold, dashed
    transition color, texto centrado, preview de imagen con object-fit cover
13. Responsive: breakpoint 768px para grids de 2 col, 480px para 1 col
```

---

### TAREA CX-02 — public/index.html (Catálogo)

**Prompt para Codex:**
```
Crea public/index.html para el catálogo de Solarilabs.

Link a: /css/style.css y Google Fonts (Cormorant Garamond + DM Sans)
Script al final: /js/catalog.js

Estructura HTML:

1. Header sticky:
   - Logo "SOLARILABS" en span.logo (Cormorant Garamond, letter-spacing)
   - Nav: "Catálogo" | "Admin" (link a /admin.html)

2. Section hero:
   - Fondo oscuro #080808
   - Título grande en Cormorant Garamond: "Protege tu mirada."
   - Subtítulo: "Lentes de sol polarizados · UV400 · Diseño costarricense"
   - Sin botones, minimalista

3. Section filtros (#filters):
   - Input búsqueda con ícono lupa (Unicode 🔍 o SVG simple)
   - Pills de categoría: Todos | Clásicos | Deportivos | Cat-eye | Aviador | Redondos
     (data-category attribute en cada pill)
   - Pills de género: Todos | Hombre | Mujer | Unisex  
   - Toggle: Solo polarizados (checkbox estilizado)
   - Select ordenar: Más recientes | Menor precio | Mayor precio

4. Section catálogo:
   - p.results-count (ej: "12 lentes encontrados")
   - div#products-grid.products-grid (el JS inyecta las cards aquí)
   - div#empty-state oculto: ícono + "No encontramos lentes con esos filtros"
   - div#loading oculto: spinner o texto "Cargando..."

5. Footer simple:
   - "© 2025 Solarilabs · Todos los derechos reservados"

Cada card de producto la genera JS, pero prepara el template HTML comentado:
<!--
<div class="product-card" onclick="...">
  <img src="" alt="">
  <div class="card-body">
    <span class="category-label"></span>
    <h3 class="product-name"></h3>
    <div class="badges">
      <span class="badge badge-gold">Polarizado</span>
      <span class="badge">UV400</span>
    </div>
    <div class="price-row">
      <span class="price">₡45.000</span>
      <span class="compare-price">₡60.000</span>
    </div>
    <span class="stock-indicator">12 disponibles</span>
  </div>
</div>
-->
```

---

### TAREA CX-03 — public/product.html (Detalle)

**Prompt para Codex:**
```
Crea public/product.html para el detalle de un lente.

Link a /css/style.css. Script al final: /js/product.js

Estructura:
1. Header igual que index.html
2. Breadcrumb: "Inicio / {categoría} / {nombre}" (JS llena los valores)
3. Botón "← Volver al catálogo" (history.back())
4. Layout de dos columnas (CSS Grid, 55% / 45%, gap 48px):

   Columna izquierda — galería:
   - #main-image: imagen grande con aspect-ratio 4/3, border-radius --radius-lg
   - #thumbnails: fila de hasta 3 thumbnails 80x60, click cambia main-image,
     thumbnail activo con border --gold

   Columna derecha — datos:
   - span#product-category (pill de categoría)  
   - h1#product-name (Cormorant Garamond, 2.5rem)
   - div.price-row: span#product-price grande + span#product-compare tachado
   - div#stock-badge: badge dinámico (verde/amarillo/rojo según stock)
   - hr
   - table.specs-table con filas para: Marca, SKU, Color de marco, Color de lente,
     Material, Protección UV, Polarizado (Sí/No)
     Todas las celdas tienen id para que JS llene: #spec-brand, #spec-sku, etc.
   - p#product-description (texto de descripción)
   - div.product-actions:
     * Botón "✎ Editar en Admin" → admin.html?edit={id}

5. div#loading-state centrado (mientras carga)
6. div#error-state oculto (si no encuentra el producto)

Responsive: en mobile las dos columnas se apilan.
```

---

### TAREA CX-04 — public/admin.html (Panel Admin)

**Prompt para Codex:**
```
Crea public/admin.html para el panel de administración de Solarilabs.

Link a /css/style.css. Script al final: /js/admin.js

Estructura:

1. Header: Logo "SOLARILABS" + "Panel de Inventario" + link "Ver tienda →" a index.html

2. Section métricas (#stats-grid, 4 columnas):
   <div class="stat-card">
     <span class="stat-label">Total de lentes</span>
     <span class="stat-value" id="stat-total">—</span>
   </div>
   Igual para: stat-stock (Unidades en stock), stat-value (Valor ₡), stat-low (Stock bajo)

3. Section tabla:
   - Fila superior: input#search-table (buscar en tabla) + button#btn-add "＋ Agregar lente"
   - table#products-table:
     thead: [foto] [Nombre] [SKU] [Categoría] [Precio] [Stock] [Estado] [Acciones]
     tbody#table-body (JS llena las filas)
   - Fila de esqueleto comentada:
     <!--
     <tr>
       <td><img class="thumb" src="" alt=""></td>
       <td class="product-name"></td>
       <td class="sku muted"></td>
       <td><span class="category-pill"></span></td>
       <td class="price"></td>
       <td class="stock"></td>
       <td><span class="status-badge"></span></td>
       <td class="actions">
         <button class="btn-edit" data-id="">Editar</button>
         <button class="btn-delete" data-id="">Eliminar</button>
       </td>
     </tr>
     -->

4. Modal crear/editar (#modal-product), oculto por defecto:
   - Overlay div#modal-overlay
   - div.modal-container con:
     h2#modal-title ("Agregar lente" o "Editar lente")
     form#product-form con estos campos agrupados:

     Grupo 1 — Información básica:
       input name="name" placeholder="Nombre del lente"
       input name="sku" placeholder="SKU (ej: SL-001)"
       select name="category": [clásicos, deportivos, cat-eye, aviador, redondos]
       select name="gender": [unisex, hombre, mujer]

     Grupo 2 — Precios y stock:
       input[type=number] name="price" placeholder="Precio en ₡"
       input[type=number] name="comparePrice" placeholder="Precio comparación (opcional)"
       input[type=number] name="stock" placeholder="Stock" min="0"

     Grupo 3 — Atributos:
       input name="frameColor" placeholder="Color del marco"
       input name="lensColor" placeholder="Color del lente"
       input name="material" placeholder="Material (ej: Acetato)"
       input name="uvProtection" placeholder="Protección UV" value="UV400"

     Grupo 4 — Opciones (toggles lado a lado):
       label + checkbox name="polarized" → "Polarizado"
       label + checkbox name="active" checked → "Activo"
       label + checkbox name="featured" → "Destacado"

     Grupo 5 — Imagen:
       div#drop-zone.drop-zone:
         input[type=file] name="image" accept="image/*" hidden id="file-input"
         div.drop-text "Arrastrá una foto o hacé click para seleccionar"
         img#image-preview oculto (preview antes de guardar)

     Grupo 6 — Descripción:
       textarea name="description" rows="3" placeholder="Descripción del lente..."

     Botones: button#btn-cancel "Cancelar" + button#btn-save type="submit" "Guardar lente"

5. Modal confirmar eliminación (#modal-delete), oculto:
   - "¿Eliminar este lente?" + nombre del producto en negrita
   - Botones: "Cancelar" + "Sí, eliminar" (btn-danger)

6. div#toast-container fixed bottom-right (JS inyecta toasts aquí)
```

---

### TAREA CX-05 — public/js/catalog.js

**Prompt para Codex:**
```
Crea public/js/catalog.js

const API = '' // sin base URL, usa rutas relativas /api/...

Estado:
let products = []
let filters = { category: '', gender: '', polarized: false, search: '', sort: 'newest' }

Funciones:

1. fetchProducts()
   - Construye query string desde filters
   - Fetch a /api/products con los params
   - Guarda en products
   - Llama renderProducts()

2. renderProducts()
   - Filtra/ordena localmente si es necesario
   - Para cada producto genera HTML de card:
     * Imagen (images[0] o placeholder SVG data:URI si no tiene)
     * Nombre, categoría, precio formateado en colones (₡45.000)
     * comparePrice tachado si existe
     * Badges: "Polarizado" si polarized, "UV400" siempre
     * Stock: si stock===0 badge "Agotado", si stock<5 badge "Poco stock"
   - Click en card → window.location = '/product.html?id=' + product._id
   - Actualiza results-count
   - Muestra empty-state si array vacío

3. setupFilters()
   - Pills de categoría: click activa la pill, actualiza filters.category, re-fetch
   - Pills de género: igual
   - Toggle polarized: actualiza filters.polarized
   - Input búsqueda: debounce 300ms, actualiza filters.search, re-fetch
   - Select sort: actualiza filters.sort, re-fetch

4. formatPrice(number) → "₡45.000" (punto como separador de miles)

DOMContentLoaded: setupFilters() + fetchProducts()
```

---

### TAREA CX-06 — public/js/product.js

**Prompt para Codex:**
```
Crea public/js/product.js

Funciones:

1. Al cargar:
   - Lee ?id= de la URL
   - Si no hay id → redirect a index.html
   - Muestra loading-state
   - Fetch a /api/products/{id}

2. renderProduct(data)
   - Llena todos los #ids del HTML con los datos
   - Galería: si images.length > 1, muestra thumbnails y activa click para cambiar main-image
   - Stock badge: 
     stock === 0 → "Agotado" (rojo)
     stock < 5  → "Últimas ${stock} unidades" (amarillo)
     stock >= 5 → "${stock} disponibles" (verde)
   - Polarizado: "Sí ✓" o "No" en la tabla
   - comparePrice: mostrar si existe, ocultar si no
   - Botón editar: href = '/admin.html?edit=' + data._id
   - Breadcrumb: capitaliza la categoría

3. Si error 404 → muestra error-state con botón volver
```

---

### TAREA CX-07 — public/js/admin.js

**Prompt para Codex:**
```
Crea public/js/admin.js

Estado:
let products = []
let editingId = null

Funciones:

1. loadStats()
   - Fetch /api/stats
   - Llena #stat-total, #stat-stock, #stat-value (formatPrice), #stat-low
   - Si stat-low > 0 → colorea en --danger

2. loadProducts()
   - Fetch /api/products (sin filtros, todos)
   - Guarda en products
   - Llama renderTable(products)

3. renderTable(list)
   - Para cada producto genera <tr> con todos los campos
   - Precio formateado en colones
   - Stock: si <5 texto en amarillo, si 0 en rojo
   - Estado: badge "Activo" verde / "Inactivo" gris
   - Botón Editar: openEditModal(product)
   - Botón Eliminar: openDeleteModal(product._id, product.name)
   - Thumbnail: img 40x40, fallback a placeholder si no hay imagen

4. Búsqueda en tabla (#search-table)
   - Input event → filtra localmente en products por name/sku
   - Llama renderTable con el array filtrado

5. openCreateModal()
   - Resetea form, editingId = null
   - Cambia #modal-title a "Agregar lente"
   - Muestra modal

6. openEditModal(product)
   - Llena el form con los datos del producto (todos los campos)
   - editingId = product._id
   - Cambia #modal-title a "Editar lente"
   - Muestra modal

7. openDeleteModal(id, name)
   - Muestra modal de confirmación con el nombre
   - Guarda id para confirmar

8. handleFormSubmit(e)
   - e.preventDefault()
   - Crea FormData del form (incluye el file si hay nuevo)
   - Si editingId: PUT /api/products/{editingId}
   - Si no: POST /api/products
   - Ambos con fetch y FormData (no JSON, para que vaya el archivo)
   - Éxito: cierra modal, loadProducts(), loadStats(), showToast('success', msg)
   - Error: showToast('error', msg)

9. handleDelete(id)
   - DELETE /api/products/{id}
   - Éxito: cierra modal, loadProducts(), loadStats(), showToast
   - Error: showToast('error', msg)

10. Drag & drop en #drop-zone:
    - dragover: añade clase 'drag-over'
    - dragleave: quita clase
    - drop: pone el archivo en #file-input, muestra preview
    - click en zone → trigger click en file-input
    - change en file-input → muestra preview con FileReader

11. showToast(type, message)
    - type: 'success' | 'error'
    - Crea div.toast en #toast-container
    - Auto-remove en 3 segundos con fade-out animation

12. formatPrice(n) → "₡45.000"

Si URL tiene ?edit={id}: al cargar, espera a tener los productos y abre el modal de edición

DOMContentLoaded:
  loadStats()
  loadProducts()
  #btn-add → openCreateModal()
  #product-form → handleFormSubmit
  #btn-cancel → cerrar modal
  #modal-overlay → cerrar modal click fuera
  #btn-confirm-delete → handleDelete con el id guardado
```

---

## Orden de ejecución recomendado

```
1. Claude Code:  CC-01  (setup + estructura)
2. Claude Code:  CC-02  (capa de datos _lib)
3. Claude Code:  CC-03  (API GET+POST products)
4. Claude Code:  CC-04  (API GET+PUT+DELETE products/[id])
5. Claude Code:  CC-05  (API stats)
6. Codex:        CX-01  (CSS global)
7. Codex:        CX-02  (index.html catálogo)
8. Codex:        CX-03  (product.html detalle)
9. Codex:        CX-04  (admin.html panel)
10. Codex:       CX-05  (catalog.js)
11. Codex:       CX-06  (product.js)
12. Codex:       CX-07  (admin.js)
```

---

## Deploy — pasos finales (después de todas las tareas)

```bash
# 1. Push a GitHub
git init
git add .
git commit -m "feat: solarilabs inventory system"
git remote add origin https://github.com/tu-usuario/solarilabs-inventory
git push -u origin main

# 2. Vercel
# → vercel.com → Add New Project → importar repo
# → Framework Preset: Other
# → Root Directory: ./  (no cambiar)
# → Environment Variables: agregar las 4 variables

# 3. Listo. URL tipo: https://solarilabs-inventory.vercel.app
```

---

## Checklist de QA antes de entregar

- [ ] GET /api/products devuelve array vacío (no error) si no hay productos
- [ ] POST /api/products crea producto con y sin imagen
- [ ] Imagen se sube a Cloudinary y la URL queda en images[]
- [ ] DELETE borra imagen de Cloudinary + documento de MongoDB
- [ ] Filtros de catálogo funcionan combinados
- [ ] Modal admin resetea campos al abrir "Agregar" después de editar
- [ ] Toast aparece y desaparece en 3s
- [ ] Responsive en mobile (catálogo y admin)
- [ ] Sin errores en Vercel Function Logs

## Agentes a Instalar
Instala los siguientes agentes
npx claude-code-templates@latest --agent development-team/frontend-developer
npx claude-code-templates@latest --agent development-tools/code-reviewer
npx claude-code-templates@latest --agent development-team/ui-ux-designer
npx claude-code-templates@latest --agent development-team/backend-architect
npx claude-code-templates@latest --agent development-tools/debugger

## Instala estas skills
npx claude-code-templates@latest --skill creative-design/ui-ux-pro-max
npx claude-code-templates@latest --skill development/senior-architect