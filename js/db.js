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

  // ── USUARIOS ──────────────────────────────────────────────
  // { id, nombre, email, password, idRol }

  getUsuarios() { return this._get('usuarios'); },

  getUsuarioByEmail(email) {
    const todos = this.getUsuarios();
    console.log('[getUsuarioByEmail] buscando:', JSON.stringify(email));
    console.log('[getUsuarioByEmail] usuarios en storage:', JSON.stringify(todos));
    return todos.find(u => u.email === email.toLowerCase()) || null;
  },

  borrarUsuario(id) {
    const usuarios = this.getUsuarios();
    const nuevos = usuarios.filter(u => u.id !== id);
    if (nuevos.length === usuarios.length) return { ok: false, error: 'Usuario no encontrado.' };
    this._set('usuarios', nuevos);
    return { ok: true };
  },

  crearUsuario({ nombre, email, password, idRol = 2 }) {
    const usuarios = this.getUsuarios();
    const existente = usuarios.find(u => u.email === email.toLowerCase());
    if (existente) {
      console.log(existente.email);
      return { ok: false, error: 'El email ya está registrado.' };
    }
    const nuevo = {
      id: this._nextId('usuarios'),
      nombre,
      email: email.toLowerCase(),
      password,
      idRol
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

  init() {
    if (localStorage.getItem('_db_init')) {
      console.log('[DB.init] ya inicializado, saltando.');
      return;
    }
    console.log('[DB.init] primera vez — inicializando storage.');

    // Roles
    this._set('roles', [
      { id: 1, nombre: 'Admin' },
      { id: 2, nombre: 'Cliente' }
    ]);

    // Categorías
    this._set('categorias', [
      { id: 1, nombre: 'Perro' },
      { id: 2, nombre: 'Gato' },
      { id: 3, nombre: 'Ave' },
      { id: 4, nombre: 'Conejo' },
      { id: 5, nombre: 'Hamster' }
    ]);

    // Usuario admin por defecto
    this._set('usuarios', [
      {
        id: 1,
        nombre: 'Administrador',
        email: 'admin@nortenito.com',
        password: 'admin123',
        idRol: 1
      }
    ]);

    // Productos de ejemplo (sin imagen, imagenBase64 vacío)
    this._set('articulos', [
      { id: 1, nombre: 'Croquetas Premium Perro', descripcion: 'Alimento balanceado para perros adultos.', precio: 250.00, stock: 30, idCategoria: 1, imagenBase64: '' },
      { id: 2, nombre: 'Collar Ajustable', descripcion: 'Collar de nylon resistente.', precio: 85.00, stock: 50, idCategoria: 1, imagenBase64: '' },
      { id: 3, nombre: 'Croquetas Gato Adulto', descripcion: 'Fórmula especial para gatos adultos.', precio: 180.00, stock: 25, idCategoria: 2, imagenBase64: '' },
      { id: 4, nombre: 'Arenero Cubierto', descripcion: 'Caja de arena con tapa y filtro de carbón.', precio: 320.00, stock: 15, idCategoria: 2, imagenBase64: '' },
      { id: 5, nombre: 'Alpiste Premium', descripcion: 'Mezcla de semillas para aves pequeñas.', precio: 60.00, stock: 40, idCategoria: 3, imagenBase64: '' },
      { id: 6, nombre: 'Jaula Mediana', descripcion: 'Jaula metálica con comedero y bebedero.', precio: 450.00, stock: 10, idCategoria: 3, imagenBase64: '' },
      { id: 7, nombre: 'Pellets para Conejo', descripcion: 'Alimento completo rico en fibra.', precio: 95.00, stock: 20, idCategoria: 4, imagenBase64: '' },
      { id: 8, nombre: 'Mix Semillas Hámster', descripcion: 'Mezcla nutritiva con girasol y avena.', precio: 55.00, stock: 35, idCategoria: 5, imagenBase64: '' }
    ]);

    this._set('compras', []);
    this._set('carrito', []);

    localStorage.setItem('_db_init', '1');
  }
};
