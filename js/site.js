// site.js — único script del sitio: abre/cierra el menú en móvil.
const nav = document.querySelector('.nav');
const btn = document.querySelector('.nav-toggle');
if (nav && btn) {
  btn.addEventListener('click', () => {
    // Alterna la clase que muestra los enlaces (ver site.css, @media max-width:900px)
    const open = nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open);
  });
}

// Formulario de contacto: envía el mensaje sin salir de la página y muestra el resultado.
// Si algo falla (o no hay JavaScript), el formulario sigue funcionando como un envío normal.
const formContacto = document.querySelector('form[data-contacto]');
if (formContacto && window.fetch) {
  const aviso = formContacto.querySelector('.form-msg');
  const boton = formContacto.querySelector('button[type="submit"]');
  formContacto.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {};
    new FormData(formContacto).forEach((v, k) => { datos[k] = typeof v === 'string' ? v : ''; });
    const mostrar = (texto, clase) => { aviso.textContent = texto; aviso.className = `form-msg ${clase}`; };
    boton.disabled = true;
    mostrar('Enviando...', '');
    try {
      const r = await fetch(formContacto.getAttribute('action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      let j = {};
      try { j = await r.json(); } catch { /* respuesta sin JSON */ }
      if (r.ok && j.ok) { formContacto.reset(); mostrar(j.mensaje || 'Mensaje enviado.', 'is-ok'); }
      else mostrar(j.error || 'No he podido enviar tu mensaje. Inténtalo más tarde.', 'is-error');
    } catch {
      mostrar('No he podido enviar tu mensaje: comprueba tu conexión e inténtalo de nuevo.', 'is-error');
    }
    boton.disabled = false;
  });
}
