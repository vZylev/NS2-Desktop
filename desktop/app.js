'use strict';
const I18N = {
  en: {
    cancelWaiting: 'Cancel connection wait',
    updateInvalidAction: "Invalid update operation.",
    updateChecksumMismatch: "The download was incomplete or its checksum differed. The partial package was removed.",
    updateSizeMismatch: "The downloaded size differs from the release metadata.",
    updateMissingPackage: "No matching release package is available.",
    updateTooLarge: "The update response exceeds the allowed size.",
    updateNetworkError: "Could not reach the release service. Check your connection and try again.",
    updateInvalidChecksums: "The release checksum list is missing or invalid.",
    updateInvalidRelease: "The release metadata is invalid.",
    updateBusy: "An update operation is still running. Wait for it to finish.",
    updateFailed: "The update could not be completed.",
    updateDownloaded: "Download verified. Finish your session before installing.",
    updateDownloading: "Downloading…",
    updateAvailable: "New version available:",
    updateCurrent: "You are using the latest available stable version or a newer build.",
    updateChecking: "Checking releases…",
    updateUnchecked: "Updates have not been checked.",
    updateOpen: "Open download folder",
    updateDownload: "Download verified package",
    updateFormat: "Package format",
    updateCheck: "Check for updates",
    updateHelp: "Check for a stable release for this computer. Downloads are verified against the release SHA-256 checksums. Finish your session before installing the downloaded package; the running application is not replaced automatically.",
    updateTitle: "Application updates",
    recoveryConsole: "The console workflow has started. Keep the logs and restart the console before another session. Previously exported files remain on the PC.",
    recoveryConnection: "Connection has not started. Check the chosen LAN address and console network, then retry. If you already entered RUN or REMOVE manually, restart the console first.",
    autoLogError: "Could not save the USB log:",
    autoWaiting: "Waiting",
    autoDiagnostic: "USB diagnostics",
    autoCommandsUsed: "The commands have already been attempted in this session.",
    autoCommandsPending: "Start a session, check USB and confirm the console is ready.",
    autoInvalidSession: "There is no fresh waiting session available for USB commands. Start a new session after restarting the console.",
    autoCommandsRestart: "Command transfer stopped. Restart the console and start a new session before another attempt. Do not repeat REMOVE in the current process.",
    autoCommandsFinished: "Commands sent. Check the console; connection and verification continue separately.",
    autoCommandProgress: "Commands sent",
    autoWait: "Pause between commands",
    autoCommandsStart: "Send connection commands",
    autoCommandsConfirm: "I restarted the console, opened SmileBASIC at the command entry, have not entered RUN or REMOVE, and selected US English USB keyboard layout.",
    autoCommandsHelp: "Start a PC session and check USB first. Sends LOAD, its confirmation, RUN, REMOVE and this session’s START. Use the NS2 Desktop bootstrap saved as NS2 in slot 0.",
    autoCommandsTitle: "Send connection commands by USB",
    autoOpenLogs: "Open USB logs",
    sessionReady: 'Session ready', session: 'Console session', sessionTools: 'Session tools', contentTools: 'NCA and system code', verifySession: 'Check session',
    help_session: 'Connect once. Browse console files, mount games, test reads and export data from this session.',
    retry: 'Retry', retryHint: 'Repeat the failed operation using the current session.',
    sessionReconnectNeeded: 'The console connection or native state could not be recovered. Reconnect the console before starting a new session.',
    retryUnknown: 'Checking whether the previous operation finished before retrying.',
    sessionVerified: 'The session is responding. Initial FS verification and restoration passed.',

    extract: 'Extract RomFS / ExeFS (OunceCake)', help_extract: 'Open the game’s internal files using OunceCake: base game, updates and DLC. Browse, export structure or extract all files to the PC.',
    extractHint: 'Scan games or enter a TitleID, mount the game, then extract its files. Preparing updates can take a long time. Extracted files go to this session’s extracted folder; structure reports go to inventories. Results preserve base/romfs, base/exefs, updates and dlc folders.',
    gameScan: 'Scan installed games', gameChoice: 'Installed game', gameId: 'TitleID to mount', gameMount: 'Mount game', gameExtract: 'Extract to PC', gameFiles: 'Mounted game',
    gameSelected: 'Mounted game: ', gameSelectFirst: 'Select a game and click Mount game.', gameScanDone: 'Games found: ',

    gameExtractDlc: 'Specific DLC only', gameDlcChoice: 'DLC and version', gameDlcNone: 'No DLC available',
    gameExtractBase: 'Base only (no updates or DLC)', gameExtractUpdate: 'Specific updated version (base + update)',
    gameUpdateVersion: 'Mounted update version', gameUpdateNone: 'No update available', gameUpdateHint: 'Exports only this version’s combined RomFS / ExeFS, without a separate base copy or DLC. This is not a standalone patch.',
    gameExtractMode: 'Files to extract', gameExtractLatest: 'Updated game (recommended)', gameExtractAll: 'All versions: base and updates',
    gameExtractHint: 'Recommended exports the newest mounted base + update view plus DLC, or the base if no update is mounted. Base only and specific version exclude DLC. All versions includes every mounted view.',
    gamePartial: 'Some additional updates could not be mounted. Available files can still be extracted; affected exports will be marked partial. Unavailable: ',
    extractionIncomplete: 'Partial extraction saved; see extraction.json for unavailable updates: ',
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
    autoTitle: "USB typing", autoIntro: "Optional USB typing for compatible Apple Silicon Macs. Type the bootstrap once, then use the connection controls to send the current session commands.",
    autoDriverNote: 'Requires a compatible usbgadget driver already installed, approved and loaded. The upstream driver may require changes to SIP/startup security that reduce Mac protection. NS2 Desktop does not install it or change those settings.',
    autoDriverGuide: 'USB driver and hardware requirements', autoSteps: 'Connect a USB data cable to the console. Open SmileBASIC → Make a program with an empty editor in slot 0. Set the console USB keyboard layout to US English. Typing can take several minutes.',
    autoController: 'USB controller', autoDetect: 'Automatic', autoSpeed: 'Typing speed', autoNormal: 'Normal (50 ms)', autoSlow: 'Slow (100 ms)', autoVerySlow: 'Very slow (200 ms)',
    autoConfirm: 'The console editor is empty and its USB keyboard layout is US English.', autoCheck: 'Check driver', autoStart: 'Type bootstrap', autoStop: 'Stop typing', autoLines: 'Lines sent:', autoLineUnit: 'lines',
    autoUnsupported: 'USB autotyping is available only in the Apple Silicon macOS build. This method does not support Windows, Linux or Intel Macs.',
    autoUnchecked: 'Check the driver before typing.', autoChecking: 'Checking the bundled sender and loaded driver…',
    autoMissingHelper: 'The USB sender is missing. Use the Apple Silicon macOS release.', autoMissingDriver: 'The usbgadget driver is not loaded. Review the USB driver requirements, then check again.',
    autoCheckFailed: 'Could not verify the driver. See the details below.', autoReady: 'Driver loaded. Confirm the console editor and start typing.', autoStarting: 'Waiting for the console to recognize the USB keyboard…', autoTyping: 'Typing bootstrap into the console…',
    autoStopping: 'Stopping and releasing keys…', autoStopped: 'Stopped. Clear any partial text in the console editor before trying again.', autoFinished: 'USB sending finished. Verify the text on the console and save it as NS2 in slot 0. RUN was not pressed.', autoFailed: 'USB sending failed. Clear partial text before trying again; check the cable, controller and driver.',
    autoBusy: 'Stop USB typing before starting another operation or closing the application.', autoConfirmRequired: 'Confirm the empty editor and US English console keyboard layout.', autoInvalidController: 'Choose a valid USB controller.', autoInvalidDelay: 'Choose a supported typing speed.', autoNotReady: 'The USB sender and loaded driver must be available before typing.', autoInvalidAction: 'Invalid autotyper operation.',
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
    cancelWaiting: 'Cancelar espera de conexión',
    updateInvalidAction: "Operación de actualización inválida.",
    updateChecksumMismatch: "La descarga quedó incompleta o su suma de verificación no coincide. Se eliminó el paquete parcial.",
    updateSizeMismatch: "El tamaño descargado no coincide con el informado.",
    updateMissingPackage: "No hay un paquete compatible disponible.",
    updateTooLarge: "La respuesta de actualización supera el tamaño permitido.",
    updateNetworkError: "No se pudo acceder a las releases. Revisá la conexión y reintentá.",
    updateInvalidChecksums: "Falta la lista de sumas de verificación o es inválida.",
    updateInvalidRelease: "Los datos de la release son inválidos.",
    updateBusy: "Hay una operación de actualización en curso. Esperá a que termine.",
    updateFailed: "No se pudo completar la actualización.",
    updateDownloaded: "Descarga verificada. Terminá la sesión antes de instalar.",
    updateDownloading: "Descargando…",
    updateAvailable: "Nueva versión disponible:",
    updateCurrent: "Tenés la última versión estable disponible o una build más nueva.",
    updateChecking: "Consultando versiones…",
    updateUnchecked: "Todavía no se buscaron actualizaciones.",
    updateOpen: "Abrir carpeta de descarga",
    updateDownload: "Descargar paquete verificado",
    updateFormat: "Formato del paquete",
    updateCheck: "Buscar actualizaciones",
    updateHelp: "Buscá una versión estable para esta computadora. La descarga se verifica con las sumas SHA-256 de la release. Terminá la sesión antes de instalar el paquete; la aplicación en ejecución no se reemplaza automáticamente.",
    updateTitle: "Actualizaciones de la aplicación",
    recoveryConsole: "El proceso en la consola ya comenzó. Conservá los registros y reiniciá la consola antes de otra sesión. Los archivos exportados siguen en la PC.",
    recoveryConnection: "La conexión todavía no comenzó. Revisá la dirección LAN y la red de la consola y reintentá. Si ya introdujiste RUN o REMOVE manualmente, reiniciá la consola primero.",
    autoLogError: "No se pudo guardar el registro USB:",
    autoWaiting: "Esperando",
    autoDiagnostic: "Diagnóstico USB",
    autoCommandsUsed: "Ya se intentó enviar los comandos en esta sesión.",
    autoCommandsPending: "Iniciá una sesión, comprobá USB y confirmá que la consola está lista.",
    autoInvalidSession: "No hay una sesión nueva esperando para enviar comandos USB. Reiniciá la consola e iniciá otra sesión.",
    autoCommandsRestart: "El envío de comandos se detuvo. Reiniciá la consola e iniciá otra sesión antes de volver a intentar. No repitas REMOVE en el proceso actual.",
    autoCommandsFinished: "Comandos enviados. Revisá la consola; la conexión y la verificación continúan por separado.",
    autoCommandProgress: "Comandos enviados",
    autoWait: "Pausa entre comandos",
    autoCommandsStart: "Enviar comandos de conexión",
    autoCommandsConfirm: "Reinicié la consola, abrí SmileBASIC en la entrada de comandos, no introduje RUN ni REMOVE y elegí el teclado USB en inglés de EE. UU.",
    autoCommandsHelp: "Primero iniciá una sesión en la PC y comprobá USB. Envía LOAD, su confirmación, RUN, REMOVE y el START de esta sesión. Usá el bootstrap de NS2 Desktop guardado como NS2 en el slot 0.",
    autoCommandsTitle: "Enviar comandos de conexión por USB",
    autoOpenLogs: "Abrir registros USB",
    sessionReady: 'Sesión lista', session: 'Sesión de consola', sessionTools: 'Herramientas de la sesión', contentTools: 'NCA y código del sistema', verifySession: 'Comprobar sesión',
    help_session: 'Conectá una sola vez. Explorá archivos, montá juegos, probá lecturas y exportá datos desde esta sesión.',
    retry: 'Reintentar', retryHint: 'Repite la operación fallida usando la sesión actual.',
    sessionReconnectNeeded: 'No se pudo recuperar la conexión o el estado nativo. Reconectá la consola antes de iniciar una sesión nueva.',
    retryUnknown: 'Comprobando si terminó la operación anterior antes de reintentar.',
    sessionVerified: 'La sesión responde. La verificación inicial de FS y su restauración fueron correctas.',

    extract: 'Extraer RomFS / ExeFS (OunceCake)', help_extract: 'Abre los archivos internos del juego con OunceCake: juego base, actualizaciones y DLC. Permite explorar, exportar estructura o extraer todos los archivos a la PC.',
    extractHint: 'Buscá los juegos o ingresá un TitleID, montá el juego y extraé sus archivos. Preparar las actualizaciones puede tardar bastante. Los archivos se guardan en extracted y los reportes de estructura en inventories, dentro de la sesión. Se conservan las carpetas base/romfs, base/exefs, updates y dlc.',
    gameScan: 'Buscar juegos instalados', gameChoice: 'Juego instalado', gameId: 'TitleID para montar', gameMount: 'Montar juego', gameExtract: 'Extraer a la PC', gameFiles: 'Juego montado',
    gameSelected: 'Juego montado: ', gameSelectFirst: 'Elegí un juego y pulsá Montar juego.', gameScanDone: 'Juegos encontrados: ',

    gameExtractDlc: 'Solo un DLC concreto', gameDlcChoice: 'DLC y versión', gameDlcNone: 'No hay DLC disponibles',
    gameExtractBase: 'Solo base (sin actualizaciones ni DLC)', gameExtractUpdate: 'Versión actualizada concreta (base + actualización)',
    gameUpdateVersion: 'Versión de actualización montada', gameUpdateNone: 'No hay actualizaciones disponibles', gameUpdateHint: 'Extrae únicamente los RomFS / ExeFS combinados de esta versión, sin otra copia de la base ni DLC. No es un parche independiente.',
    gameExtractMode: 'Archivos a extraer', gameExtractLatest: 'Juego actualizado (recomendado)', gameExtractAll: 'Todas las versiones: base y actualizaciones',
    gameExtractHint: 'Recomendado extrae la vista base + actualización montada más reciente y los DLC, o la base si no hay actualización montada. Solo base y versión concreta excluyen los DLC. Todas las versiones incluye todas las vistas montadas.',
    gamePartial: 'No se pudieron montar algunas actualizaciones adicionales. Podés extraer los archivos disponibles; las exportaciones afectadas se marcarán como parciales. No disponibles: ',
    extractionIncomplete: 'Extracción parcial guardada; consultá extraction.json para ver las actualizaciones no disponibles: ',
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
    autoTitle: "Escritura USB", autoIntro: "Escritura USB opcional para Mac Apple Silicon compatibles. Escribí el bootstrap una vez y luego usá los controles de conexión para enviar los comandos de la sesión actual.",
    autoDriverNote: 'Requiere un driver usbgadget compatible, ya instalado, aprobado y cargado. El driver original puede requerir cambios en SIP y la seguridad de arranque que reducen la protección del Mac. NS2 Desktop no lo instala ni cambia esos ajustes.',
    autoDriverGuide: 'Requisitos del driver y del hardware USB', autoSteps: 'Conectá un cable USB de datos a la consola. Abrí SmileBASIC → Make a program con el editor vacío en el slot 0. Configurá el teclado USB de la consola en inglés de EE. UU. La escritura puede tardar varios minutos.',
    autoController: 'Controlador USB', autoDetect: 'Automático', autoSpeed: 'Velocidad de escritura', autoNormal: 'Normal (50 ms)', autoSlow: 'Lenta (100 ms)', autoVerySlow: 'Muy lenta (200 ms)',
    autoConfirm: 'El editor de la consola está vacío y su teclado USB está en inglés de EE. UU.', autoCheck: 'Comprobar driver', autoStart: 'Escribir bootstrap', autoStop: 'Detener escritura', autoLines: 'Líneas enviadas:', autoLineUnit: 'líneas',
    autoUnsupported: 'La escritura automática USB está disponible solo en la versión macOS Apple Silicon. Este método no funciona en Windows, Linux ni Mac Intel.',
    autoUnchecked: 'Comprobá el driver antes de escribir.', autoChecking: 'Comprobando el emisor incluido y el driver cargado…',
    autoMissingHelper: 'Falta el emisor USB. Usá la versión macOS Apple Silicon.', autoMissingDriver: 'El driver usbgadget no está cargado. Revisá los requisitos del driver USB y volvé a comprobar.',
    autoCheckFailed: 'No se pudo verificar el driver. Revisá los detalles debajo.', autoReady: 'Driver cargado. Confirmá el editor de la consola para comenzar.', autoStarting: 'Esperando que la consola reconozca el teclado USB…', autoTyping: 'Escribiendo el bootstrap en la consola…',
    autoStopping: 'Deteniendo y liberando las teclas…', autoStopped: 'Detenido. Borrá el texto parcial del editor de la consola antes de reintentar.', autoFinished: 'Envío USB terminado. Verificá el texto en la consola y guardalo como NS2 en el slot 0. No se pulsó RUN.', autoFailed: 'Falló el envío USB. Borrá el texto parcial antes de reintentar; revisá el cable, el controlador y el driver.',
    autoBusy: 'Detené la escritura USB antes de iniciar otra operación o cerrar la aplicación.', autoConfirmRequired: 'Confirmá el editor vacío y el teclado USB de la consola en inglés de EE. UU.', autoInvalidController: 'Elegí un controlador USB válido.', autoInvalidDelay: 'Elegí una velocidad de escritura válida.', autoNotReady: 'El emisor USB y el driver cargado deben estar disponibles antes de escribir.', autoInvalidAction: 'Operación de escritura automática inválida.',
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
  let autoRequest = false, lastAutoStatus = '';
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
    renderAutotyper(); renderUpdates();
    $('cancel-waiting').hidden = current.status !== 'waiting';
    $('cancel-waiting').disabled = !!current.autotyper?.busy || connectionError;
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
    $('error').textContent = current.status === 'failed' ? t(current.recovery || 'failedHelp') : uiError;
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
  let remoteBusy = false, retryable = false, pendingRetry = null, mountedUpdateVersions = [], mountedDlcs = [], extractionTitle = null;
  function updateExtractionChoices(versions = [], title = null, dlcs = []) {
    if (title !== extractionTitle) {mountedUpdateVersions = []; mountedDlcs = []; $('game-dlc').replaceChildren(); $('game-update-version').replaceChildren(); extractionTitle = title;}
    const previousDlc = $('game-dlc').value;
    if (JSON.stringify(dlcs) !== JSON.stringify(mountedDlcs) || !$('game-dlc').options.length) {
      mountedDlcs = dlcs;
      $('game-dlc').replaceChildren(...dlcs.map(dlc => new Option(dlc.titleId + ' · v' + dlc.version, dlc.path)));
      if (!dlcs.length) $('game-dlc').add(new Option(t('gameDlcNone'), ''));
      if (dlcs.some(dlc => dlc.path === previousDlc)) $('game-dlc').value = previousDlc;
    }
    const previous = $('game-update-version').value;
    if (JSON.stringify(versions) !== JSON.stringify(mountedUpdateVersions) || !$('game-update-version').options.length) {
      mountedUpdateVersions = versions;
      $('game-update-version').replaceChildren(...versions.map(version => new Option(version, version)));
      if (!versions.length) $('game-update-version').add(new Option(t('gameUpdateNone'), ''));
      if (versions.includes(previous)) $('game-update-version').value = previous;
    }
  }
  function gameWarning(sources = []) {
    $('game-warning').hidden = sources.length === 0;
    $('game-warning').textContent = sources.length ? t('gamePartial') + sources.map(source => source.path).join(', ') : '';
  }
  function browserControls() {
    for (const id of ['file-source', 'file-path', 'file-go', 'file-up', 'file-finish', 'file-more', 'file-structure'])
      $(id).disabled = browserBusy || remoteBusy || !browserReady || ($('file-source').value === 'game' && !gameMounted && !['file-finish', 'file-source'].includes(id));
    for (const id of ['game-scan', 'game-choice', 'game-id', 'game-mount', 'game-extract', 'game-extract-mode', 'game-update-version'])
      $(id).disabled = browserBusy || remoteBusy || !browserReady || (id === 'game-extract' && !gameMounted);
    const specificDlc = $('game-extract-mode').value === 'dlc';
    $('game-dlc-choice').hidden = !specificDlc;
    $('game-dlc').disabled = browserBusy || remoteBusy || !browserReady || !gameMounted || !mountedDlcs.length;
    if (specificDlc && (!gameMounted || !mountedDlcs.some(dlc => dlc.path === $('game-dlc').value))) $('game-extract').disabled = true;
    const specificUpdate = $('game-extract-mode').value === 'update';
    $('game-update-choice').hidden = !specificUpdate;
    $('game-update-version').disabled = browserBusy || remoteBusy || !browserReady || !gameMounted || !mountedUpdateVersions.length;
    if (specificUpdate && (!gameMounted || !mountedUpdateVersions.includes($('game-update-version').value))) $('game-extract').disabled = true;
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
        gameMounted = true; gameWarning(value.skippedSources); updateExtractionChoices(value.updateVersions, value.selected.title, value.dlcs); $('game-selected').textContent = t('gameSelected') + (value.selected.name || value.selected.title);
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
      else $('file-status').textContent = t(value.complete === false ? (action === 'extract-all' ? 'extractionIncomplete' : 'structureIncomplete') : 'fileSaved') + (value.directory || value.file || '');
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
  $('game-extract').addEventListener('click', () => runOperation({action: 'extract-all', source: 'game', extractionMode: $('game-extract-mode').value, updateVersion: $('game-update-version').value, dlcPath: $('game-dlc').value}));
  $('game-extract-mode').addEventListener('change', browserControls);
  $('game-dlc').addEventListener('change', browserControls);
  $('game-update-version').addEventListener('change', browserControls);
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
    gameMounted = !!result.selected; gameWarning(result.skippedSources); updateExtractionChoices(result.updateVersions, result.selected?.title || null, result.dlcs);
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
  $('cancel-waiting').addEventListener('click', async () => {try {await api('cancel-waiting', {}); await poll();} catch (error) {showError(error.message);}});
  $('copy').addEventListener('click', async () => {
    try {await navigator.clipboard.writeText(current.command); $('copy').textContent = t('copied');}
    catch {const range = document.createRange(); range.selectNodeContents($('command')); getSelection().removeAllRanges(); getSelection().addRange(range);}
  });
  $('output').addEventListener('click', () => api('output', {}).catch(error => showError(error.message)));
  function renderAutotyper() {
    const value = current.autotyper || {supported: false, status: 'unsupported', logs: []};
    const commands = value.kind === 'commands';
    const keys = {unsupported: 'autoUnsupported', unchecked: 'autoUnchecked', checking: 'autoChecking',
      'missing-helper': 'autoMissingHelper', 'missing-driver': 'autoMissingDriver', 'check-failed': 'autoCheckFailed',
      ready: 'autoReady', starting: 'autoStarting', typing: 'autoTyping', stopping: 'autoStopping', stopped: 'autoStopped', finished: 'autoFinished', failed: 'autoFailed'};
    if (value.status !== lastAutoStatus && ['stopped', 'finished', 'failed'].includes(value.status)) {
      $('autotyper-confirm').checked = false; $('commands-confirm').checked = false;
    }
    lastAutoStatus = value.status;
    $('autotyper-controls').hidden = !value.supported;
    $('command-typing').hidden = !value.supported;
    const statusKey = commands && ['failed', 'stopped'].includes(value.status) ? 'autoCommandsRestart' :
      commands && value.status === 'finished' ? 'autoCommandsFinished' : keys[value.status] || 'autoUnchecked';
    $('autotyper-status').textContent = t(statusKey) + (value.error ? ' ' + value.error : '');
    const locked = autoRequest || connectionError || current.standby;
    const settingsLocked = locked || value.busy || current.consoleActive && !current.canTypeCommands;
    for (const id of ['autotyper-controller', 'autotyper-delay', 'autotyper-wait', 'autotyper-check']) $(id).disabled = settingsLocked;
    $('autotyper-confirm').disabled = locked || value.busy || current.consoleActive;
    $('autotyper-start').disabled = locked || current.consoleActive || value.busy || !value.helperPresent || !value.driverLoaded || !$('autotyper-confirm').checked;
    $('commands-confirm').disabled = settingsLocked || !current.canTypeCommands;
    $('autotyper-commands').disabled = locked || value.busy || !current.canTypeCommands || !value.commandsPresent || !value.driverLoaded || !$('commands-confirm').checked;
    for (const id of ['autotyper-stop', 'commands-stop']) $(id).disabled = locked || !['starting', 'typing'].includes(value.status);
    const progress = value.total ? t(commands ? 'autoCommandProgress' : 'autoLines') + ' ' + value.completed + '/' + value.total : '';
    const waiting = value.wait ? ' · ' + t('autoWaiting') + ' ' + value.wait.label + ': ' + Math.ceil(value.wait.remainingMs / 1000) + ' s' : '';
    $('autotyper-progress').textContent = progress + waiting;
    $('commands-status').textContent = commands ? t(statusKey) + ' ' + progress + waiting : t(current.commandsAttempted ? 'autoCommandsUsed' : 'autoCommandsPending');
    $('autotyper-preview').textContent = value.preview ? 'bootstrap.bas · ' + value.preview.lines + ' ' + t('autoLineUnit') + ' · ' + value.preview.bytes + ' bytes' : '';
    $('autotyper-diagnostics').textContent = value.diagnostic ? t('autoDiagnostic') + ': Darwin ' + value.diagnostic.os + ' · ' + value.diagnostic.sip + ' · ' + value.diagnostic.controllers.join(', ') : '';
    $('autotyper-log-path').textContent = (value.logFile || '') + (value.logError ? ' · ' + t('autoLogError') + ' ' + value.logError : '');
    $('autotyper-log').hidden = !value.logs?.length;
    $('autotyper-log').textContent = (value.logs || []).join('\n');
  }
  async function autotyperAction(action) {
    if (autoRequest) return;
    autoRequest = true; renderAutotyper();
    try {
      const value = await api('autotyper', {action, confirmed: $(action === 'commands' ? 'commands-confirm' : 'autotyper-confirm').checked,
        controller: $('autotyper-controller').value, delayMs: Number($('autotyper-delay').value), waitMs: Number($('autotyper-wait').value)});
      current.autotyper = value; current.active = !!current.consoleActive || value.busy || current.updates?.busy;
      if (action === 'start') $('autotyper-confirm').checked = false;
      if (action === 'commands') {$('commands-confirm').checked = false; current.commandsAttempted = true; current.canTypeCommands = false;}
    } catch (error) {showError(error.message);}
    finally {autoRequest = false; renderState();}
  }
  for (let i = 0; i < 16; i++) $('autotyper-controller').add(new Option('usb-drd' + i, 'usb-drd' + i));
  for (const id of ['autotyper-controller', 'autotyper-delay', 'autotyper-wait']) {
    try {const saved = localStorage.getItem('ns2-' + id); if ([...$(id).options].some(option => option.value === saved)) $(id).value = saved;} catch {}
    $(id).addEventListener('change', () => {try {localStorage.setItem('ns2-' + id, $(id).value);} catch {}});
  }
  $('autotyper-confirm').addEventListener('change', renderAutotyper);
  $('commands-confirm').addEventListener('change', renderAutotyper);
  $('autotyper-logs').addEventListener('click', () => api('usb-logs', {}).catch(error => showError(error.message)));
  $('commands-stop').addEventListener('click', () => autotyperAction('stop'));
  for (const action of ['check', 'start', 'stop', 'commands']) $('autotyper-' + action).addEventListener('click', () => autotyperAction(action));
  let updateRequest = false;
  function renderUpdates() {
    const value = current.updates || {status: 'unchecked', packages: []};
    const keys = {unchecked: 'updateUnchecked', checking: 'updateChecking', current: 'updateCurrent', available: 'updateAvailable', downloading: 'updateDownloading', downloaded: 'updateDownloaded', failed: 'updateFailed'};
    $('update-status').textContent = t(keys[value.status] || 'updateUnchecked') + (value.version ? ' ' + value.version : '') +
      (value.status === 'downloading' ? ' · ' + Math.round(value.received / Math.max(1, value.total) * 100) + '%' : '') + (value.error ? ' ' + t(value.error) : '');
    const names = value.packages.map(item => item.name), select = $('update-package'), selected = select.value;
    if ([...select.options].map(item => item.value).join(',') !== names.join(',')) {
      select.replaceChildren(...names.map(name => new Option(name, name))); if (names.includes(selected)) select.value = selected;
    }
    const locked = updateRequest || value.busy || connectionError || current.standby;
    $('update-check').disabled = locked; select.disabled = locked || !names.length;
    $('update-download').disabled = locked || !names.length;
    $('update-open').disabled = locked || !value.file;
    $('update-path').textContent = value.file || '';
  }
  async function updateAction(action) {
    if (updateRequest) return;
    updateRequest = true; renderUpdates();
    try {const value = await api('updates', {action, name: $('update-package').value}); if (action !== 'open') current.updates = value;}
    catch (error) {showError(error.message);}
    finally {updateRequest = false; renderUpdates();}
  }
  for (const action of ['check', 'download', 'open']) $('update-' + action).addEventListener('click', () => updateAction(action));
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
