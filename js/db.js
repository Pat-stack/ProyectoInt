// ============================================================
//  db.js  —  Capa de datos: localStorage como JSON arrays
//  Tablas: roles, categorias, usuarios, articulos, compras
// ============================================================

const DB = {

  // ── Helpers genéricos ─────────────────────────────────────

  _get(tabla) {
    return JSON.parse(localStorage.getItem(tabla)) || [];
  },

  _set(tabla, data) {
    localStorage.setItem(tabla, JSON.stringify(data));
  },

  _nextId(tabla) {
    const rows = this._get(tabla);
    if (rows.length === 0) return 1;
    return Math.max(...rows.map(r => r.id)) + 1;
  },

  // ── ROLES ─────────────────────────────────────────────────
  // { id, nombre }

  getRoles() { return this._get('roles'); },

  // ── CATEGORÍAS ────────────────────────────────────────────
  // { id, nombre }

  getCategorias() { return this._get('categorias'); },

  getCategoriaById(id) {
    return this.getCategorias().find(c => c.id === id) || null;
  },

  crearCategoria(nombre, imagen = '') {
    const cats = this.getCategorias();
    if (cats.find(c => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      return { ok: false, error: 'Ya existe una categoría con ese nombre.' };
    }
    const nueva = { id: this._nextId('categorias'), nombre, imagen };
    cats.push(nueva);
    this._set('categorias', cats);
    return { ok: true, data: nueva };
  },

  editarCategoria(id, nombre, imagen) {
    const cats = this.getCategorias();
    const idx  = cats.findIndex(c => c.id === id);
    if (idx === -1) return { ok: false, error: 'Categoría no encontrada.' };
    if (cats.find(c => c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== id)) {
      return { ok: false, error: 'Ya existe una categoría con ese nombre.' };
    }
    cats[idx].nombre = nombre;
    if (imagen !== undefined) cats[idx].imagen = imagen;
    this._set('categorias', cats);
    return { ok: true, data: cats[idx] };
  },

  borrarCategoria(id) {
    const conProductos = this.getArticulos().some(a => a.idCategoria === id);
    if (conProductos) return { ok: false, error: 'No se puede eliminar: hay productos en esta categoría.' };
    const cats   = this.getCategorias();
    const nuevas = cats.filter(c => c.id !== id);
    if (nuevas.length === cats.length) return { ok: false, error: 'Categoría no encontrada.' };
    this._set('categorias', nuevas);
    return { ok: true };
  },

  // ── USUARIOS ──────────────────────────────────────────────
  // { id, nombre, email, password, idRol }

  getUsuarios() { return this._get('usuarios'); },

  getUsuarioByEmail(email) {
    return this.getUsuarios().find(u => u.email === email.toLowerCase()) || null;
  },

  borrarUsuario(id) {
    const usuarios = this.getUsuarios();
    const nuevos = usuarios.filter(u => u.id !== id);
    if (nuevos.length === usuarios.length) return { ok: false, error: 'Usuario no encontrado.' };
    this._set('usuarios', nuevos);
    return { ok: true };
  },

  crearUsuario({ nombre, email, password, idRol = 2, fechaNacimiento = '' }) {
    const usuarios = this.getUsuarios();
    const existente = usuarios.find(u => u.email === email.toLowerCase());
    if (existente) return { ok: false, error: 'El email ya está registrado.' };
    const nuevo = {
      id: this._nextId('usuarios'),
      nombre,
      email: email.toLowerCase(),
      password,
      idRol,
      fechaNacimiento
    };
    usuarios.push(nuevo);
    this._set('usuarios', usuarios);
    return { ok: true, data: nuevo };
  },

  // ── ARTÍCULOS ─────────────────────────────────────────────
  // { id, nombre, descripcion, precio, stock, idCategoria, imagenBase64 }

  getArticulos() { return this._get('articulos'); },

  getArticuloById(id) {
    return this.getArticulos().find(a => a.id === id) || null;
  },

  getArticulosPorCategoria(nombreCategoria) {
    const cat = this.getCategorias().find(
      c => c.nombre.toLowerCase() === nombreCategoria.toLowerCase()
    );
    if (!cat) return [];
    return this.getArticulos().filter(a => a.idCategoria === cat.id);
  },

  crearArticulo({ nombre, descripcion = '', precio, stock, idCategoria, imagenBase64 = '' }) {
    const articulos = this.getArticulos();
    if (articulos.find(a => a.nombre.toLowerCase() === nombre.toLowerCase())) {
      return { ok: false, error: 'Ya existe un producto con ese nombre.' };
    }
    const nuevo = {
      id: this._nextId('articulos'),
      nombre,
      descripcion,
      precio: parseFloat(precio),
      stock: parseInt(stock),
      idCategoria,
      imagenBase64
    };
    articulos.push(nuevo);
    this._set('articulos', articulos);
    return { ok: true, data: nuevo };
  },

  editarArticulo(id, campos) {
    const articulos = this.getArticulos();
    const idx = articulos.findIndex(a => a.id === id);
    if (idx === -1) return { ok: false, error: 'Producto no encontrado.' };
    articulos[idx] = { ...articulos[idx], ...campos };
    if (campos.precio !== undefined) articulos[idx].precio = parseFloat(campos.precio);
    if (campos.stock  !== undefined) articulos[idx].stock  = parseInt(campos.stock);
    this._set('articulos', articulos);
    return { ok: true, data: articulos[idx] };
  },

  borrarArticulo(id) {
    const articulos = this.getArticulos();
    const nuevos = articulos.filter(a => a.id !== id);
    if (nuevos.length === articulos.length) return { ok: false, error: 'Producto no encontrado.' };
    this._set('articulos', nuevos);
    return { ok: true };
  },

  descontarStock(items) {
    // items: [{ idArticulo, cantidad }]
    const articulos = this.getArticulos();
    for (const item of items) {
      const art = articulos.find(a => a.id === item.idArticulo);
      if (!art) return { ok: false, error: `Artículo ${item.idArticulo} no encontrado.` };
      if (art.stock < item.cantidad) return { ok: false, error: `Stock insuficiente para "${art.nombre}". Disponible: ${art.stock}` };
    }
    for (const item of items) {
      const art = articulos.find(a => a.id === item.idArticulo);
      art.stock -= item.cantidad;
    }
    this._set('articulos', articulos);
    return { ok: true };
  },

  // ── COMPRAS ───────────────────────────────────────────────
  // {
  //   id, idUsuario, fecha, subtotal, iva, total,
  //   detalles: [{ idArticulo, nombre, precio, cantidad }]
  // }

  getCompras() { return this._get('compras'); },

  getComprasByUsuario(idUsuario) {
    return this.getCompras().filter(c => c.idUsuario === idUsuario);
  },

  registrarCompra(idUsuario, items) {
    // items: [{ idArticulo, cantidad }]
    const articulos = this.getArticulos();

    let subtotal = 0;
    const detalles = [];

    for (const item of items) {
      const art = articulos.find(a => a.id === item.idArticulo);
      if (!art) return { ok: false, error: `Artículo ${item.idArticulo} no encontrado.` };
      const precioLinea = art.precio * item.cantidad;
      subtotal += precioLinea;
      detalles.push({
        idArticulo: art.id,
        nombre: art.nombre,
        precio: art.precio,
        cantidad: item.cantidad,
        subtotalLinea: precioLinea
      });
    }

    const iva   = subtotal * 0.16;
    const total = subtotal + iva;

    const compra = {
      id: this._nextId('compras'),
      idUsuario,
      fecha: new Date().toISOString(),
      subtotal: parseFloat(subtotal.toFixed(2)),
      iva:      parseFloat(iva.toFixed(2)),
      total:    parseFloat(total.toFixed(2)),
      detalles
    };

    const compras = this.getCompras();
    compras.push(compra);
    this._set('compras', compras);
    return { ok: true, data: compra };
  },

  // ── CARRITO (usuario activo) ───────────────────────────────
  // Guardado en 'carrito' como array de { idArticulo, nombre, precio, imagenBase64, cantidad }

  getCarrito() { return this._get('carrito'); },

  agregarAlCarrito(producto) {
    // producto: { idArticulo, nombre, precio, imagenBase64 }
    let carrito = this.getCarrito();
    const existente = carrito.find(i => i.idArticulo === producto.idArticulo);
    if (existente) {
      existente.cantidad += 1;
    } else {
      carrito.push({ ...producto, cantidad: 1 });
    }
    this._set('carrito', carrito);
  },

  cambiarCantidadCarrito(idArticulo, delta) {
    let carrito = this.getCarrito();
    const item = carrito.find(i => i.idArticulo === idArticulo);
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) carrito = carrito.filter(i => i.idArticulo !== idArticulo);
    this._set('carrito', carrito);
  },

  setCantidadCarrito(idArticulo, cantidad) {
    let carrito = this.getCarrito();
    const item = carrito.find(i => i.idArticulo === idArticulo);
    if (!item) return;
    if (cantidad <= 0) {
      carrito = carrito.filter(i => i.idArticulo !== idArticulo);
    } else {
      item.cantidad = cantidad;
    }
    this._set('carrito', carrito);
  },

  eliminarDelCarrito(idArticulo) {
    const carrito = this.getCarrito().filter(i => i.idArticulo !== idArticulo);
    this._set('carrito', carrito);
  },

  limpiarCarrito() {
    this._set('carrito', []);
  },

  // ── INICIALIZACIÓN ────────────────────────────────────────

  _seedData() {
    this._set('roles', [
      { id: 1, nombre: 'Admin' },
      { id: 2, nombre: 'Cliente' }
    ]);

    this._set('categorias', [
      { id: 1, nombre: 'Perro',   imagen: 'imagenes_pagina/categoria_Perro.jpg' },
      { id: 2, nombre: 'Gato',    imagen: 'imagenes_pagina/categoria_Gato.jpg' },
      { id: 3, nombre: 'Ave',     imagen: 'imagenes_pagina/categoria_Ave.jpg' },
      { id: 4, nombre: 'Hamster', imagen: 'imagenes_pagina/categoria_Hamster.jpg' }
    ]);

    this._set('usuarios', [
      { id: 1, nombre: 'Administrador', email: 'admin@nortenito.com', password: 'admin123', idRol: 1 }
    ]);

    this._set('articulos', [
      // Gatos
      { id: 1,  nombre: 'Alimento para gato Urinary Care', descripcion: 'Alimento especial para gatos con problemas urinarios.',       precio: 280.00, stock: 25, idCategoria: 2, imagenBase64: 'img_productos_base/Alimento para gato Urinary Care.webp' },
      { id: 2,  nombre: 'Arena para gatos',                descripcion: 'Arena absorbente para caja de arena de gatos.',               precio: 150.00, stock: 40, idCategoria: 2, imagenBase64: 'img_productos_base/Arena para gatos.webp' },
      { id: 3,  nombre: 'Arena para gatos fina',           descripcion: 'Arena fina de textura suave para mayor comodidad.',           precio: 120.00, stock: 35, idCategoria: 2, imagenBase64: 'img_productos_base/Arena para gatos fina.webp' },
      { id: 4,  nombre: 'Comida para gato bebé',           descripcion: 'Alimento húmedo especial para gatitos en crecimiento.',       precio: 220.00, stock: 20, idCategoria: 2, imagenBase64: 'img_productos_base/Comida para gato bebé.jpg' },
      { id: 5,  nombre: 'Correa para gato',                descripcion: 'Correa ajustable para paseos seguros con tu gato.',           precio:  95.00, stock: 30, idCategoria: 2, imagenBase64: 'img_productos_base/Correa para gato.webp' },
      { id: 6,  nombre: 'Juguetes para gato',              descripcion: 'Set de juguetes interactivos para entretener a tu gato.',     precio:  75.00, stock: 50, idCategoria: 2, imagenBase64: 'img_productos_base/Juguetes para gato.webp' },
      { id: 7,  nombre: 'Pechera para gato',               descripcion: 'Pechera cómoda y ajustable para gatos de todas las tallas.', precio: 110.00, stock: 25, idCategoria: 2, imagenBase64: 'img_productos_base/Pechera para gato.webp' },
      // Hamsters
      { id: 8,  nombre: 'Comida para hamsters',            descripcion: 'Mezcla nutritiva de semillas y granos para hámsters.',       precio:  85.00, stock: 40, idCategoria: 4, imagenBase64: 'img_productos_base/Comida para hamsters.jpg' },
      { id: 9,  nombre: 'Jaula para hamster',              descripcion: 'Jaula amplia con accesorios incluidos para hámster.',        precio: 380.00, stock: 15, idCategoria: 4, imagenBase64: 'img_productos_base/Jaula para hamster.png' },
      { id: 10, nombre: 'Juguetes para hamsters',          descripcion: 'Set de juguetes y rueda de ejercicio para hámsters.',        precio:  65.00, stock: 35, idCategoria: 4, imagenBase64: 'img_productos_base/Juguetes para hamsters.jpg' },
      { id: 11, nombre: 'Tubos para hamster',              descripcion: 'Tubos de exploración y diversión para hámsters.',            precio:  90.00, stock: 25, idCategoria: 4, imagenBase64: 'img_productos_base/Tubos para hamster.webp' },
      // Perros
      { id: 12, nombre: 'Correa para perro',               descripcion: 'Correa resistente de nylon para perros de cualquier tamaño.', precio: 120.00, stock: 40, idCategoria: 1, imagenBase64: 'img_productos_base/Correa para perro.jpg' },
      { id: 13, nombre: 'Croquetas para perro',            descripcion: 'Alimento balanceado y nutritivo para perros adultos.',       precio: 290.00, stock: 30, idCategoria: 1, imagenBase64: 'img_productos_base/Croquetas para perro.webp' },
      { id: 14, nombre: 'Juguetes para perro',             descripcion: 'Set de juguetes resistentes para la diversión de tu perro.', precio:  95.00, stock: 45, idCategoria: 1, imagenBase64: 'img_productos_base/Juguetes para perro.jpg' },
      // Aves
      { id: 15, nombre: 'Jaula para aves',                 descripcion: 'Jaula metálica espaciosa con comedero y bebedero.',         precio: 480.00, stock: 10, idCategoria: 3, imagenBase64: 'img_productos_base/Jaula para aves.jpg' },
      { id: 16, nombre: 'Semillas para aves',              descripcion: 'Mezcla de semillas nutritivas para aves pequeñas.',         precio:  65.00, stock: 50, idCategoria: 3, imagenBase64: 'img_productos_base/Semillas para aves.jpg' }
    ]);

    this._set('compras', []);
    this._set('carrito', []);
  },

  init() {
    if (localStorage.getItem('_db_init')) return;
    this._seedData();
    localStorage.setItem('_db_init', '1');
  },

  purgarDB() {
    ['roles', 'categorias', 'usuarios', 'articulos', 'compras', 'carrito', 'sesion', '_db_init'].forEach(k => {
      localStorage.removeItem(k);
    });
    this._seedData();
    localStorage.setItem('_db_init', '1');
  }
};
