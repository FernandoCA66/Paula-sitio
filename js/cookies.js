// cookies.js — aviso de cookies con Consent Mode v2 en modo básico: hasta que el visitante acepta alguna categoría, la
// página no contacta con Google (ni siquiera para descargar el contenedor de Google Tag Manager). Rechazar equivale a no
// haber puesto nada. Dos categorías independientes: estadísticas (Google Analytics) y publicidad (medición de Google Ads).
// Sin remarketing: la personalización de anuncios siempre va denegada. Solo se pinta si el generador pone el
// identificador del contenedor en este <script> (templates/cookies-config.js).
(function (global) {
  'use strict';

  var CLAVE = 'cookies-paula'; // localStorage
  var VERSION = 2; // al cambiar las categorías, subirla: se vuelve a preguntar a todos

  // Eventos que la web envía al contenedor (los pidió la agencia; cualquier otro nombre se ignora)
  var EVENTOS = ['form_submit_success', 'click_whatsapp', 'click_phone'];

  var estado = function (v) { return v ? 'granted' : 'denied'; };
  // Qué se concede a Google según la elección: { estadisticas: bool, publicidad: bool }
  function consentimiento(e) {
    return { ad_storage: estado(e && e.publicidad), ad_user_data: estado(e && e.publicidad), ad_personalization: 'denied', analytics_storage: estado(e && e.estadisticas) };
  }

  function leerEleccion(almacen) {
    try {
      var d = JSON.parse(almacen.getItem(CLAVE));
      if (d && d.version === VERSION && typeof d.estadisticas === 'boolean' && typeof d.publicidad === 'boolean') return d;
    } catch (e) { /* sin almacenamiento o dato roto: se vuelve a preguntar */ }
    return null;
  }

  function guardarEleccion(almacen, e) {
    try { almacen.setItem(CLAVE, JSON.stringify({ version: VERSION, estadisticas: !!e.estadisticas, publicidad: !!e.publicidad })); return true; } catch (err) { return false; }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { consentimiento: consentimiento, leerEleccion: leerEleccion, guardarEleccion: guardarEleccion };
  if (typeof document === 'undefined') return;

  var script = document.currentScript;
  if (!script || !script.dataset.contenedor) return;
  var CONTENEDOR = script.dataset.contenedor;
  var POLITICA = script.dataset.politica || '';
  var MEDICION = /^G-[A-Z0-9]{4,12}$/.test(script.dataset.medicion || '') ? script.dataset.medicion : ''; // ID de Google Analytics 4
  var almacen = (function () { try { return global.localStorage; } catch (e) { return { getItem: function () { return null; }, setItem: function () { throw new Error('sin almacenamiento'); } }; } })();

  global.dataLayer = global.dataLayer || [];
  function gtag() { global.dataLayer.push(arguments); } // Google exige el objeto arguments
  gtag('consent', 'default', consentimiento(false));

  var eleccion = leerEleccion(almacen);
  var cargada = false;

  // Carga el contenedor de Google Tag Manager (la agencia gestiona dentro de él Analytics y las conversiones de Ads).
  // Solo se llama con permiso de alguna categoría; el consentimiento por defecto (denegado) ya está puesto arriba.
  function cargarGoogle() {
    if (cargada) return;
    cargada = true;
    global.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(CONTENEDOR);
    document.head.appendChild(s);
  }

  // Al retirar una categoría se borran las cookies que Google hubiera puesto en esta web:
  // estadísticas = _ga, _ga_<id>, _gid, _gat*; publicidad = _gcl_*, _gac_*
  var COOKIES_ESTADISTICAS = /^(_ga($|_)|_gid$|_gat)/;
  var COOKIES_PUBLICIDAD = /^_(gcl|gac)/;
  function borrarCookiesGoogle(e) {
    var dominios = [location.hostname, '.' + location.hostname.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (c) {
      var nombre = c.split('=')[0].trim();
      var borrar = (!e.estadisticas && COOKIES_ESTADISTICAS.test(nombre)) || (!e.publicidad && COOKIES_PUBLICIDAD.test(nombre));
      if (!borrar) return;
      dominios.forEach(function (d) { document.cookie = nombre + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + d; });
      document.cookie = nombre + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
  }

  // Interruptor oficial de Google: con 'ga-disable-<ID>' en true, Analytics deja de enviar datos al instante, sin recargar.
  function bloquearAnalytics(e) {
    if (MEDICION) global['ga-disable-' + MEDICION] = !e.estadisticas;
  }
  // Bloqueado desde el principio: hasta que el visitante acepte estadísticas, Analytics no envía nada
  bloquearAnalytics({ estadisticas: false });

  function aplicar(e) {
    bloquearAnalytics(e);
    gtag('consent', 'update', consentimiento(e));
    if (e.estadisticas || e.publicidad) cargarGoogle();
    borrarCookiesGoogle(e);
    // Aviso para el contenedor: la agencia activa o desactiva etiquetas con este evento sin recargar la página
    global.dataLayer.push({ event: 'paula_consent_update', analytics: !!e.estadisticas, ads: !!e.publicidad });
  }

  // Eventos de contacto (los lanzan site.js y el formulario): solo con el contenedor cargado, es decir, con permiso.
  // Cada etiqueta del contenedor decide si actúa según el consentimiento de su categoría.
  global.paulaEvento = function (nombre) {
    if (!cargada || EVENTOS.indexOf(nombre) < 0) return;
    global.dataLayer.push({ event: nombre });
  };

  // ---------- Aviso ----------
  function el(etiqueta, atributos, hijos) {
    var e = document.createElement(etiqueta);
    Object.keys(atributos || {}).forEach(function (k) { if (atributos[k] !== null) e.setAttribute(k, atributos[k]); });
    [].concat(hijos || []).forEach(function (h) { e.append(h); });
    return e;
  }
  var boton = function (texto, clase, alPulsar) { var b = el('button', { type: 'button', class: clase }, texto); b.addEventListener('click', alPulsar); return b; };

  var caja, vistaPrincipal, vistaConfig, casillaEstadisticas, casillaPublicidad, abiertoDesde = null;

  function elegir(estadisticas, publicidad) {
    eleccion = { version: VERSION, estadisticas: estadisticas, publicidad: publicidad };
    guardarEleccion(almacen, eleccion);
    aplicar(eleccion);
    ocultar();
  }

  function ajustarWhatsApp() { document.documentElement.style.setProperty('--cookies-alto', caja && !caja.hidden ? caja.offsetHeight + 'px' : '0px'); }
  function ocultar() {
    caja.hidden = true;
    ajustarWhatsApp();
    if (abiertoDesde && abiertoDesde.focus) abiertoDesde.focus();
    abiertoDesde = null;
  }

  function mostrar(configurar) {
    if (!caja) construir();
    vistaPrincipal.hidden = !!configurar;
    vistaConfig.hidden = !configurar;
    casillaEstadisticas.checked = !!(eleccion && eleccion.estadisticas);
    casillaPublicidad.checked = !!(eleccion && eleccion.publicidad);
    caja.hidden = false;
    ajustarWhatsApp();
  }

  function construir() {
    var enlacePolitica = POLITICA ? [' ', el('a', { href: POLITICA }, 'Política de cookies')] : [];
    vistaPrincipal = el('div', { class: 'cookies-in' }, [
      el('div', { class: 'cookies-texto' }, [
        el('p', { id: 'cookies-titulo', class: 'cookies-titulo' }, 'Tu privacidad es lo primero'),
        el('p', { id: 'cookies-texto' }, ['Usamos cookies de Google para saber cómo se usa la web y medir los contactos que llegan desde anuncios. Solo se activan si las aceptas. Si las rechazas, la web funciona igual.'].concat(enlacePolitica)),
      ]),
      el('div', { class: 'cookies-botones' }, [
        boton('Configurar', 'cookies-enlace', function () { mostrar(true); }),
        boton('Rechazar', 'btn btn-secondary', function () { elegir(false, false); }),
        boton('Aceptar', 'btn btn-secondary', function () { elegir(true, true); }),
      ]),
    ]);
    casillaEstadisticas = el('input', { type: 'checkbox', id: 'cookies-estadisticas' });
    casillaPublicidad = el('input', { type: 'checkbox', id: 'cookies-publicidad' });
    vistaConfig = el('div', { class: 'cookies-in cookies-config' }, [
      el('div', { class: 'cookies-texto' }, [
        el('p', { class: 'cookies-titulo' }, 'Configurar cookies'),
        el('p', { class: 'cookies-nota' }, 'Esta web no necesita cookies para funcionar: solo guarda tu elección en tu navegador.'),
        el('label', { class: 'cookies-fila', for: 'cookies-estadisticas' }, [
          casillaEstadisticas,
          el('span', null, [el('strong', null, 'Estadísticas (Google Analytics)'), el('br'), 'Permiten saber cuántas personas visitan la web, qué páginas ven y cómo llegan. Los datos son agregados y no se usan para mostrarte anuncios.']),
        ]),
        el('label', { class: 'cookies-fila', for: 'cookies-publicidad' }, [
          casillaPublicidad,
          el('span', null, [el('strong', null, 'Medición de publicidad (Google Ads)'), el('br'), 'Permiten saber si alguien llegó desde un anuncio y acabó contactando. No se usan para mostrarte anuncios después.']),
        ]),
      ]),
      el('div', { class: 'cookies-botones' }, [
        boton('Guardar mi elección', 'btn btn-secondary', function () { elegir(casillaEstadisticas.checked, casillaPublicidad.checked); }),
        boton('Rechazar todo', 'btn btn-secondary', function () { elegir(false, false); }),
        boton('Aceptar todo', 'btn btn-secondary', function () { elegir(true, true); }),
      ]),
    ]);
    caja = el('div', { class: 'cookies', role: 'dialog', 'aria-label': 'Aviso de cookies', hidden: '' }, [vistaPrincipal, vistaConfig]);
    document.body.append(caja);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && eleccion && !caja.hidden) ocultar(); }); // solo si ya había elegido
    global.addEventListener('resize', ajustarWhatsApp);
  }

  function iniciar() {
    document.querySelectorAll('[data-cookies-abrir]').forEach(function (b) {
      b.addEventListener('click', function () { abiertoDesde = b; mostrar(true); });
    });
    if (eleccion) aplicar(eleccion); else mostrar(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(typeof window !== 'undefined' ? window : globalThis);
