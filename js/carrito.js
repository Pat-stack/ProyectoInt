// ============================================================
//  carrito.js  —  UI del carrito flotante (depende de db.js, auth.js)
//  Incluir DESPUÉS de db.js y auth.js en cada página que lo use.
//  El HTML de cada página debe tener el bloque #carrito-modal.
// ============================================================

const Carrito = {

  // ── Contador del botón flotante ───────────────────────────

  actualizarContador() {
    const carrito = DB.getCarrito();
    const total = carrito.reduce((s, i) => s + i.cantidad, 0);
    const el = document.getElementById('carrito-contador');
    if (el) el.textContent = total;
  },

  // ── Abrir / cerrar modal ──────────────────────────────────

  toggle() {
    const modal   = document.getElementById('carrito-modal');
    const overlay = document.getElementById('carrito-overlay');
    if (!modal) return;
    const abierto = modal.classList.toggle('abierto');
    overlay.classList.toggle('activo', abierto);
    document.body.style.overflow = abierto ? 'hidden' : '';
    if (abierto) this.renderizar();
  },

  cerrar() {
    const modal   = document.getElementById('carrito-modal');
    const overlay = document.getElementById('carrito-overlay');
    if (!modal) return;
    modal.classList.remove('abierto');
    overlay.classList.remove('activo');
    document.body.style.overflow = '';
  },

  // ── Renderizar contenido del modal ────────────────────────

  renderizar() {
    const carrito     = DB.getCarrito();
    const contenido   = document.getElementById('carrito-contenido');
    const elSubtotal  = document.getElementById('carrito-subtotal');
    const elIva       = document.getElementById('carrito-iva');
    const elTotal     = document.getElementById('carrito-total');
    const btnComprar  = document.getElementById('carrito-btn-comprar');
    if (!contenido) return;

    if (carrito.length === 0) {
      contenido.innerHTML = `
        <div style="text-align:center; padding:40px 0; color:#888;">
          <div style="font-size:48px">🛒</div>
          <p>Tu carrito está vacío</p>
        </div>`;
      if (elSubtotal) elSubtotal.textContent = '$0.00 MXN';
      if (elIva)      elIva.textContent      = '$0.00 MXN';
      if (elTotal)    elTotal.textContent    = '$0.00 MXN';
      if (btnComprar) btnComprar.disabled    = true;
      return;
    }

    // Verificar stock actual
    const articulos = DB.getArticulos();
    const stockMap  = {};
    articulos.forEach(a => { stockMap[a.id] = a.stock; });

    let subtotal = 0;
    contenido.innerHTML = carrito.map(item => {
      const linea      = item.precio * item.cantidad;
      subtotal        += linea;
      const stock      = stockMap[item.idArticulo];
      const sinStock   = stock !== undefined && item.cantidad > stock;
      const imgSrc     = item.imagenBase64 || 'img/placeholder.png';

      return `
        <div class="carrito-item" data-id="${item.idArticulo}">
          <img src="${imgSrc}" alt="${item.nombre}" class="carrito-item-img">
          <div class="carrito-item-info">
            <div class="carrito-item-nombre">${item.nombre}</div>
            <div class="carrito-item-precio">$${item.precio.toFixed(2)} MXN</div>
            <div class="carrito-item-cantidad">
              <button onclick="Carrito.cambiar(${item.idArticulo}, -1)">−</button>
              <input type="number" min="1" value="${item.cantidad}"
                onchange="Carrito.setCantidad(${item.idArticulo}, this)"
                style="${sinStock ? 'border-color:red;color:red;' : ''}">
              <button onclick="Carrito.cambiar(${item.idArticulo}, 1)">+</button>
              <span>$${linea.toFixed(2)} MXN</span>
            </div>
            ${sinStock ? `<small style="color:red">Stock disponible: ${stock}</small>` : ''}
          </div>
          <button class="carrito-item-eliminar" onclick="Carrito.eliminar(${item.idArticulo})">🗑️</button>
        </div>`;
    }).join('');

    const iva   = subtotal * 0.16;
    const total = subtotal + iva;

    if (elSubtotal) elSubtotal.textContent = `$${subtotal.toFixed(2)} MXN`;
    if (elIva)      elIva.textContent      = `$${iva.toFixed(2)} MXN`;
    if (elTotal)    elTotal.textContent    = `$${total.toFixed(2)} MXN`;
    if (btnComprar) btnComprar.disabled    = false;
  },

  // ── Acciones ──────────────────────────────────────────────

  agregar(idArticulo) {
    if (!Auth.isLoggedIn()) {
      alert('Debes iniciar sesión para agregar productos al carrito.');
      window.location.href = 'login.html';
      return false;
    }
    const art = DB.getArticuloById(idArticulo);
    if (!art) return false;
    DB.agregarAlCarrito({
      idArticulo: art.id,
      nombre:     art.nombre,
      precio:     art.precio,
      imagenBase64: art.imagenBase64
    });
    this.actualizarContador();
    return true;
  },

  cambiar(idArticulo, delta) {
    DB.cambiarCantidadCarrito(idArticulo, delta);
    this.actualizarContador();
    this.renderizar();
  },

  setCantidad(idArticulo, input) {
    const val = parseInt(input.value);
    if (isNaN(val) || val < 1) {
      input.value = DB.getCarrito().find(i => i.idArticulo === idArticulo)?.cantidad || 1;
      return;
    }
    DB.setCantidadCarrito(idArticulo, val);
    this.actualizarContador();
    this.renderizar();
  },

  eliminar(idArticulo) {
    DB.eliminarDelCarrito(idArticulo);
    this.actualizarContador();
    this.renderizar();
  },

  // ── Finalizar compra ──────────────────────────────────────

  async finalizar() {
    const sesion  = Auth.getSesion();
    if (!sesion) { alert('Debes iniciar sesión.'); return; }

    const carrito = DB.getCarrito();
    if (carrito.length === 0) { alert('Tu carrito está vacío.'); return; }

    const items = carrito.map(i => ({ idArticulo: i.idArticulo, cantidad: i.cantidad }));

    // Verificar stock
    const articulos = DB.getArticulos();
    for (const item of items) {
      const art = articulos.find(a => a.id === item.idArticulo);
      if (!art || art.stock < item.cantidad) {
        alert(`Stock insuficiente para "${art?.nombre || item.idArticulo}".`);
        this.renderizar();
        return;
      }
    }

    // Calcular para mostrar confirmación
    let subtotal = 0;
    carrito.forEach(i => { subtotal += i.precio * i.cantidad; });
    const iva   = subtotal * 0.16;
    const total = subtotal + iva;

    if (!confirm(
      `¿Confirmar compra?\n\nSubtotal: $${subtotal.toFixed(2)} MXN\nIVA (16%): $${iva.toFixed(2)} MXN\nTotal: $${total.toFixed(2)} MXN`
    )) return;

    // Descontar stock
    const descuento = DB.descontarStock(items);
    if (!descuento.ok) { alert(descuento.error); return; }

    // Registrar compra
    const resultado = DB.registrarCompra(sesion.id, items);
    if (!resultado.ok) { alert(resultado.error); return; }

    DB.limpiarCarrito();
    this.actualizarContador();
    this.cerrar();
    alert('¡Compra realizada con éxito! Gracias por tu compra. 🎉');
    this.renderizar();
    document.dispatchEvent(new CustomEvent('compra-realizada'));
  },

  // ── Inicializar (llamar en DOMContentLoaded) ──────────────

  init() {
    this.actualizarContador();
  }
};
