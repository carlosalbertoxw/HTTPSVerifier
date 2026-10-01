# Auditoría del proyecto: HTTPSVerifier

**Fecha:** 2026-09-30 · **Commit auditado:** `28b419f` (master) · **Auditor:** Claude (skill auditoria-proyecto-software)

## 1. Resumen ejecutivo

HTTPS Verifier es una extensión de Chrome (Manifest V3, JavaScript sin dependencias) publicada en la Chrome Web Store que avisa cuando una página o sus enlaces/recursos no usan HTTPS. No tiene backend, cuentas ni base de datos, y no envía datos fuera del navegador; su exposición principal es que pide permisos de host sobre **todos los sitios** y se distribuye a usuarios reales. El código es pequeño, limpio y cuidadoso con la privacidad (sin red, sin `innerHTML`, sin código remoto, notificaciones solo con el origen). Los huecos están en el **proceso**: el comando de pruebas documentado está roto en Node actual, no hay CI, el empaquetado es manual, y la detección cuenta de más en páginas HTTP y no cubre varios tipos de recurso que la ficha de la tienda promete.

**Calificación global:** 56 % — Requiere atención
**Hallazgos:** 0 críticos · 0 altos · 4 medios · 9 bajos · 1 informativo
**Controles no verificables desde el código:** 5 de 72 (39 no aplican a una extensión sin backend)

> La calificación la arrastran sobre todo controles de proceso (pruebas, CI, licencia, changelog). En seguridad del código propiamente dicha (áreas 07, 10 y 12) el proyecto sale bien: 100 %, 100 % y 75 %.

**Prioridades principales**
1. [H-01] `npm test` falla en Node ≥ 21: las pruebas existen pero el comando documentado no las ejecuta.
2. [H-02] Sin pipeline de CI y con empaquetado manual del ZIP que se sube a la tienda.
3. [H-03] El conteo de "recursos inseguros" se infla en páginas HTTP y mezcla enlaces con recursos cargados.
4. [H-04] La detección no cubre iframes, multimedia, `srcset`, formularios ni recursos cargados dinámicamente.
5. Pregunta AUT-06: MFA fuerte en la cuenta de desarrollador de la Chrome Web Store. Con permisos en todos los sitios, una cuenta comprometida es el riesgo real más grave para los usuarios.

## 2. Resultados por área

| # | Área | Cumple | Parcial | No cumple | N/A | No verif. | Puntaje |
|---|------|-------:|--------:|----------:|----:|----------:|--------:|
| 01 | Fundamentos del proyecto | 0 | 1 | 0 | 1 | 1 | 50 % |
| 02 | Diseño y arquitectura | 1 | 0 | 0 | 1 | 2 | 100 % |
| 03 | Documentación | 3 | 2 | 2 | 2 | 0 | 57 % |
| 04 | Pruebas y calidad | 0 | 1 | 3 | 0 | 0 | 13 % |
| 05 | Automatización y despliegue | 0 | 1 | 1 | 2 | 0 | 25 % |
| 06 | Observabilidad y operación | 0 | 0 | 0 | 6 | 0 | — |
| 07 | Secretos y configuración | 2 | 0 | 0 | 1 | 0 | 100 % |
| 08 | Autenticación y sesiones | 0 | 0 | 0 | 5 | 1 | — |
| 09 | Base de datos y autorización | 0 | 1 | 0 | 4 | 0 | 50 % |
| 10 | Validación y protección de datos | 3 | 0 | 0 | 3 | 0 | 100 % |
| 11 | Archivos y APIs | 0 | 0 | 0 | 4 | 0 | — |
| 12 | Seguridad web | 1 | 1 | 0 | 3 | 0 | 75 % |
| 13 | Dependencias y vigilancia | 0 | 0 | 2 | 5 | 1 | 0 % |
| 14 | Cumplimiento y aspectos legales | 1 | 1 | 1 | 2 | 0 | 50 % |

Calificación global = promedio de las 11 áreas con controles evaluables (06, 08 y 11 quedan fuera por no tener ninguno).

<details>
<summary>Detalle de estado por control</summary>

| Control | Estado | Nota breve |
|---------|--------|------------|
| FUN-01 | ⚠️ Parcial | Historial corto y legible, pero `e1a1336` "Se actualiza proyecto" mezcla 19 archivos y 794 líneas; mensajes en dos idiomas (H-13) |
| FUN-02 | ❓ No verificable | Un solo autor, sin PRs; la protección de rama se configura en GitHub |
| FUN-03 | ➖ N/A | Extensión de navegador: no hay entorno de servidor que contenerizar |
| ARQ-01 | ➖ N/A | Sin servicio con requisitos de disponibilidad o latencia |
| ARQ-02 | ❓ No verificable | Proyecto personal; sin documentos de diseño en el repo |
| ARQ-03 | ❓ No verificable | No hay modelo de amenazas escrito (ver preguntas) |
| ARQ-04 | ✅ Cumple | Cero dependencias (`package.json` sin `dependencies`) |
| DOC-01 | ✅ Cumple | `README.md:3-19` explica qué hace y qué notifica |
| DOC-02 | ⚠️ Parcial | Pasos de carga claros, pero `npm test` está roto y no se indica versión de Node ni de Chrome (H-01, H-08) |
| DOC-03 | ✅ Cumple | Tabla de estructura en `README.md:32-44` |
| DOC-04 | ➖ N/A | Proyecto de una persona; las decisiones no obvias están explicadas en comentarios (p. ej. `background.js:30-31`, `93-94`) |
| DOC-05 | ➖ N/A | No expone API |
| DOC-06 | ❌ No cumple | Sin `CONTRIBUTING.md` en un repo público (H-09) |
| DOC-07 | ✅ Cumple | El procedimiento de publicación está escrito paso a paso (`README.md:60-115`) |
| DOC-08 | ❌ No cumple | Sin `CHANGELOG.md` ni tags de versión (H-10) |
| DOC-09 | ⚠️ Parcial | Docs versionadas y comentarios que explican el porqué, pero el README cita la versión 1.1.0 (H-08) |
| PRU-01 | ⚠️ Parcial | 9 pruebas unitarias de `isInsecureUrl` que pasan, pero el script `npm test` falla (H-01) |
| PRU-02 | ❌ No cumple | Sin pruebas de `background.js` ni de `page-check.js` (H-07) |
| PRU-03 | ❌ No cumple | Sin E2E de la extensión cargada en Chrome (H-07) |
| PRU-04 | ❌ No cumple | Sin ESLint/Prettier/`.editorconfig` (H-02) |
| CI-01 | ❌ No cumple | No existe `.github/workflows/`; ZIP construido a mano (H-02) |
| CI-02 | ➖ N/A | No hay pipeline que pueda bloquear (cubierto en CI-01) |
| CI-03 | ➖ N/A | Sin base de datos |
| CI-04 | ⚠️ Parcial | Versión en el manifiesto, pero sin tags para reconstruir una versión anterior (H-10) |
| OBS-01…06 | ➖ N/A | Extensión local sin servicio desplegado; la ausencia de telemetría es deliberada y coherente con la promesa de privacidad |
| SEC-01 | ✅ Cumple | El inventario no encontró secretos; el proyecto no usa credenciales |
| SEC-02 | ✅ Cumple | Sin archivos sensibles ni patrones de secretos en el historial |
| SEC-03 | ➖ N/A | No hay configuración secreta |
| AUT-01…05 | ➖ N/A | Sin usuarios ni sesiones |
| AUT-06 | ❓ No verificable | MFA en la cuenta de la Chrome Web Store y de GitHub |
| BD-01…04 | ➖ N/A | Sin base de datos |
| BD-05 | ⚠️ Parcial | Permisos mínimos para la API, pero host permissions sobre todos los sitios desde la instalación (H-05) |
| VAL-01 | ✅ Cumple | Toda URL de la página pasa por `new URL()` dentro de `try/catch` (`insecure-url.js:7-14`) |
| VAL-02 | ✅ Cumple | El popup usa solo `textContent` (`popup.js:8`, `74-78`); sin `innerHTML` en todo el repo |
| VAL-03 | ➖ N/A | Sin SQL |
| VAL-04 | ➖ N/A | La extensión no hace peticiones de red |
| VAL-05 | ➖ N/A | No se guardan datos sensibles en reposo |
| VAL-06 | ✅ Cumple | Solo guarda preferencias y la última URL por pestaña en `storage.session`, que se borra al cerrar Chrome (`background.js:30-45`) |
| API-01…04 | ➖ N/A | Sin subidas de archivos ni API |
| WEB-01 | ➖ N/A | No hay servidor propio |
| WEB-02 | ✅ Cumple | CSP por defecto de MV3, sin `eval`, sin código remoto, scripts como módulos locales |
| WEB-03 / WEB-04 | ➖ N/A | Sin servidor ni cookies |
| WEB-05 | ⚠️ Parcial | `console.debug` registra la URL completa (H-12) |
| DEP-01…03 | ➖ N/A | Cero dependencias, nada que escanear ni bloquear |
| DEP-04 | ❌ No cumple | Sin CodeQL ni otro análisis estático (H-02) |
| DEP-05 | ➖ N/A | Sin eventos de seguridad propios que registrar |
| DEP-06 | ❓ No verificable | ¿Quién atiende los avisos de GitHub y de la Chrome Web Store? |
| DEP-07 | ➖ N/A | Sin superficie de servidor para DAST/pentest |
| DEP-08 | ❌ No cumple | Sin `SECURITY.md` ni canal para reportar vulnerabilidades (H-09) |
| LEG-01 | ➖ N/A | Sin dependencias de terceros (la falta de `LICENSE` del proyecto va en LEG-05) |
| LEG-02 | ➖ N/A | No se recogen ni transmiten datos personales |
| LEG-03 | ⚠️ Parcial | La ficha dice "no data collection" y el código lo confirma, pero no hay política de privacidad publicada (H-11) |
| LEG-04 | ✅ Cumple | Ningún tercero recibe datos: no hay SDKs, analítica ni llamadas de red |
| LEG-05 | ❌ No cumple | Repo público sin `LICENSE` (H-09) |

</details>

## 3. Hallazgos

### [H-01] El script `npm test` no ejecuta las pruebas en Node ≥ 21 — 🟡 Media
- **Control:** PRU-01 · Pruebas unitarias
- **Evidencia:** `package.json:7` define `"test": "node --test tests/"`. Con Node v24.18.0, `npm test` termina con `Error: Cannot find module '...\HTTPSVerifier\tests'` y reporta `fail 1`, `pass 0`. Desde Node 21, `node --test` ya no acepta un directorio como argumento. Las 9 pruebas sí pasan cuando se ejecutan con `node --test` sin argumentos o con la ruta del archivo.
- **Riesgo:** el comando que documenta el README (`README.md:56-58`) falla, así que cualquiera que lo ejecute antes de publicar concluye "las pruebas fallan" o deja de ejecutarlas. Al no haber CI (H-02), nadie lo detectó.
- **Recomendación:**
  1. Cambiar el script a `"test": "node --test"`, que descubre `**/*.test.js` automáticamente desde Node 18.
  2. Agregar `"engines": { "node": ">=18" }` a `package.json` y mencionarlo en el README.
- **Esfuerzo estimado:** Bajo

### [H-02] Sin pipeline de CI, sin linter y con empaquetado manual — 🟡 Media
- **Control:** CI-01 · Pipeline (también PRU-04 y DEP-04)
- **Evidencia:** no existe `.github/workflows/` ni otro pipeline. No hay configuración de ESLint, Prettier ni `.editorconfig`. El ZIP que se sube a la tienda se arma a mano con una lista de archivos escrita en `README.md:87-91`.
- **Riesgo:** las pruebas pueden romperse sin que nadie lo note (ya pasó, H-01). Una lista manual de archivos puede dejar fuera un módulo nuevo (la extensión fallaría en producción) o meter de más `tests/` o `store-assets/`. *Severidad bajada de Alta a Media:* es un proyecto personal sin backend, pero el ZIP llega a usuarios reales con permisos sobre todos los sitios.
- **Recomendación:**
  1. Crear `.github/workflows/ci.yml` que en cada push/PR ejecute `actions/checkout`, `actions/setup-node`, `npm test` y un linter (`npx eslint .` con `eslint.config.js` y `globals.browser` + `globals.webextensions`).
  2. Mover el empaquetado a un script versionado (`scripts/build-zip.mjs` o un `npm run build`) que lea la lista de archivos de un solo lugar y que el workflow publique como artefacto. Opcional: en tags `v*`, crear el GitHub Release con el ZIP.
  3. Activar CodeQL "default setup" en GitHub (gratis en repos públicos) y el escaneo de secretos con push protection.
- **Esfuerzo estimado:** Bajo a Medio

### [H-03] El conteo de "recursos inseguros" se infla en páginas HTTP y mezcla enlaces con recursos — 🟡 Media
- **Control:** — (correctitud funcional, fuera del checklist)
- **Evidencia:** `page-check.js:11-20` recoge todos los `a[href]`, `img[src]`, hojas de estilo y scripts, y `page-check.js:56-58` cuenta cada uno sin deduplicar. En una página `http://` cualquier URL relativa resuelve a `http:` (la prueba `tests/insecure-url.test.js:38` lo confirma con `#section`), así que una página HTTP con 120 enlaces internos muestra "La página no usa HTTPS" **y** "120 enlace(s) o recurso(s) no usan HTTPS" (`background.js:69-78`). Además, un `<a href="http://...">` en una página HTTPS no carga nada inseguro, pero cuenta igual que un `<script src="http://...">`.
- **Riesgo:** notificaciones ruidosas y poco accionables. El usuario no distingue un enlace a un sitio HTTP de un script cargado sin cifrar, y la fatiga lleva a desactivar las alertas, que es lo contrario del propósito de la extensión.
- **Recomendación:**
  1. Separar los dos tipos en el resultado: `insecureResources` (img/script/css/iframe/media) e `insecureLinks` (`a[href]`), con mensajes distintos en los cuatro `_locales`.
  2. Contar URLs únicas (`new Set(...)`).
  3. En páginas HTTP, omitir las URLs relativas o con el mismo origen: el aviso "la página no usa HTTPS" ya las cubre. Agregar pruebas unitarias para estos casos.
- **Esfuerzo estimado:** Medio

### [H-04] La detección no cubre varios tipos de recurso que la ficha de la tienda promete — 🟡 Media
- **Control:** — (correctitud funcional, fuera del checklist)
- **Evidencia:** el selector de `page-check.js:11-12` solo contempla `a[href], img[src], link[href][rel='stylesheet'], script[src]`, y `executeScript` se ejecuta solo en el frame principal (`page-check.js:9`, sin `allFrames`). La ficha (`store-assets/description-en.txt`) anuncia un *"Deep resource check"*.
- **Riesgo:** falsos negativos. Quedan sin detectar `iframe`/`frame`, `video`/`audio`/`source`, `img[srcset]`/`source[srcset]`, `embed`/`object`, `form[action]` (un formulario que envía datos por HTTP es el caso más grave para el usuario), `link rel="icon|preload|modulepreload"`, `url()` en CSS, recursos dentro de iframes y todo lo que se carga por JavaScript después de `status: "complete"`. El resultado "Todo usa HTTPS en esta página" (`checkResultOk`) puede ser falso.
- **Recomendación:**
  1. Ampliar el selector y leer también `srcset` (con varias URLs por atributo) y `form[action]`.
  2. Complementar con `performance.getEntriesByType("resource")`, que lista lo que la página cargó de verdad, incluidos CSS `url()` y recursos dinámicos.
  3. Valorar `allFrames: true` y combinar los resultados.
  4. Si no se amplía, ajustar el texto de la ficha y de `checkResultOk` a lo que realmente se revisa.
- **Esfuerzo estimado:** Medio

### [H-05] Permisos de host sobre todos los sitios desde la instalación — 🔵 Baja
- **Control:** BD-05 · Mínimo privilegio
- **Evidencia:** `manifest.json:12-15` declara `http://*/*` y `https://*/*` como `host_permissions` obligatorios.
- **Riesgo:** la función automática los necesita, así que el uso actual está justificado y bien declarado (`README.md:104-109`). Aun así, Chrome muestra "Leer y cambiar todos tus datos en todos los sitios" al instalar, la revisión de la tienda tarda más, y si la cuenta de desarrollador se compromete, una actualización maliciosa tendría acceso inmediato a todas las páginas de todos los usuarios.
- **Recomendación:** pasar los patrones a `optional_host_permissions`, añadir `activeTab` para que "Revisar esta página ahora" funcione sin permisos amplios, y pedir el permiso con `chrome.permissions.request` cuando el usuario active las notificaciones automáticas. Si se prefiere no cambiarlo, documentarlo como decisión consciente.
- **Esfuerzo estimado:** Medio

### [H-06] Condición de carrera en la deduplicación de notificaciones — 🔵 Baja
- **Control:** — (correctitud funcional)
- **Evidencia:** `setLastNotifiedUrl` (`background.js:37-45`) lee todo el mapa, lo modifica y lo vuelve a escribir. El listener comprueba y luego escribe en pasos `await` separados (`background.js:87-91`), así que varios eventos `onUpdated` concurrentes se intercalan.
- **Riesgo:** al restaurar una sesión con muchas pestañas, o cuando varias terminan de cargar a la vez, una escritura pisa a otra y se pierde una entrada, lo que provoca notificaciones repetidas. Si una página dispara dos `complete` seguidos, se notifica dos veces. Tampoco hay límite global, así que restaurar 20 pestañas HTTP produce 20 notificaciones.
- **Recomendación:** guardar una clave por pestaña (`lastNotified:${tabId}`) en lugar de un mapa compartido y serializar el manejo en el service worker con una cola de promesas o un `Map` en memoria como primera barrera. Opcional: agrupar en una sola notificación las que lleguen en una ventana corta.
- **Esfuerzo estimado:** Bajo

### [H-07] Las pruebas solo cubren la función pura — 🔵 Baja
- **Control:** PRU-02 / PRU-03
- **Evidencia:** `tests/` contiene únicamente `insecure-url.test.js`. La lógica de decisión de `background.js:51-99` (preferencias, deduplicación, texto de la notificación) y la de `inspectTab` (`page-check.js:43-63`) no tienen pruebas.
- **Riesgo:** los cambios de H-03, H-04 y H-06 tocan justo esa lógica sin red de seguridad.
- **Recomendación:**
  1. Extraer la decisión a una función pura (p. ej. `buildIssues(settings, inspection)` y `shouldNotify(lastUrl, url)`) y probarla con `node:test`.
  2. Para `page-check.js`, inyectar un `globalThis.chrome` falso en las pruebas.
  3. A mediano plazo, una prueba E2E con Puppeteer (`--load-extension`) contra páginas HTTP/HTTPS servidas en local.
- **Esfuerzo estimado:** Medio

### [H-08] README desactualizado y sin versión mínima de Chrome ni de Node — 🔵 Baja
- **Control:** DOC-02 / DOC-09
- **Evidencia:** el manifiesto está en `1.3.0` (`manifest.json:4`), pero el README nombra el ZIP `https-verifier-1.1.0.zip` (`README.md:67`, `90`) y conserva la nota de la 1.1.0 (`README.md:115`). El manifiesto no declara `minimum_chrome_version`, aunque usa `chrome.storage.session` (Chrome 102+) y un service worker de tipo módulo.
- **Riesgo:** confusión al empaquetar (se puede subir un ZIP con un nombre que no corresponde) y errores en navegadores antiguos en lugar de una instalación bloqueada con un mensaje claro.
- **Recomendación:** usar un nombre de ZIP sin versión fija (o generarlo en el script de H-02), mover la nota de la 1.1.0 al changelog (H-10) y añadir `"minimum_chrome_version": "102"` al manifiesto.
- **Esfuerzo estimado:** Bajo

### [H-09] Repositorio público sin `LICENSE`, `SECURITY.md` ni `CONTRIBUTING.md` — 🔵 Baja
- **Control:** LEG-05, DEP-08, DOC-06
- **Evidencia:** el inventario no encontró ninguno de los tres. El remoto es `github.com/carlosalbertoxw/HTTPSVerifier`.
- **Riesgo:** sin licencia, el código es "todos los derechos reservados" por defecto: nadie puede reutilizarlo ni contribuir con claridad legal. Sin `SECURITY.md`, quien encuentre una vulnerabilidad no tiene un canal privado para reportarla y puede abrir un issue público.
- **Recomendación:** elegir una licencia (decisión del autor; MIT es habitual en proyectos así) y añadir `LICENSE`. Crear un `SECURITY.md` breve y activar "Private vulnerability reporting" en GitHub. Un `CONTRIBUTING.md` de pocas líneas (cómo probar, convención de commits) es suficiente.
- **Esfuerzo estimado:** Bajo

### [H-10] Sin changelog ni tags; versión duplicada a mano — 🔵 Baja
- **Control:** DOC-08 / CI-04
- **Evidencia:** solo existe el tag `1.0.0` (sobre `3a58c18`, también en `origin`); las versiones 1.0.1, 1.2.0 y 1.3.0 no tienen tag. *Corrección: la primera versión de este informe decía que no había ningún tag.* La versión vive en `manifest.json:4` y en `package.json:3` y se sincroniza a mano (`28b419f` toca ambos).
- **Riesgo:** la Chrome Web Store no permite volver atrás: para revertir hay que republicar el código anterior con un número mayor. Sin tags no hay forma rápida y fiable de recuperar exactamente lo que se publicó.
- **Recomendación:** crear tags retroactivos (`v1.3.0` sobre `28b419f`) y uno por cada publicación, iniciar un `CHANGELOG.md` (formato Keep a Changelog) y añadir al CI una verificación de que ambas versiones coinciden.
- **Esfuerzo estimado:** Bajo

### [H-11] Sin política de privacidad publicada — 🔵 Baja
- **Control:** LEG-03
- **Evidencia:** la ficha promete *"no data collection, no tracking"* y el código lo respalda: no hay `fetch`, `XMLHttpRequest`, `sendBeacon` ni `WebSocket` en el repo. Pero no existe un documento de privacidad enlazable.
- **Riesgo:** bajo. La tienda puede exigirla para extensiones que leen el contenido de las páginas, y tenerla refuerza la confianza en una extensión con permisos amplios.
- **Recomendación:** añadir un `PRIVACY.md` corto (qué lee, que todo se procesa en local, qué guarda en `storage.local`/`storage.session` y que nada sale del navegador) y enlazarlo desde la ficha. Esto no es asesoría legal.
- **Esfuerzo estimado:** Bajo

### [H-12] El log de depuración incluye la URL completa — 🔵 Baja
- **Control:** WEB-05 · Sin información sensible en logs
- **Evidencia:** `page-check.js:27-30` escribe `` `could not inspect ${tab.url}` ``, mientras que `background.js:93-94` documenta la decisión de mostrar solo el origen porque la URL puede llevar query strings sensibles.
- **Riesgo:** mínimo, porque el log solo se ve en la consola local del service worker. Es una incoherencia con la propia política del proyecto.
- **Recomendación:** registrar `new URL(tab.url).origin`.
- **Esfuerzo estimado:** Bajo

### [H-13] Historial de commits con un commit "cajón de sastre" — 🔵 Baja
- **Control:** FUN-01
- **Evidencia:** `e1a1336 Se actualiza proyecto` modifica 19 archivos (+794/−119): i18n, refactor de `background.js`, popup nuevo, pruebas y recursos de la tienda a la vez. Los mensajes alternan español e inglés.
- **Riesgo:** dificulta entender o revertir un cambio concreto.
- **Recomendación:** commits pequeños por tema, en un solo idioma, y opcionalmente Conventional Commits (`feat:`, `fix:`), que además facilitan generar el changelog de H-10.
- **Esfuerzo estimado:** Bajo

### [H-14] Buenas prácticas destacables — ⚪ Informativa
- **Control:** varios
- **Evidencia:**
  - Cero dependencias y sin código remoto: no hay superficie de cadena de suministro.
  - Ninguna llamada de red, y `textContent` en lugar de `innerHTML` (`popup.js:8`, `74-78`).
  - Las notificaciones muestran solo el origen (`background.js:93-97`).
  - El estado efímero va en `storage.session` y se limpia al cerrar la pestaña (`background.js:47-49`).
  - Se retiró el permiso `tabs` en la 1.1.0.
  - Los ajustes y sus valores por defecto viven en un solo lugar (`settings.js`).
  - La i18n está completa: las 13 claves existen en los 4 locales y coinciden con las usadas en el código.
  - Se distingue "no se pudo revisar" de "sin problemas" (`page-check.js:26`, `popup.js:58-59`).
- **Recomendación:** mantenerlas al aplicar los cambios de H-03 a H-06.

## 4. Preguntas para el equipo

| Control | Pregunta |
|---------|----------|
| AUT-06 | ¿La cuenta de Google de la Chrome Web Store y la cuenta de GitHub tienen MFA, idealmente con passkey o llave física? Con permisos en todos los sitios, es el control que más protege a los usuarios. |
| ARQ-03 | ¿Se ha considerado el escenario "cuenta de desarrollador comprometida o venta de la extensión, seguida de una actualización maliciosa"? ¿Hay alguna medida, como verificar el ZIP publicado contra un tag? |
| FUN-02 | ¿`master` tiene protección de rama en GitHub, al menos contra force-push y borrado? |
| ARQ-02 | Para cambios como H-03, H-04 o H-05, que alteran qué se notifica y qué permisos se piden, ¿conviene escribir antes una nota breve de diseño (issue)? |
| DEP-06 | ¿Quién recibe y atiende los avisos de GitHub (Dependabot, escaneo de secretos) y los correos de políticas de la Chrome Web Store? |
| LEG-03 | ¿Qué se declaró en la pestaña "Privacy practices" del panel de la tienda sobre "Website content" y "Web history"? ¿Coincide con H-11? |

## 5. Plan de remediación

**Inmediato (antes de la próxima publicación):**
- H-01: arreglar `npm test` (un cambio de una línea).
- H-12: registrar solo el origen en `console.debug`.
- H-08: corregir el README y añadir `minimum_chrome_version`.
- Responder la pregunta AUT-06 y activar MFA si falta.

**Corto plazo (2 a 4 semanas):**
- H-02: workflow de CI con pruebas, ESLint y build del ZIP; CodeQL.
- H-10: tags retroactivos y `CHANGELOG.md`.
- H-09 y H-11: `LICENSE`, `SECURITY.md`, `PRIVACY.md`.

**Mediano plazo (siguiente versión funcional, 1.4.0):**
- H-03 y H-04: resultados separados por tipo, sin duplicados y con más cobertura de recursos, con sus traducciones.
- H-06: deduplicación por clave de pestaña y serializada.
- H-07: extraer la lógica pura y probarla, más un E2E con Puppeteer.
- H-05: evaluar `optional_host_permissions` + `activeTab`.
- H-13: convención de commits a partir de ahora.

## 6. Alcance y limitaciones

- **Revisado completo:** `manifest.json`, `package.json`, `background.js`, `page-check.js`, `insecure-url.js`, `settings.js`, `popup.html`, `popup.js`, `tests/insecure-url.test.js`, `README.md`, `_locales/en/messages.json` (las claves de los cuatro locales se compararon por script), `store-assets/description-en.txt` y el historial completo de Git (5 commits). No hizo falta muestrear.
- **No revisado:** el panel de la Chrome Web Store (declaraciones de privacidad, permisos aprobados, versión publicada realmente), la configuración del repositorio en GitHub y el comportamiento en ejecución en Chrome (no se cargó la extensión).
- **Comandos ejecutados:** `scripts/inventario.sh` de la skill, `npm test` (falla, ver H-01), `node --test tests/insecure-url.test.js` (9/9 pasan), `node --test` (pasa), `git log --stat`, `git remote -v`, comparación de claves de i18n con Node y búsqueda de APIs de red, `eval` e `innerHTML` en el código.
- Esta auditoría es un análisis estático del repositorio y no sustituye pruebas de penetración ni asesoría legal.

## 7. Seguimiento: correcciones aplicadas (2026-09-30)

Cambios hechos en el árbol de trabajo después de la auditoría. Aún no hay commit ni push.

Los tags `v1.0.1`, `v1.2.0` y `v1.3.0` son nuevos y solo existen en local; el tag `1.0.0` ya existía en `origin`.

| Hallazgo | Estado | Qué se hizo |
|----------|--------|-------------|
| H-01 | ✅ Resuelto | `"test": "node --test"` y `engines.node >=20`. `npm test` ejecuta 25 pruebas, todas pasan. |
| H-02 | ✅ Resuelto | `.github/workflows/ci.yml`: lint, pruebas, `npm audit`, comprobación de que el tag coincide con el manifiesto, build del ZIP como artefacto y GitHub Release en tags `v*`. También `codeql.yml`, `dependabot.yml`, ESLint 9 (`eslint.config.js`) y `.editorconfig`. `scripts/build.mjs` reemplaza la lista manual: es reproducible y falla si un archivo empaquetado referencia otro que no está en el paquete. |
| H-03 | ✅ Resuelto | Conteos separados para recursos, formularios y enlaces, con URLs únicas y sin `#fragmento`. En páginas HTTP se omite el mismo origen. Hay mensajes nuevos en los 4 idiomas. |
| H-04 | ✅ Resuelto | Ahora se detectan iframes y frames, multimedia, `poster`, `track`, `srcset`, `embed`/`object`, `input[type=image]`, iconos, preloads, manifest, `form[action]` y `formaction`. Se añadió Resource Timing (CSS `url()`, fuentes, recursos dinámicos) y `allFrames: true`. Los selectores se probaron en Chrome con una página de prueba. |
| H-05 | ✅ Resuelto | Ahora usa `optional_host_permissions` + `activeTab`. El popup pide el permiso con `chrome.permissions.request` al activar una notificación automática y lo libera al desactivar ambas. Si falta el permiso, el icono muestra una insignia "!" y el popup un botón para concederlo. El flujo se probó en el navegador con una API `chrome` simulada. Falta comprobar en una actualización real si los usuarios existentes conservan el acceso. |
| H-06 | ✅ Resuelto | Una clave de `storage.session` por pestaña y una cola que serializa el comprobar-y-guardar. |
| H-07 | ✅ Resuelto (unitarias) | La lógica pura se movió a `issues.js`. Pruebas nuevas para `inspectTab` con un `chrome` falso, la fusión de frames, `srcset`, la coherencia de i18n y la de versiones. El E2E con Puppeteer sigue pendiente. |
| H-08 | ✅ Resuelto | README actualizado y `minimum_chrome_version: "102"`. |
| H-09 | ✅ Resuelto (salvo GitHub) | `LICENSE` (MIT), `SECURITY.md` y `CONTRIBUTING.md` creados. Falta activar "Private vulnerability reporting" en GitHub, que es el canal al que apunta `SECURITY.md`. |
| H-10 | ✅ Resuelto | `CHANGELOG.md`, tags locales `v1.0.1`, `v1.2.0` y `v1.3.0` (sin push) y una prueba que exige la misma versión en `manifest.json` y `package.json`. |
| H-11 | ✅ Resuelto | `PRIVACY.md`, enlazado desde el README para usarlo como URL de la política en la tienda. |
| H-12 | ✅ Resuelto | Se registra solo el origen, y una prueba lo verifica. |
| H-13 | ➖ No se reescribe el historial | Convención documentada en `CONTRIBUTING.md` para los próximos commits. |

Las descripciones de la tienda (`store-assets/description-*.txt`) se actualizaron a la nueva cobertura. La versión no se subió: los cambios están en `Unreleased` del changelog y, al publicar, corresponde una 1.4.0.
