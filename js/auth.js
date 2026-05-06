// ============================================================
//  auth.js  —  Sesión de usuario (depende de db.js)
// ============================================================

const Auth = {

  // Guardar sesión al hacer login
  login(usuario) {
    const sesion = {
      id:     usuario.id,
      nombre: usuario.nombre,
      email:  usuario.email,
      idRol:  usuario.idRol,          // 1 = Admin, 2 = Cliente
      rol:    usuario.idRol === 1 ? 'Admin' : 'Cliente'
    };
    localStorage.setItem('sesion', JSON.stringify(sesion));
    return sesion;
  },

  // Obtener usuario en sesión (null si no hay)
  getSesion() {
    return JSON.parse(localStorage.getItem('sesion'));
  },

  // Verificar si hay sesión activa
  isLoggedIn() {
    return !!this.getSesion();
  },

  // Verificar si el usuario es admin
  isAdmin() {
    const sesion = this.getSesion();
    return sesion && sesion.idRol === 1;
  },

  // Cerrar sesión
  logout() {
    localStorage.removeItem('sesion');
    DB.limpiarCarrito();
  },

  // Intentar login: retorna { ok, error?, sesion? }
  intentarLogin(email, password) {
    const usuario = DB.getUsuarioByEmail(email);
    console.log("Usuario: " + usuario);
    if (!usuario) return { ok: false, error: 'Correo o contraseña incorrectos.' };
    if (usuario.password !== password) return { ok: false, error: 'Correo o contraseña incorrectos.' };
    const sesion = this.login(usuario);
    return { ok: true, sesion };
  },

  // Registrar nuevo usuario: retorna { ok, error? }
  registrar({ nombre, email, password }) {
    const resultado = DB.crearUsuario({ nombre, email, password, idRol: 2 });
    return resultado;
  },

  // Redirigir si no hay sesión
  requerirLogin(redirigirA = 'login.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirigirA;
    }
  },

  // Redirigir si no es admin
  requerirAdmin(redirigirA = 'index.html') {
    if (!this.isAdmin()) {
      window.location.href = redirigirA;
    }
  },

  // Aplica el estado de sesión a la navbar (llámalo en cada página)
  // Espera elementos con estas clases/atributos en el HTML:
  //   [data-solo-sesion]  → visible solo si hay sesión
  //   [data-solo-admin]   → visible solo si es admin
  //   [data-solo-invitado]→ visible solo si NO hay sesión
  //   [data-nombre-usuario] → rellena con el nombre del usuario
  aplicarNavbar() {
    const sesion = this.getSesion();

    document.querySelectorAll('[data-solo-sesion]').forEach(el => {
      el.style.display = sesion ? '' : 'none';
    });
    document.querySelectorAll('[data-solo-invitado]').forEach(el => {
      el.style.display = sesion ? 'none' : '';
    });
    document.querySelectorAll('[data-solo-admin]').forEach(el => {
      el.style.display = (sesion && sesion.idRol === 1) ? '' : 'none';
    });
    document.querySelectorAll('[data-nombre-usuario]').forEach(el => {
      el.textContent = sesion ? sesion.nombre : '';
    });
  }
};
