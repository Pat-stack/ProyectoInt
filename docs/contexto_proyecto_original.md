# Norte-oStore — Contexto del proyecto original

## ¿Qué es?
Aplicación web de e-commerce de productos para mascotas llamada "El Norteño Store".
Construida originalmente con ASP.NET Core 8 (C#) + Dapper + SQL Server en el backend,
y HTML/CSS/JS vanilla en el frontend (wwwroot).

## Stack original
- Backend: ASP.NET Core 8 Web API, Dapper ORM, SQL Server
- Frontend: HTML + CSS + JavaScript vanilla (sin framework)
- Autenticación: simple (email + contraseña en texto plano, sin JWT)
- Imágenes: subidas al servidor como archivos físicos en /Imagenes/Productos/

## Base de datos (SQL Server)
5 tablas:
- roles          (ID_Rol, Nombre_Rol)
- categorias     (ID_Categorias, Nombre_Categoria)
- usuarios       (ID_Usuarios, Nombre, Email, Contraseña, ID_Rol)
- articulos      (ID_Articulo, Nombre_Articulo, Descripcion, Precio, Stock, ID_Categoria, ImagenUrl)
- carrito        (ID_Carrito_Item, ID_Usuario, ID_Articulo, Cantidad, Fecha_Agregado)
+ 2 tablas de compras usadas en CompraRepository pero no definidas en el SQL adjunto:
  - compras       (ID_Compra, ID_Usuario, Total, Fecha)
  - detalle_compra (ID_Compra, ID_Articulo, Cantidad, Precio_Unitario, Subtotal)

## Relaciones
- usuarios → roles (FK: ID_Rol)
- articulos → categorias (FK: ID_Categoria)
- carrito → usuarios (FK: ID_Usuario)
- carrito → articulos (FK: ID_Articulo)
- compras → usuarios
- detalle_compra → compras, articulos

## Roles de usuario
- ID_Rol = 1 → Admin
- ID_Rol = 2 → Cliente (default al registrarse)

## Endpoints de la API original
### Productos (api/Productos)
- GET  /mostrarproductos          → lista todos los artículos (con JOIN a categorias)
- POST /crearnuevoproducto        → crea artículo (multipart/form-data, incluye imagen)
- PUT  /editarproducto/{id}       → edita artículo (multipart/form-data)
- DELETE /borrarproducto/{id}     → elimina artículo (también borra la imagen del disco)
- GET  /mostrarporcategoria/{nombre} → filtra artículos por nombre de categoría
- POST /verificarstock            → verifica que haya stock para una lista de items
- POST /procesarcompra            → descuenta stock para una lista de items

### Usuario (api/Usuario)
- POST /register → registra usuario (JSON: Nombre, Email, Password)
- POST /login    → autentica (JSON: Email, Password) → devuelve { mensaje, nombre, email, ID_Rol }

### Compra (api/Compra)
- POST /registrar → registra compra + detalles, aplica IVA 16%
- GET  /todas     → historial de todas las compras (para el admin)

## Páginas del frontend
| Archivo                    | Función                                           |
|----------------------------|---------------------------------------------------|
| index.html                 | Landing / hero                                    |
| categorias.html            | Grid de categorías con imágenes                   |
| Catalogo.html              | Productos filtrados por categoría + buscador      |
| productos.html             | 3 productos aleatorios destacados + info           |
| Inicio de secion.html      | Login                                             |
| registro.html              | Registro de nuevo usuario                         |
| admin.html                 | Panel admin: CRUD productos + historial compras   |
| carrito (prueba).html      | Prototipo estático del carrito (no funcional)     |

## JS compartido
- Js/Carrito.js  → modal del carrito flotante, lógica de cantidad, procesarCompra()
- Js/Sesion.js   → (viejo, credenciales hardcodeadas, reemplazado por el inline de login)

## Lógica de sesión (localStorage)
La sesión del usuario se guarda en localStorage['usuario']:
  { nombre, email, rol }  (rol = "Admin" | "Cliente")
El carrito también va en localStorage['carrito']:
  [{ id, nombre, precio, imagen, cantidad }]

## Categorías hardcodeadas en admin.html
  { id: 4, nombre: "Perro" }
  { id: 5, nombre: "Gato" }
  { id: 6, nombre: "Ave" }
  { id: 7, nombre: "Conejo" }
  { id: 8, nombre: "Hamsters" }

## IVA
16% aplicado sobre el subtotal al momento de procesar la compra.

## Notas importantes
- Las contraseñas se guardan en texto plano (sin hash). Es un proyecto académico.
- El API corre en https://localhost:7047 (hardcodeado en el JS).
- No hay JWT ni sistema de tokens. Solo localStorage para la sesión.
- El carrito del frontend NO se sincroniza con la tabla `carrito` de la BD;
  es solo localStorage. La BD de carrito no se usa desde el frontend actual.
- La tabla compras y detalle_compra aparecen referenciadas en CompraRepository.cs
  pero NO están en el script SQL adjunto (falta en el backup).
