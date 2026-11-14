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
  const destino = formContacto.getAttribute('action');
  const enviarJson = (cuerpo) => fetch(destino, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  // Testigo contra robots: se pide al cargar la página y se devuelve con el mensaje (ver server/contacto.js).
  // Si no se consigue, el mensaje se envía sin él y el servidor decide.
  const pedirTestigo = () => enviarJson({ _pedir: 'token' }).then((r) => r.json()).then((j) => (j && typeof j.token === 'string' ? j.token : '')).catch(() => '');
  let testigo = pedirTestigo();
  formContacto.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {};
    new FormData(formContacto).forEach((v, k) => { datos[k] = typeof v === 'string' ? v : ''; });
    const mostrar = (texto, clase) => { aviso.textContent = texto; aviso.className = `form-msg ${clase}`; };
    boton.disabled = true;
    mostrar('Enviando...', '');
    try {
      const enviar = async () => {
        const r = await enviarJson({ ...datos, _token: await testigo });
        let j = {};
        try { j = await r.json(); } catch { /* respuesta sin JSON */ }
        return { r, j };
      };
      let { r, j } = await enviar();
      if (j.reintentar) {
        // Testigo caducado o perdido (página abierta mucho tiempo, servidor reiniciado): se pide otro y se reenvía una vez
        testigo = pedirTestigo();
        await testigo;
        await new Promise((listo) => setTimeout(listo, 3500));
        ({ r, j } = await enviar());
      }
      if (r.ok && j.ok) { formContacto.reset(); mostrar(j.mensaje || 'Mensaje enviado.', 'is-ok'); if (window.paulaEvento) window.paulaEvento('form_submit_success'); }
      else mostrar(j.error || 'No he podido enviar tu mensaje. Inténtalo más tarde.', 'is-error');
    } catch {
      mostrar('No he podido enviar tu mensaje: comprueba tu conexión e inténtalo de nuevo.', 'is-error');
    }
    // Cada testigo sirve para un solo mensaje: se pide otro para el siguiente
    testigo = pedirTestigo();
    boton.disabled = false;
  });
}

// Botón flotante de WhatsApp: sube un poco al hacer scroll y abre la burbuja solo al pulsarlo.
// Se cierra con la X o con Escape. Sin JavaScript, el botón no hace nada, pero los demás enlaces a WhatsApp siguen funcionando.
const waFlotante = document.querySelector('[data-wa-flotante]');
if (waFlotante) {
  const waBoton = waFlotante.querySelector('.wa-boton');
  const waChat = waFlotante.querySelector('.wa-chat');
  const waCerrar = waFlotante.querySelector('.wa-cerrar');
  const mostrarChat = (abierto) => {
    waChat.classList.toggle('is-open', abierto);
    waChat.setAttribute('aria-hidden', String(!abierto));
    waBoton.setAttribute('aria-expanded', String(abierto));
  };
  waBoton.addEventListener('click', () => mostrarChat(!waChat.classList.contains('is-open')));
  waCerrar.addEventListener('click', () => { mostrarChat(false); waBoton.focus(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && waChat.classList.contains('is-open')) { mostrarChat(false); waBoton.focus(); }
  });
  // Movimiento suave: sube hasta 40 px a medida que se baja por la página
  let pendiente = false;
  const colocar = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    waFlotante.style.setProperty('--p', p.toFixed(3));
    pendiente = false;
  };
  window.addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(colocar); } }, { passive: true });
  window.addEventListener('resize', colocar);
  colocar();
}

// Eventos de contacto: clic en WhatsApp o en un teléfono. Solo hacen algo si el aviso de cookies está activo y el visitante ha dado permiso.
document.addEventListener('click', (e) => {
  if (!window.paulaEvento || !e.target.closest) return;
  if (e.target.closest('a[href^="https://wa.me/"]')) window.paulaEvento('click_whatsapp');
  else if (e.target.closest('a[href^="tel:"]')) window.paulaEvento('click_phone');
});
