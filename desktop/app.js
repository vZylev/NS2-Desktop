'use strict';
const I18N = {
  en: {
    sessionReady: 'Session ready', session: 'Console session', sessionTools: 'Session tools', contentTools: 'NCA and system code', verifySession: 'Check session',
    help_session: 'Connect once. Browse console files, mount games, test reads and export data from this session.',
    retry: 'Retry', retryHint: 'Repeat the failed operation using the current session.',
    sessionReconnectNeeded: 'The console connection or native state could not be recovered. Reconnect the console before starting a new session.',
    retryUnknown: 'Checking whether the previous operation finished before retrying.',
    sessionVerified: 'The session is responding. Initial FS verification and restoration passed.',

    extract: 'Extract RomFS / ExeFS (OunceCake)', help_extract: 'Open the game’s internal files using OunceCake: base game, updates and DLC. Browse, export structure or extract all files to the PC.',
    extractHint: 'Scan games or enter a TitleID, mount the game, then extract its files. Preparing updates can take a long time. Extracted files go to this session’s extracted folder; structure reports go to inventories. Results preserve base/romfs, base/exefs, updates and dlc folders.',
    gameScan: 'Scan installed games', gameChoice: 'Installed game', gameId: 'TitleID to mount', gameMount: 'Mount game', gameExtract: 'Extract all files to PC', gameFiles: 'Mounted game',
    gameSelected: 'Mounted game: ', gameSelectFirst: 'Select a game and click Mount game.', gameScanDone: 'Games found: ',

    fileStructure: 'Export structure', structureHint: 'Export a recursive JSON inventory of SD, USER and SYSTEM, including sizes, available title labels and inaccessible paths. No file contents are downloaded.', structureIncomplete: 'Inventory saved with inaccessible or unscanned paths: ',

    browse: 'Explore console files', help_browse: 'Keep a session open to browse accessible SD, USER and SYSTEM folders and download individual files to this PC.',
    browserHint: 'Only accessible files are shown. Downloads are saved in this session’s downloads folder; use Open results to find them.',
    filePath: 'Console path', fileGo: 'Open folder', fileUp: 'Parent folder', fileFinish: 'Finish session', fileMore: 'Load more',
    fileDownload: 'Download to PC', fileWaiting: 'Waiting for the console browser…', fileBusy: 'Working…', fileSaved: 'Saved on this PC: ',
    browserNotReady: 'The console browser is not ready.', fileEmpty: 'Empty folder',

    checkSd: 'Check console SD support', checkingSd: 'Checking…',
    sdCheckHint: 'Checks this version and saved reports. Does not run a console write test.',
    sdNotImplemented: 'Direct export to the console SD is not implemented in this version.',
    sdCurrentDestination: 'Exports currently go to the computer over the network. The SD storage option selects the source game location, not the output destination.',
    sdObservedReadable: 'A saved session could access the SD content inventory.',
    sdObservedUnavailable: 'The SD content inventory was unavailable in the saved session. This does not prove that the card is absent.',
    sdNoObservation: 'No saved SD inventory result was found.',
    sdWriteUnknown: 'SD write permissions and free space remain unverified. Reading an inventory does not prove write access.',
    sdCheckFailed: 'Could not read the saved reports. No SD capability has been verified.',

    searchTitles: 'Search by name or TitleID', searchHint: 'Up to 50 matches. Check titles to add them; the selection is limited to 64.',
    noMatches: 'No matching titles. Import a name catalog or enter a TitleID above.', tooManyTitles: 'Select no more than 64 titles.',
    historyTitle: 'Session history', refreshHistory: 'Refresh', noHistory: 'No saved sessions yet.',
    openTitle: 'Open title folder', downloadLogs: 'Download logs ZIP', downloadingLogs: 'Preparing ZIP…',
    pending: 'Pending', interrupted: 'Interrupted / unknown outcome', historyUnavailable: 'Could not load session history.',
    enableNotifications: 'Enable desktop notifications', notificationsEnabled: 'Desktop notifications enabled.',
    notificationsUnavailable: 'Desktop notifications are unavailable or blocked. Completion notices still appear here.',
    finishedNotice: 'Session completed.', failedNotice: 'Session stopped with an error. Check the history and logs.',
    logsTooLarge: 'Logs exceed the 64 MiB ZIP limit. Open the results folder to collect them.', logsBusy: 'A ZIP is already being prepared.',
    invalidRun: 'The session folder is unavailable.',

    importCatalog: 'Import title names (JSON)', catalogHint: 'Local catalog: {"0100000000000000":"Game name"}. Importing replaces the previous catalog. Names are labels, not proof of installed content.',
    unknownTitle: 'Unknown name', catalogLoaded: 'Names in catalog', invalidCatalog: 'Invalid catalog. Use a JSON object mapping 16-digit TitleIDs to names (up to 20,000 entries).',
    subtitle: 'Console tools, one step at a time.', language: 'Language',
    setup: '01 / SETUP', operation: 'Connect your console', task: 'What would you like to do?',
    demo: 'Verify FS execution', inventory: 'List game titles', probe: 'Test game content reads', dump: 'Export NCA content', firmware: 'Capture system program code',
    help_demo: 'Run the four-stage demo and verify that the original FS instructions are restored.',
    help_inventory: 'List accessible base games, updates and DLC by title ID, version and storage.',
    help_probe: 'Read a small sample of every listed content file twice and compare the results.',
    help_dump: 'Export the selected content set in blocks with SHA-256 verification. This can take a long time.',
    help_firmware: 'Capture accessible system-program main and main.npdm files. This is not a full NAND backup. A previous marked firmware dump will be replaced.',
    host: "This computer's network address", network: 'Choose the address on the same network as your console.', noNetwork: 'No network address found',
    pairing: 'Consoles on your network', pairingSingle: 'One Switch — use 0,0,0,0',
    pairingSession: 'Multiple Switch consoles — use a session code',
    pairingHint: 'Choose one Switch to shorten the command. The first compatible connection using zeros is accepted; consoles are not counted automatically.',
    invalidPairing: 'Choose one Switch or multiple Switch consoles.',
    otherInstanceTitle: 'Another instance is open', otherInstanceStatus: 'Another instance detected',
    otherInstanceIdle: 'This window belongs to the executable you just opened. Close the other instance to start using this one.',
    otherInstanceBusy: 'The other instance is running a console operation. Wait until it finishes before replacing it.',
    otherInstanceUnknown: 'The previous instance could not be reached. Try activating this version; if the port is still occupied, close the previous application.',
    replaceInstance: 'Close the other instance and use this one', activateInstance: 'Activate this version',
    replacingInstance: 'Switching instances…', otherInstanceOpen: 'Close the other instance before starting a session here.',
    otherInstanceUnavailable: 'The previous instance could not be closed or its port is still occupied. Try again.',
    applicationClosing: 'This application is closing.', versionLabel: 'Version', previousVersion: 'Other instance',
    liveActivity: 'Live activity', wavesRecorded: 'Recorded iterations', lastAdvance: 'Seconds since last progress',
    supervisorAlive: 'Supervisor responding', supervisorQuiet: 'No recent supervisor signal',
    possibleStall: 'Possible stall', stallExplanation: 'No progress for at least 90 seconds. This may be a prolonged wait; a frozen console is not confirmed.',
    progress_phase: 'Working on', progress_connected: 'Acquisition process connected', progress_prepared: 'Prepared iteration',
    progress_wave: 'Iteration recorded', progress_retry: 'Retrying field measurement', progress_ready: 'Memory endpoint ready',
    progress_report: 'Saving local report', progress_error: 'Error reported',
    outcome_observed: 'measurement recorded', outcome_aborted: 'native abort control',
    outcome_timing: 'timing window not met', outcome_heap: 'allocation change detected',
    storage: 'Storage', allStorage: 'All available locations', internal: 'Internal storage (USER)', sd: 'SD card', cart: 'Game card',
    titleId: 'Title IDs', version: 'Version (optional)', titleHint: 'Enter up to 64 title IDs, separated by lines or commas. Duplicates are removed. Storage and optional decimal version apply to every title; leave version empty when versions differ.',
    start: 'Start a new session', requirements: 'Before you start',
    requirementsText: 'SmileBASIC 4.4.9 · System 23.0.1 · More than 20 MiB free in the SmileBASIC save. Keep the session open while using its tools.',
    download: 'Download bootstrap.bas', bootstrapHint: 'Enter this file in SmileBASIC slot 0 and save it as NS2. This is a one-time setup.',
    connect: '02 / CONNECT', consoleSteps: 'Continue on your console',
    step1: 'Open SmileBASIC and choose “Make a program”.', step2: 'Enter these commands separately, confirming the load:',
    memory: '“Out of memory” is expected. Enter REMOVE only once per application process.', step3: 'Start a PC session, then enter the connection command shown below:',
    commandPlaceholder: 'Your START command will appear here.', copy: 'Copy', copied: 'Copied',
    keepOpen: 'Keep SmileBASIC and this application open until the session finishes. Restart the console when you are done.',
    progress: '03 / PROGRESS', ready: 'Ready when you are', openResults: 'Open results', credits: 'Credits', local: 'Runs locally on your computer', quit: 'Close application',
    idle: 'Ready', starting: 'Starting', waiting: 'Waiting for console', running: 'Running', complete: 'Finished', failed: 'Stopped',
    stage1: '1/4 Checking the console', stage2: '2/4 Acquiring FS memory', stage3: '3/4 Starting the native helper', stage4: '4/4 Running the FS demo',
    missingSession: 'Open the application from NS2-Desktop.exe to restore this browser session.',
    disconnected: 'The local application is unavailable. Reopen NS2-Desktop.exe if it has closed.',
    closed: 'Application closed. You can close this browser tab.',
    genericError: 'The operation could not start. Check the address and title options.',
    failedHelp: 'The session stopped. Check the logs and whether Retry is available.',
    readonlyLog: 'Session logs are shown in their original language.',
    invalidHost: 'Choose an operation and an IPv4 address for this computer.', invalidTitle: 'Enter 1–64 title IDs with 16 hexadecimal digits each, separated by lines or commas.',
    invalidStorage: 'Choose a valid storage location.', invalidVersion: 'Use an unsigned decimal version number up to 4294967295.',
    alreadyActive: 'A session is active. Wait for it to finish.', invalidOrigin: 'Invalid request origin.'
  },
  es: {
    sessionReady: 'Sesión lista', session: 'Sesión de consola', sessionTools: 'Herramientas de la sesión', contentTools: 'NCA y código del sistema', verifySession: 'Comprobar sesión',
    help_session: 'Conectá una sola vez. Explorá archivos, montá juegos, probá lecturas y exportá datos desde esta sesión.',
    retry: 'Reintentar', retryHint: 'Repite la operación fallida usando la sesión actual.',
    sessionReconnectNeeded: 'No se pudo recuperar la conexión o el estado nativo. Reconectá la consola antes de iniciar una sesión nueva.',
    retryUnknown: 'Comprobando si terminó la operación anterior antes de reintentar.',
    sessionVerified: 'La sesión responde. La verificación inicial de FS y su restauración fueron correctas.',

    extract: 'Extraer RomFS / ExeFS (OunceCake)', help_extract: 'Abre los archivos internos del juego con OunceCake: juego base, actualizaciones y DLC. Permite explorar, exportar estructura o extraer todos los archivos a la PC.',
    extractHint: 'Buscá los juegos o ingresá un TitleID, montá el juego y extraé sus archivos. Preparar las actualizaciones puede tardar bastante. Los archivos se guardan en extracted y los reportes de estructura en inventories, dentro de la sesión. Se conservan las carpetas base/romfs, base/exefs, updates y dlc.',
    gameScan: 'Buscar juegos instalados', gameChoice: 'Juego instalado', gameId: 'TitleID para montar', gameMount: 'Montar juego', gameExtract: 'Extraer todos los archivos a la PC', gameFiles: 'Juego montado',
    gameSelected: 'Juego montado: ', gameSelectFirst: 'Elegí un juego y pulsá Montar juego.', gameScanDone: 'Juegos encontrados: ',

    fileStructure: 'Exportar estructura', structureHint: 'Guarda un inventario JSON recursivo de SD, USER y SYSTEM, con tamaños, títulos disponibles y rutas inaccesibles. No descarga el contenido de los archivos.', structureIncomplete: 'Inventario guardado con rutas inaccesibles o sin recorrer: ',

    browse: 'Explorar archivos de la consola', help_browse: 'Mantené una sesión abierta para explorar las carpetas accesibles de SD, USER y SYSTEM y descargar archivos a esta PC.',
    browserHint: 'Se muestran los archivos accesibles. Las descargas se guardan en la carpeta downloads de la sesión; usá Abrir resultados para encontrarlas.',
    filePath: 'Ruta en la consola', fileGo: 'Abrir carpeta', fileUp: 'Subir carpeta', fileFinish: 'Finalizar sesión', fileMore: 'Cargar más',
    fileDownload: 'Descargar a la PC', fileWaiting: 'Esperando el explorador de la consola…', fileBusy: 'Trabajando…', fileSaved: 'Guardado en esta PC: ',
    browserNotReady: 'El explorador de la consola todavía no está listo.', fileEmpty: 'Carpeta vacía',

    checkSd: 'Comprobar soporte de la SD de la consola', checkingSd: 'Comprobando…',
    sdCheckHint: 'Revisa esta versión y los informes guardados. No ejecuta una prueba de escritura en la consola.',
    sdNotImplemented: 'La exportación directa a la SD de la consola no está implementada en esta versión.',
    sdCurrentDestination: 'Actualmente se exporta al PC por red. La opción de almacenamiento SD selecciona dónde leer el juego, no dónde guardar la exportación.',
    sdObservedReadable: 'Una sesión guardada pudo acceder al inventario de contenidos de la SD.',
    sdObservedUnavailable: 'El inventario de la SD no estuvo disponible en la sesión guardada. Eso no demuestra que falte la tarjeta.',
    sdNoObservation: 'No se encontró un resultado guardado del inventario de la SD.',
    sdWriteUnknown: 'El permiso de escritura y el espacio libre de la SD siguen sin verificarse. Leer el inventario no demuestra permiso para escribir.',
    sdCheckFailed: 'No se pudieron leer los informes guardados. No se verificó ninguna capacidad de la SD.',

    searchTitles: 'Buscar por nombre o TitleID', searchHint: 'Hasta 50 coincidencias. Marcá títulos para agregarlos; el límite es de 64 seleccionados.',
    noMatches: 'No hay coincidencias. Importá un catálogo de nombres o escribí un TitleID arriba.', tooManyTitles: 'Seleccioná como máximo 64 títulos.',
    historyTitle: 'Historial de sesiones', refreshHistory: 'Actualizar', noHistory: 'Todavía no hay sesiones guardadas.',
    openTitle: 'Abrir carpeta del título', downloadLogs: 'Descargar logs ZIP', downloadingLogs: 'Preparando ZIP…',
    pending: 'Pendiente', interrupted: 'Interrumpido / resultado desconocido', historyUnavailable: 'No se pudo cargar el historial.',
    enableNotifications: 'Activar notificaciones de escritorio', notificationsEnabled: 'Notificaciones de escritorio activadas.',
    notificationsUnavailable: 'Notificaciones no disponibles o bloqueadas. Los avisos de finalización se mostrarán aquí.',
    finishedNotice: 'Sesión completada.', failedNotice: 'La sesión se detuvo con un error. Revisá el historial y los logs.',
    logsTooLarge: 'Los logs superan el límite de 64 MiB para ZIP. Abrí la carpeta de resultados para recopilarlos.', logsBusy: 'Ya se está preparando un ZIP.',
    invalidRun: 'La carpeta de la sesión no está disponible.',

    importCatalog: 'Importar nombres de títulos (JSON)', catalogHint: 'Catálogo local: {"0100000000000000":"Nombre del juego"}. Importar reemplaza el catálogo anterior. Los nombres son etiquetas; no confirman contenido instalado.',
    unknownTitle: 'Nombre desconocido', catalogLoaded: 'Nombres en el catálogo', invalidCatalog: 'Catálogo inválido. Usá un objeto JSON que relacione TitleIDs de 16 dígitos con nombres (hasta 20.000 entradas).',
    subtitle: 'Herramientas para tu consola, paso a paso.', language: 'Idioma',
    setup: '01 / PREPARACIÓN', operation: 'Conectá tu consola', task: '¿Qué querés hacer?',
    demo: 'Verificar ejecución en FS', inventory: 'Listar títulos de juegos', probe: 'Probar lectura de contenidos', dump: 'Exportar contenido NCA', firmware: 'Capturar código de programas del sistema',
    help_demo: 'Ejecuta la demostración de cuatro etapas y verifica la restauración de las instrucciones originales de FS.',
    help_inventory: 'Lista juegos base, actualizaciones y DLC accesibles por ID, versión y almacenamiento.',
    help_probe: 'Lee dos veces una pequeña muestra de cada archivo de contenido y compara los resultados.',
    help_dump: 'Exporta el conjunto seleccionado por bloques con verificación SHA-256. Puede tardar bastante.',
    help_firmware: 'Captura los archivos main y main.npdm accesibles del sistema. No es un respaldo completo de NAND. Reemplaza un volcado anterior marcado de firmware.',
    host: 'Dirección de red de esta computadora', network: 'Elegí la dirección que esté en la misma red que la consola.', noNetwork: 'No se encontró una dirección de red',
    pairing: 'Consolas en tu red', pairingSingle: 'Una sola Switch — usar 0,0,0,0',
    pairingSession: 'Varias Switch — usar un código de sesión',
    pairingHint: 'Elegí una sola Switch para acortar el comando. Se acepta la primera conexión compatible que use ceros; las consolas no se cuentan automáticamente.',
    invalidPairing: 'Elegí una sola Switch o varias Switch.',
    otherInstanceTitle: 'Hay otra instancia abierta', otherInstanceStatus: 'Otra instancia detectada',
    otherInstanceIdle: 'Esta ventana pertenece al ejecutable que acabás de abrir. Cerrá la otra instancia para empezar a usar esta.',
    otherInstanceBusy: 'La otra instancia está ejecutando una operación con la consola. Esperá a que termine antes de reemplazarla.',
    otherInstanceUnknown: 'No se pudo contactar la instancia anterior. Intentá activar esta versión; si el puerto sigue ocupado, cerrá la aplicación anterior.',
    replaceInstance: 'Cerrar la otra instancia y usar esta', activateInstance: 'Activar esta versión',
    replacingInstance: 'Cambiando de instancia…', otherInstanceOpen: 'Cerrá la otra instancia antes de iniciar una sesión acá.',
    otherInstanceUnavailable: 'No se pudo cerrar la instancia anterior o su puerto sigue ocupado. Volvé a intentarlo.',
    applicationClosing: 'Esta aplicación se está cerrando.', versionLabel: 'Versión', previousVersion: 'Otra instancia',
    liveActivity: 'Actividad en vivo', wavesRecorded: 'Iteraciones registradas', lastAdvance: 'Segundos desde el último avance',
    supervisorAlive: 'El supervisor responde', supervisorQuiet: 'Sin señal reciente del supervisor',
    possibleStall: 'Posible bloqueo', stallExplanation: 'Sin avances durante al menos 90 segundos. Puede ser una espera prolongada; no se confirma que la consola esté congelada.',
    progress_phase: 'Trabajando en', progress_connected: 'Proceso de adquisición conectado', progress_prepared: 'Iteración preparada',
    progress_wave: 'Iteración registrada', progress_retry: 'Reintentando medición del campo', progress_ready: 'Acceso a memoria preparado',
    progress_report: 'Guardando informe local', progress_error: 'Error informado',
    outcome_observed: 'medición registrada', outcome_aborted: 'control de aborto nativo',
    outcome_timing: 'ventana de sincronización no cumplida', outcome_heap: 'cambio de asignación detectado',
    storage: 'Almacenamiento', allStorage: 'Todas las ubicaciones disponibles', internal: 'Almacenamiento interno (USER)', sd: 'Tarjeta SD', cart: 'Cartucho',
    titleId: 'IDs de los títulos', version: 'Versión (opcional)', titleHint: 'Pegá hasta 64 TitleIDs, separados por líneas o comas. Se eliminan duplicados. El almacenamiento y la versión decimal opcional se aplican a todos; dejá la versión vacía si son distintas.',
    start: 'Iniciar una sesión nueva', requirements: 'Antes de empezar',
    requirementsText: 'SmileBASIC 4.4.9 · Sistema 23.0.1 · Más de 20 MiB libres en el guardado de SmileBASIC. Mantené la sesión abierta mientras uses las herramientas.',
    download: 'Descargar bootstrap.bas', bootstrapHint: 'Introducí este archivo en el slot 0 de SmileBASIC y guardalo como NS2. Solo se hace una vez.',
    connect: '02 / CONEXIÓN', consoleSteps: 'Continuá en la consola',
    step1: 'Abrí SmileBASIC y elegí «Make a program».', step2: 'Introducí estos comandos por separado y confirmá la carga:',
    memory: 'El mensaje «Out of memory» es esperado. Ejecutá REMOVE una sola vez por proceso de la aplicación.', step3: 'Iniciá una sesión en la PC e introducí el comando de conexión que aparece abajo:',
    commandPlaceholder: 'Tu comando START aparecerá acá.', copy: 'Copiar', copied: 'Copiado',
    keepOpen: 'Mantené SmileBASIC y esta aplicación abiertos hasta que termine la sesión. Reiniciá la consola al finalizar.',
    progress: '03 / PROGRESO', ready: 'Todo listo para empezar', openResults: 'Abrir resultados', credits: 'Créditos', local: 'Se ejecuta localmente en tu computadora', quit: 'Cerrar aplicación',
    idle: 'Listo', starting: 'Iniciando', waiting: 'Esperando a la consola', running: 'En ejecución', complete: 'Finalizado', failed: 'Detenido',
    stage1: '1/4 Comprobando la consola', stage2: '2/4 Obteniendo acceso a memoria de FS', stage3: '3/4 Iniciando el auxiliar nativo', stage4: '4/4 Ejecutando la demostración de FS',
    missingSession: 'Abrí la aplicación desde NS2-Desktop.exe para recuperar esta sesión del navegador.',
    disconnected: 'La aplicación local no está disponible. Volvé a abrir NS2-Desktop.exe si se cerró.',
    closed: 'Aplicación cerrada. Ya podés cerrar esta pestaña.',
    genericError: 'No se pudo iniciar la operación. Revisá la dirección y las opciones del título.',
    failedHelp: 'La sesión se detuvo. Revisá los registros y el estado del botón Reintentar.',
    readonlyLog: 'Los registros de sesión se muestran en su idioma original.',
    invalidHost: 'Elegí una operación y una dirección IPv4 de esta computadora.', invalidTitle: 'Ingresá de 1 a 64 TitleIDs de 16 dígitos hexadecimales, separados por líneas o comas.',
    invalidStorage: 'Elegí una ubicación de almacenamiento válida.', invalidVersion: 'Usá una versión decimal sin signo de hasta 4294967295.',
    alreadyActive: 'Hay una sesión activa. Esperá a que termine.', invalidOrigin: 'Origen de solicitud inválido.'
  }
};

function progressText(event, language) {
  const text = I18N[language] || I18N.en;
  const keys = {detail: 'liveActivity', phase: 'progress_phase', connected: 'progress_connected', prepared: 'progress_prepared',
    wave: 'progress_wave', retry: 'progress_retry', 'memory-ready': 'progress_ready', report: 'progress_report', error: 'progress_error'};
  const outcomes = {observed: 'outcome_observed', aborted: 'outcome_aborted', 'timing-miss': 'outcome_timing', 'heap-drift': 'outcome_heap'};
  return (text[keys[event.kind]] || event.kind) + (event.profile ? ': ' + event.profile : '') +
    (outcomes[event.outcome] ? ' · ' + text[outcomes[event.outcome]] : '') + (event.message ? ': ' + event.message : '');
}
if (typeof module !== 'undefined') module.exports = {I18N, progressText};
if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  let lang = localStorage.getItem('ns2-language') === 'es' ? 'es' : 'en';
  $('pairing').value = localStorage.getItem('ns2-pairing') === 'session' ? 'session' : 'single';
  let token = location.hash.slice(1) || sessionStorage.getItem('ns2-token') || '';
  if (token) sessionStorage.setItem('ns2-token', token);
  history.replaceState(null, '', location.pathname + location.search);
  let current = {status: 'idle', stage: '', command: '', active: false}, after = 0, started = null, stopped = false;
  let uiError = '', connectionError = false, takeoverBusy = false, polling = false;
  let catalog = {}, historyRuns = [], historyLoading = false, sdResult = null;
  const t = key => I18N[lang][key] || key;
  function renderLanguage() {
    document.documentElement.lang = lang; $('language').value = lang;
    document.querySelectorAll('[data-i18n]').forEach(element => {element.textContent = t(element.dataset.i18n);});
    $('mode-help').textContent = t('help_' + $('mode').value);
    renderState(); renderTitles(); renderHistory(); renderSdSupport();
  }
  function renderState() {
    $('status').textContent = t(current.standby ? 'otherInstanceStatus' : current.progress?.stalled ? 'possibleStall' : current.status);
    $('status').dataset.state = current.progress?.stalled ? 'stalled' : current.status;
    const stage = current.stage.match(/^([1-4])\/4/);
    $('stage').textContent = current.toolsReady && current.active ? t(current.toolsBusy ? 'liveActivity' : 'sessionReady') : stage ? t('stage' + stage[1]) : t(current.status === 'idle' ? 'ready' : current.status);
    $('command').textContent = current.command || t('commandPlaceholder'); $('copy').disabled = !current.command;
    const blocked = current.active || current.standby || !current.appVersion || connectionError;
    $('start').disabled = blocked;
    document.querySelectorAll('#form input,#form select,#form textarea').forEach(element => {element.disabled = blocked;});
    $('quit').disabled = current.active || takeoverBusy;
    $('session-retry').hidden = current.status !== 'failed';
    $('session-retry').disabled = !current.canRetrySession || connectionError;
    $('session-retry-hint').textContent = current.status === 'failed' && !current.canRetrySession ? t('sessionReconnectNeeded') : '';
    $('instance-notice').hidden = !current.standby;
    const previous = current.previousInstance;
    $('instance-details').textContent = t(previous ? previous.active ? 'otherInstanceBusy' : 'otherInstanceIdle' : 'otherInstanceUnknown') +
      (previous?.appVersion ? ' ' + t('previousVersion') + ': ' + previous.appVersion + ' · ' + previous.buildId : '');
    $('takeover').disabled = takeoverBusy || current.takingOver || !!previous?.active;
    $('takeover').textContent = t(takeoverBusy ? 'replacingInstance' : previous ? 'replaceInstance' : 'activateInstance');
    $('build-info').textContent = current.appVersion ? t('versionLabel') + ' ' + current.appVersion + ' · ' + current.buildId : '';
    $('error').hidden = current.status !== 'failed' && !uiError;
    $('error').textContent = current.status === 'failed' ? t('failedHelp') : uiError;
    $('result-path').textContent = current.runFolder || current.dataRoot || '';
    const progress = current.progress;
    $('live-progress').hidden = !(progress?.events?.length) || current.standby;
    $('progress-count').textContent = t('wavesRecorded') + ': ' + (progress?.waves || 0);
    $('progress-age').textContent = progress?.idleSeconds === null || !progress ? '' :
      t('lastAdvance') + ': ' + progress.idleSeconds + (current.active ?
        ' · ' + t(progress.supervisorResponsive ? 'supervisorAlive' : 'supervisorQuiet') : '');
    $('activity-feed').replaceChildren(...(progress?.events || []).map(event => {
      const item = document.createElement('li');
      item.textContent = new Date(event.at).toLocaleTimeString(lang === 'es' ? 'es-AR' : 'en-GB') + ' — ' + namedLine(progressText(event, lang));
      return item;
    }));
    $('stall-warning').hidden = !progress?.stalled;
    $('stall-warning').textContent = t('stallExplanation');
  }
  let browserBusy = false, browserReady = false, browserStarted = null, fileNext = null, listedPath = '/', listedSource = 'sd', gameMounted = false;
  let remoteBusy = false, retryable = false, pendingRetry = null;
  function browserControls() {
    for (const id of ['file-source', 'file-path', 'file-go', 'file-up', 'file-finish', 'file-more', 'file-structure'])
      $(id).disabled = browserBusy || remoteBusy || !browserReady || ($('file-source').value === 'game' && !gameMounted && !['file-finish', 'file-source'].includes(id));
    for (const id of ['game-scan', 'game-choice', 'game-id', 'game-mount', 'game-extract'])
      $(id).disabled = browserBusy || remoteBusy || !browserReady || (id === 'game-extract' && !gameMounted);
    document.querySelectorAll('.session-operation,#session-tools input,#session-tools select,#session-tools textarea,#session-tools button').forEach(element => {element.disabled = browserBusy || remoteBusy || !browserReady;});
    $('file-retry').hidden = !retryable && !pendingRetry;
    $('file-retry').disabled = browserBusy || remoteBusy || !browserReady;
    $('file-entries').querySelectorAll('button').forEach(button => {button.disabled = browserBusy || remoteBusy || !browserReady;});
  }
  async function browserAction(input) {
    const response = await fetch('/api/browser', {method: 'POST',
      headers: {authorization: 'Bearer ' + token, 'Content-Type': 'application/json'}, body: JSON.stringify(input)});
    const value = await response.json();
    if (!response.ok || value.error) throw Object.assign(Error(I18N[lang][value.error] || value.error || t('genericError')), {retryable: value.retryable === true, responded: true, busy: !!value.busy});
    return value;
  }
  async function runOperation(input) {
    if (browserBusy || remoteBusy || !browserReady) return;
    browserBusy = true; retryable = false; pendingRetry = null; browserControls();
    $('file-status').textContent = t('fileBusy'); $('file-retry-hint').textContent = '';
    input = {...input, requestId: input.requestId || crypto.randomUUID()};
    try {
      const value = await browserAction(input);
      const request = value.retriedRequest || input, action = request.action;
      if (action === 'finish') {browserReady = false; $('file-status').textContent = t('finishedNotice'); return;}
      if (action === 'games') {
        $('game-choice').replaceChildren(...value.games.map(game => new Option((game.name || t('unknownTitle')) + ' — ' + game.title, game.title)));
        if (value.games.length) $('game-id').value = value.games[0].title;
        $('file-status').textContent = t('gameScanDone') + value.games.length;
      } else if (action === 'select') {
        gameMounted = true; $('game-selected').textContent = t('gameSelected') + (value.selected.name || value.selected.title);
        $('file-source').value = 'game'; $('file-path').value = '/'; $('file-entries').replaceChildren(); $('file-more').hidden = true;
        $('file-status').textContent = t('gameSelected') + (value.selected.name || value.selected.title);
      } else if (action === 'list') {
        listedPath = request.path; listedSource = request.source; $('file-source').value = listedSource; $('file-path').value = listedPath;
        if (!request.append) $('file-entries').replaceChildren();
        for (const entry of value.entries) {
          const row = document.createElement('p'), button = document.createElement('button');
          const childPath = listedPath.replace(/\/$/, '') + '/' + entry.name, source = listedSource;
          const directory = entry.type === 0;
          row.append(document.createTextNode(entry.name + ' · ' + (directory ? '📁' : BigInt(entry.size).toLocaleString() + ' bytes') + ' '));
          button.textContent = t(directory ? 'fileGo' : 'fileDownload');
          button.addEventListener('click', () => runOperation({action: directory ? 'list' : 'download', source, path: childPath}));
          row.append(button); $('file-entries').append(row);
        }
        fileNext = value.next; $('file-more').hidden = fileNext === null;
        $('file-status').textContent = !value.entries.length && !request.append ? t('fileEmpty') : listedSource + ':' + listedPath;
      } else if (action === 'verify') $('file-status').textContent = t('sessionVerified');
      else $('file-status').textContent = t(value.complete === false ? 'structureIncomplete' : 'fileSaved') + (value.directory || value.file || '');
      loadHistory();
    } catch (error) {
      retryable = error.retryable === true;
      if (!error.responded || error.busy) pendingRetry = input;
      $('file-status').textContent = error.message;
      $('file-retry-hint').textContent = t(pendingRetry ? 'retryUnknown' : retryable ? 'retryHint' : 'sessionReconnectNeeded');
    } finally {browserBusy = false; browserControls();}
  }
  function fileAction(action, filename, append = false) {
    return runOperation({action, source: append ? listedSource : $('file-source').value,
      path: filename, offset: append ? fileNext : 0, append});
  }
  $('game-scan').addEventListener('click', () => runOperation({action: 'games'}));
  $('game-mount').addEventListener('click', () => runOperation({action: 'select', title: $('game-id').value.trim()}));
  $('game-choice').addEventListener('change', () => {$('game-id').value = $('game-choice').value;});
  $('game-extract').addEventListener('click', () => fileAction('extract-all'));
  $('file-retry').addEventListener('click', () => runOperation(pendingRetry || {action: 'retry'}));
  document.querySelectorAll('.session-operation').forEach(button => button.addEventListener('click', () => runOperation({
    action: button.dataset.action, title: $('title').value, storage: $('storage').value, version: $('version').value})));
  $('file-source').addEventListener('change', () => {
    $('file-path').value = '/'; $('file-entries').replaceChildren(); $('file-more').hidden = true;
    browserControls();
    if ($('file-source').value !== 'game' || gameMounted) fileAction('list', '/');
  });
  $('file-go').addEventListener('click', () => fileAction('list', $('file-path').value));
  $('file-up').addEventListener('click', () => {
    $('file-source').value = listedSource;
    fileAction('list', listedPath.replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/');
  });
  $('file-more').addEventListener('click', () => fileAction('list', listedPath, true));
  $('file-structure').addEventListener('click', () => fileAction('structure'));
  $('file-finish').addEventListener('click', () => fileAction('finish'));
  async function pollBrowser() {
    $('file-browser').hidden = !['browse', 'extract', 'session'].includes(current.mode);
    $('game-extraction').hidden = !['extract', 'session'].includes(current.mode);
    $('raw-browser-hint').hidden = $('file-source').value === 'game';
    for (const option of $('file-source').options) {
      option.hidden = current.mode === 'session' ? false : current.mode === 'extract' ? option.value !== 'game' : option.value === 'game';
      option.disabled = option.hidden;
    }
    if (!['browse', 'extract', 'session'].includes(current.mode) || !current.active) {browserReady = false; browserControls(); return;}
    const result = await api('browser?details=1'); browserReady = result.ready; remoteBusy = !!result.busy;
    gameMounted = !!result.selected;
    if (result.selected) $('game-selected').textContent = t('gameSelected') + (result.selected.name || result.selected.title);
    if (!browserBusy) {
      retryable = !!result.retryable;
      if (result.lastError) $('file-retry-hint').textContent = t(result.retryable ? 'retryHint' : 'sessionReconnectNeeded');
    }
    browserControls();
    if (!browserReady) {if (!browserBusy) $('file-status').textContent = t('fileWaiting'); return;}
    if (browserStarted !== current.started) {
      browserStarted = current.started; retryable = !!result.retryable; pendingRetry = null; $('file-entries').replaceChildren();
      if (!result.selected) $('game-selected').textContent = ''; $('game-choice').replaceChildren(); $('game-id').value = result.selected?.title || '';
      $('file-more').hidden = true;
      $('file-source').value = current.mode === 'extract' || result.selected ? 'game' : 'sd';
      if (result.lastError) {
        $('file-status').textContent = result.lastError; $('file-retry-hint').textContent = t(result.retryable ? 'retryHint' : 'sessionReconnectNeeded');
      } else if (remoteBusy) $('file-status').textContent = t('fileBusy');
      else if (current.mode === 'extract' && !gameMounted) $('file-status').textContent = t('gameSelectFirst');
      else await fileAction('list', '/');
      browserControls();
    }
  }
  function namedLine(line) {
    return line.replace(/(?:0x)?[0-9a-f]{16}(?![0-9a-f])/gi, (id, offset, text) => {
      if (offset && /[0-9a-f]/i.test(text[offset - 1])) return id;
      const name = catalog[id.replace(/^0x/i, '').toLowerCase()];
      return name ? name + ' — ' + id : id;
    });
  }
  function renderTitles() {
    const ids = [...new Set($('title').value.trim().split(/[\s,;]+/).filter(id => /^(?:0x)?[0-9a-f]{16}$/i.test(id))
      .map(id => id.replace(/^0x/i, '').toLowerCase()))].slice(0, 64);
    $('title-preview').replaceChildren(...ids.map(id => {
      const li = document.createElement('li'); li.textContent = (catalog[id] || t('unknownTitle')) + ' — ' + id; return li;
    }));
    $('catalog-status').textContent = t('catalogLoaded') + ': ' + Object.keys(catalog).length;
    renderSearch(ids);
  }
  function renderSearch(selected) {
    const term = $('title-search').value.trim().toLocaleLowerCase();
    const ids = [...new Set([...selected, ...Object.keys(catalog)])].filter(id =>
      id.includes(term) || (catalog[id] || '').toLocaleLowerCase().includes(term)).slice(0, 50);
    $('title-search-results').replaceChildren(...ids.map(id => {
      const label = document.createElement('label'), box = document.createElement('input');
      box.type = 'checkbox'; box.value = id; box.checked = selected.includes(id);
      box.disabled = browserBusy || remoteBusy || !browserReady || !!current.standby || connectionError;
      box.addEventListener('change', () => {
        const next = selected.filter(value => value !== id);
        if (box.checked) next.push(id);
        if (next.length > 64) {box.checked = false; showError(t('tooManyTitles')); return;}
        $('title').value = next.join('\n'); renderTitles();
      });
      label.append(box, document.createTextNode((catalog[id] || t('unknownTitle')) + ' — ' + id));
      return label;
    }));
    if (!ids.length) $('title-search-results').textContent = t('noMatches');
  }
  $('title-search').addEventListener('input', renderTitles);
  $('title').addEventListener('input', renderTitles);
  $('catalog-file').addEventListener('change', async () => {
    const file = $('catalog-file').files[0]; if (!file) return;
    try {
      if (file.size > 4 * 1024 * 1024) throw Error(t('invalidCatalog'));
      let value; try {value = JSON.parse(await file.text());} catch {throw Error(t('invalidCatalog'));}
      await api('catalog', value); catalog = await api('catalog'); renderTitles(); renderHistory();
    } catch (error) {showError(error.message);}
    finally {$('catalog-file').value = '';}
  });
  function renderSdSupport() {
    if (!sdResult) return;
    const messages = [t('sdNotImplemented'), t('sdCurrentDestination'),
      t(sdResult.observation ? sdResult.observation.inventoryAvailable ? 'sdObservedReadable' : 'sdObservedUnavailable' : 'sdNoObservation')];
    if (sdResult.observation) messages.push(sdResult.observation.run + ' · ' + String(sdResult.observation.recordedAt));
    messages.push(t('sdWriteUnknown'));
    $('sd-support-result').replaceChildren(...messages.map(text => {
      const p = document.createElement('p'); p.textContent = text; return p;
    }));
    $('sd-support-result').hidden = false;
  }
  $('check-sd').addEventListener('click', async () => {
    $('check-sd').disabled = true; $('check-sd').textContent = t('checkingSd');
    try {sdResult = await api('sd-support'); renderSdSupport();}
    catch {sdResult = null; $('sd-support-result').hidden = false; $('sd-support-result').textContent = t('sdCheckFailed');}
    finally {$('check-sd').disabled = false; $('check-sd').textContent = t('checkSd');}
  });
  function renderHistory() {
    $('history-runs').replaceChildren(...historyRuns.map(run => {
      const section = document.createElement('details'), summary = document.createElement('summary');
      summary.textContent = new Date(run.started).toLocaleString(lang === 'es' ? 'es-AR' : 'en-GB') +
        ' · ' + (run.mode ? t(run.mode) + ' · ' : '') + t(run.status) + ' · ' + run.id;
      section.append(summary);
      const zip = document.createElement('button'); zip.textContent = t('downloadLogs');
      zip.addEventListener('click', async () => {
        zip.disabled = true; zip.textContent = t('downloadingLogs');
        try {
          const response = await fetch('/api/logs?run=' + encodeURIComponent(run.id), {
            headers: {authorization: 'Bearer ' + token}, signal: AbortSignal.timeout(60000)});
          if (!response.ok) {const value = await response.json(); throw Error(t(value.error));}
          const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
          link.href = url; link.download = run.id + '-logs.zip'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (error) {showError(error.message);}
        finally {zip.disabled = false; zip.textContent = t('downloadLogs');}
      });
      section.append(zip);
      for (const entry of run.titles) {
        const row = document.createElement('div'), text = document.createElement('p'), open = document.createElement('button');
        text.textContent = (catalog[entry.title] || t('unknownTitle')) + ' — ' + entry.title + ' · ' + t(entry.status);
        if (entry.error) text.textContent += ' · ' + entry.error;
        open.textContent = t('openTitle'); open.disabled = entry.status === 'pending';
        open.addEventListener('click', () => api('open-title', {id: run.id, title: entry.title}).catch(error => showError(error.message)));
        row.append(text, open); section.append(row);
      }
      return section;
    }));
  }
  async function loadHistory() {
    if (historyLoading || stopped) return;
    historyLoading = true; $('refresh-history').disabled = true;
    try {
      const data = await api('history'); historyRuns = data.runs; renderHistory();
      $('history-status').textContent = data.error ? t('historyUnavailable') + ' ' + data.error : historyRuns.length ? '' : t('noHistory');
    } catch { $('history-status').textContent = t('historyUnavailable'); }
    finally {historyLoading = false; $('refresh-history').disabled = false;}
  }
  $('refresh-history').addEventListener('click', loadHistory);
  $('enable-notifications').addEventListener('click', async () => {
    try {
      const granted = 'Notification' in window && await Notification.requestPermission() === 'granted';
      $('notification-status').textContent = t(granted ? 'notificationsEnabled' : 'notificationsUnavailable');
    } catch {$('notification-status').textContent = t('notificationsUnavailable');}
  });
  function completionNotice(next) {
    if (next.active && next.started !== current.started) $('completion-notice').hidden = true;
    if (!current.active || next.active || next.started !== current.started || !['complete', 'failed'].includes(next.status)) return;
    const message = t(next.status === 'complete' ? 'finishedNotice' : 'failedNotice');
    $('completion-notice').textContent = message; $('completion-notice').hidden = false;
    document.title = message + ' — NS2 Desktop';
    if ('Notification' in window && Notification.permission === 'granted') {
      try {new Notification('NS2 Desktop', {body: message, tag: 'ns2-' + next.started});} catch {}
    }
    loadHistory();
  }
  async function api(route, body) {
    const response = await fetch('/api/' + route, {method: body === undefined ? 'GET' : 'POST',
      headers: {authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(route.startsWith('state?') ? 5000 : 15000)});
    const value = await response.json();
    if (!response.ok) throw Error(I18N[lang][value.error] || t('genericError'));
    return value;
  }
  function showError(message) {uiError = message; $('error').hidden = false; $('error').textContent = message;}
  function modeChange() {$('mode-help').textContent = t('help_session');}
  $('language').addEventListener('change', () => {lang = $('language').value; uiError = ''; localStorage.setItem('ns2-language', lang); renderLanguage();});
  $('mode').addEventListener('change', modeChange);
  $('pairing').addEventListener('change', () => localStorage.setItem('ns2-pairing', $('pairing').value));
  $('session-retry').addEventListener('click', async () => {
    try {await api('retry', {}); await poll();} catch (error) {showError(error.message);}
  });
  $('form').addEventListener('submit', async event => {
    event.preventDefault(); uiError = ''; $('start').disabled = true;
    try {
      await api('start', {mode: $('mode').value, host: $('host').value, title: $('title').value.trim(),
        storage: $('storage').value, version: $('version').value.trim(), pairing: $('pairing').value, language: lang});
      await poll();
    } catch (error) {showError(t('genericError') + ' ' + error.message); renderState();}
  });
  $('copy').addEventListener('click', async () => {
    try {await navigator.clipboard.writeText(current.command); $('copy').textContent = t('copied');}
    catch {const range = document.createRange(); range.selectNodeContents($('command')); getSelection().removeAllRanges(); getSelection().addRange(range);}
  });
  $('output').addEventListener('click', () => api('output', {}).catch(error => showError(error.message)));
  $('bootstrap').addEventListener('click', async () => {
    try {
      const response = await fetch('/api/bootstrap', {headers: {authorization: 'Bearer ' + token}});
      if (!response.ok) throw Error(t('missingSession'));
      const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
      link.href = url; link.download = 'bootstrap.bas'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {showError(error.message);}
  });
  $('quit').addEventListener('click', async () => {
    try {await api('quit', {}); stopped = true; $('stage').textContent = t('closed'); $('start').disabled = true; $('quit').disabled = true;}
    catch (error) {showError(error.message);}
  });
  $('takeover').addEventListener('click', async () => {
    takeoverBusy = true; uiError = ''; renderState();
    try {
      const result = await api('takeover', {});
      stopped = true;
      location.replace(result.url);
    } catch (error) {showError(error.message);}
    finally {takeoverBusy = false; renderState();}
  });
  async function poll() {
    if (stopped || polling) return;
    polling = true;
    try {
      const next = await api('state?after=' + after);
      if (connectionError) {uiError = ''; connectionError = false;}
      if (next.started !== started) {started = next.started; $('log').textContent = '';}
      if (next.lines.length) {
        const nearBottom = $('log').scrollHeight - $('log').scrollTop - $('log').clientHeight < 60;
        $('log').textContent = ($('log').textContent + next.lines.map(line => namedLine(line.text) + '\n').join('')).split('\n').slice(-600).join('\n');
        after = next.lines.at(-1).id;
        if (nearBottom) $('log').scrollTop = $('log').scrollHeight;
      }
      const host = $('host').value, available = next.addresses;
      if ([...$('host').options].map(option => option.value).join(',') !== available.join(',') || !$('host').options.length) {
        $('host').replaceChildren(...available.map(address => new Option(address, address)));
        if (available.includes(host)) $('host').value = host;
        if (!available.length) $('host').add(new Option(t('noNetwork'), ''));
      }
      completionNotice(next); current = next; renderState(); await pollBrowser();
    } catch {connectionError = true; showError(t(token ? 'disconnected' : 'missingSession')); renderState();}
    finally {polling = false;}
  }
  renderLanguage(); modeChange();
  api('catalog').then(value => {catalog = value; renderTitles(); renderHistory();}).catch(error => showError(error.message));
  poll(); loadHistory(); setInterval(poll, 1000);
}
