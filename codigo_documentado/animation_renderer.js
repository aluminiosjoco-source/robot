// [CLASE]
// Representa la configuración o entorno global de Emscripten en el navegador/worker.
var Module = typeof Module < "u" ? Module : {}
  , ENVIRONMENT_IS_WEB = !0
  , ENVIRONMENT_IS_WORKER = !1
  
  // [FUNCIÓN]
  // Función de salida/aborto utilizada por el runtime de Emscripten para detener la ejecución y lanzar excepciones.
  , quit_ = (r, e) => {
    throw e
}
  , _scriptName = globalThis.document?.currentScript?.src
  , scriptDirectory = "";

// [FUNCIÓN]
// Resuelve rutas de archivos locales o recursos estáticos necesarios para el módulo WebAssembly (ej. animation_renderer.wasm).
function locateFile(r) {
    return scriptDirectory + r
}

var readAsync, readBinary;
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
        scriptDirectory = new URL(".",_scriptName).href
    } catch {}
    
    // [FUNCIÓN]
    // Descarga de manera asíncrona mediante fetch el binario WebAssembly u otros assets arrayBuffer.
    readAsync = async r => {
        var e = await fetch(r, {
            credentials: "same-origin"
        });
        if (e.ok)
            return e.arrayBuffer();
        throw new Error(e.status + " : " + e.url)
    }
}

var out = console.log.bind(console), err = console.error.bind(console), wasmBinary, ABORT = !1, EXITSTATUS, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64, HEAP64, HEAPU64, runtimeInitialized = !1;

// [FUNCIÓN]
// Revisa y actualiza las vistas de memoria JavaScript (TypedArrays) asignadas sobre el WebAssembly.Memory buffer.
function updateMemoryViews() {
    var r = wasmMemory.buffer;
    HEAP8 = new Int8Array(r),
    HEAP16 = new Int16Array(r),
    Module.HEAPU8 = HEAPU8 = new Uint8Array(r),
    HEAPU16 = new Uint16Array(r),
    HEAP32 = new Int32Array(r),
    HEAPU32 = new Uint32Array(r),
    Module.HEAPF32 = HEAPF32 = new Float32Array(r),
    HEAPF64 = new Float64Array(r),
    HEAP64 = new BigInt64Array(r),
    HEAPU64 = new BigUint64Array(r)
}

// [FUNCIÓN]
// Hook de inicialización previo al arranque del runtime de C/C++.
function preRun() {}

// [FUNCIÓN]
// Inicializa el estado del runtime en JavaScript y llama a la función de inicialización exportada desde C/C++ (wasmExports.h).
function initRuntime() {
    runtimeInitialized = !0,
    wasmExports.h()
}

// [FUNCIÓN]
// Hook ejecutado inmediatamente después de que el runtime de C/C++ finaliza su inicialización.
function postRun() {}

// [FUNCIÓN]
// Detiene abruptamente la ejecución del runtime WebAssembly y lanza un RuntimeError.
function abort(r) {
    r = "Aborted(" + r + ")",
    err(r),
    ABORT = !0,
    r += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(r);
    throw e
}

var wasmBinaryFile;

// [FUNCIÓN]
// Determina y devuelve la ubicación del archivo .wasm correspondiente.
function findWasmBinary() {
    return locateFile("animation_renderer.wasm")
}

// [FUNCIÓN]
// Intenta recuperar el binario WebAssembly de forma sincrónica. Lanza error si no hay proveedor sync.
function getBinarySync(r) {
    if (readBinary)
        return readBinary(r);
    throw "both async and sync fetching of the wasm failed"
}

// [FUNCIÓN]
// Obtiene el binario WebAssembly en un Uint8Array desde la red o almacenamiento local.
async function getWasmBinary(r) {
    if (!wasmBinary)
        try {
            var e = await readAsync(r);
            return new Uint8Array(e)
        } catch {}
    return getBinarySync(r)
}

// [FUNCIÓN]
// Instancia el módulo WebAssembly pasando un ArrayBuffer y los objetos de importación a WebAssembly.instantiate.
async function instantiateArrayBuffer(r, e) {
    try {
        var t = await getWasmBinary(r)
          , n = await WebAssembly.instantiate(t, e);
        return n
    } catch (a) {
        err(`failed to asynchronously prepare wasm: ${a}`),
        abort(a)
    }
}

// [FUNCIÓN]
// Intenta realizar la compilación e instanciación en streaming mediante WebAssembly.instantiateStreaming.
async function instantiateAsync(r, e, t) {
    if (!r)
        try {
            var n = fetch(e, {
                credentials: "same-origin"
            })
              , a = await WebAssembly.instantiateStreaming(n, t);
            return a
        } catch (i) {
            err(`wasm streaming compile failed: ${i}`),
            err("falling back to ArrayBuffer instantiation")
        }
    return instantiateArrayBuffer(e, t)
}

// [FUNCIÓN]
// Retorna las funciones y utilidades de JavaScript que se pasan como entorno de importación a WebAssembly.
function getWasmImports() {
    var r = {
        a: wasmImports
    };
    return r
}

// [FUNCIÓN]
// Coordina la creación e instanciación completa del módulo WebAssembly.
async function createWasm() {
    // [FUNCIÓN]
    // Vincula las exportaciones C/C++ recibidas hacia el ámbito global y refresca la memoria.
    function r(i, u) {
        return wasmExports = i.exports,
        assignWasmExports(wasmExports),
        updateMemoryViews(),
        removeRunDependency("wasm-instantiate"),
        wasmExports
    }
    addRunDependency("wasm-instantiate");
    
    // [FUNCIÓN]
    // Helper de extracción del módulo instanciado.
    function e(i) {
        return r(i.instance)
    }
    var t = getWasmImports();
    wasmBinaryFile ??= findWasmBinary();
    var n = await instantiateAsync(wasmBinary, wasmBinaryFile, t)
      , a = e(n);
    return a
}

// [CLASE]
// Estructura que envuelve el estado de salida al llamar a exit() en C/C++.
class ExitStatus {
    name = "ExitStatus";
    
    // [MÉTODO]
    // Constructor de la excepción ExitStatus.
    constructor(e) {
        this.message = `Program terminated with exit(${e})`,
        this.status = e
    }
}

var runDependencies = 0
  , dependenciesFulfilled = null
  
  // [FUNCIÓN]
  // Registra la resolución de una dependencia del runtime (disminuye contador).
  , removeRunDependency = r => {
    if (runDependencies--,
    runDependencies == 0 && dependenciesFulfilled) {
        var e = dependenciesFulfilled;
        dependenciesFulfilled = null,
        e()
    }
}
  
  // [FUNCIÓN]
  // Incrementa el contador de dependencias requeridas antes del arranque del runtime.
  , addRunDependency = r => {
    runDependencies++
}
;

// [CLASE]
// Manejador del layout de memoria para excepciones C++ (__cxa_throw).
class ExceptionInfo {
    // [MÉTODO]
    // Inicializa punteros en la pila/heap para la excepción C++.
    constructor(e) {
        this.excPtr = e,
        this.ptr = e - 24
    }
    // [MÉTODO]
    // Modifica el puntero al tipo de tipo de datos de la excepción.
    set_type(e) {
        HEAPU32[this.ptr + 4 >> 2] = e
    }
    // [MÉTODO]
    // Obtiene el tipo de la excepción.
    get_type() {
        return HEAPU32[this.ptr + 4 >> 2]
    }
    // [MÉTODO]
    // Establece el destructor de la excepción.
    set_destructor(e) {
        HEAPU32[this.ptr + 8 >> 2] = e
    }
    // [MÉTODO]
    // Obtiene el puntero al destructor de la excepción.
    get_destructor() {
        return HEAPU32[this.ptr + 8 >> 2]
    }
    // [MÉTODO]
    // Marca el estado de captura (caught) de la excepción C++.
    set_caught(e) {
        e = e ? 1 : 0,
        HEAP8[this.ptr + 12] = e
    }
    // [MÉTODO]
    // Consulta si la excepción fue capturada.
    get_caught() {
        return HEAP8[this.ptr + 12] != 0
    }
    // [MÉTODO]
    // Marca el estado de re-lanzamiento (rethrown).
    set_rethrown(e) {
        e = e ? 1 : 0,
        HEAP8[this.ptr + 13] = e
    }
    // [MÉTODO]
    // Consulta si la excepción fue relanzada.
    get_rethrown() {
        return HEAP8[this.ptr + 13] != 0
    }
    // [MÉTODO]
    // Inicializa la estructura interna en la memoria C++ HEAP.
    init(e, t) {
        this.set_adjusted_ptr(0),
        this.set_type(e),
        this.set_destructor(t)
    }
    // [MÉTODO]
    // Define el puntero ajustado para herencia múltiple o casteo de excepciones C++.
    set_adjusted_ptr(e) {
        HEAPU32[this.ptr + 16 >> 2] = e
    }
    // [MÉTODO]
    // Consulta el puntero ajustado de la excepción C++.
    get_adjusted_ptr() {
        return HEAPU32[this.ptr + 16 >> 2]
    }
}

var exceptionLast = 0, uncaughtExceptionCount = 0, 

// [FUNCIÓN]
// Implementación en JavaScript del lanzamiento de excepciones C++ (ABI __cxa_throw).
___cxa_throw = (r, e, t) => {
    var n = new ExceptionInfo(r);
    throw n.init(e, t),
    exceptionLast = r,
    uncaughtExceptionCount++,
    exceptionLast
}

// [FUNCIÓN]
// Interrupción de runtime invocado internamente desde código compilado C/C++.
, __abort_js = () => abort("")

, runtimeKeepaliveCounter = 0

// [FUNCIÓN]
// Limpia la bandera de retención (keepalive) del bucle de eventos del runtime.
, __emscripten_runtime_keepalive_clear = () => {
    runtimeKeepaliveCounter = 0
}

, timers = {}

// [FUNCIÓN]
// Captura y gestiona las excepciones JavaScript/C++ no controladas en el runtime.
, handleException = r => {
    if (r instanceof ExitStatus || r == "unwind")
        return EXITSTATUS;
    quit_(1, r)
}

// [FUNCIÓN]
// Retorna si el runtime debe mantenerse vivo tras la ejecución de la pila actual.
, keepRuntimeAlive = () => !0

// [FUNCIÓN]
// Maneja la terminación de un proceso C/C++ enviando el código de salida.
, _proc_exit = r => {
    EXITSTATUS = r,
    keepRuntimeAlive() || (ABORT = !0),
    quit_(r, new ExitStatus(r))
}

// [FUNCIÓN]
// Abstracción JS para finalizar la ejecución de JavaScript y notificar la salida del sistema.
, exitJS = (r, e) => {
    EXITSTATUS = r,
    _proc_exit(r)
}

, _exit = exitJS

// [FUNCIÓN]
// Invoca la salida del sistema únicamente si no hay razones para mantener vivo el runtime.
, maybeExit = () => {
    if (!keepRuntimeAlive())
        try {
            _exit(EXITSTATUS)
        } catch (r) {
            handleException(r)
        }
}

// [FUNCIÓN]
// Ejecuta callbacks de usuario dentro de un bloque protegido contra excepciones del runtime Emscripten.
, callUserCallback = r => {
    if (!ABORT)
        try {
            r(),
            maybeExit()
        } catch (e) {
            handleException(e)
        }
}

// [FUNCIÓN]
// Proporciona marcas de tiempo de alta precisión desde JS para temporizadores internos del código compilado C/C++.
, _emscripten_get_now = () => performance.now()

// [FUNCIÓN]
// Emula temporizadores POSIX (itimer) usando setTimeout en JavaScript.
, __setitimer_js = (r, e) => {
    if (timers[r] && (clearTimeout(timers[r].id),
    delete timers[r]),
    !e)
        return 0;
        
    // [CALLBACK]
    // Callback diferido de setTimeout que invoca el timeout configurado en WebAssembly.
    var t = setTimeout( () => {
        delete timers[r],
        callUserCallback( () => __emscripten_timeout(r, _emscripten_get_now()))
    }
    , e);
    return timers[r] = {
        id: t,
        timeout_ms: e
    },
    0
}

// [FUNCIÓN]
// Retorna el límite máximo de memoria permitido para el Heap (2GB).
, getHeapMax = () => 2147483648

// [FUNCIÓN]
// Redondea y alinea el tamaño de la memoria según un límite de página determinado.
, alignMemory = (r, e) => Math.ceil(r / e) * e

// [FUNCIÓN]
// Redimensiona (grow) el búfer de memoria de WebAssembly y recalcula las vistas TypedArray en JS.
, growMemory = r => {
    var e = wasmMemory.buffer.byteLength
      , t = (r - e + 65535) / 65536 | 0;
    try {
        return wasmMemory.grow(t),
        updateMemoryViews(),
        1
    } catch {}
}

// [FUNCIÓN]
// Ajusta dinámicamente el tamaño del Heap asignado en WebAssembly ante demanda de malloc.
, _emscripten_resize_heap = r => {
    var e = HEAPU8.length;
    r >>>= 0;
    var t = getHeapMax();
    if (r > t)
        return !1;
    for (var n = 1; n <= 4; n *= 2) {
        var a = e * (1 + .2 / n);
        a = Math.min(a, r + 100663296);
        var i = Math.min(t, alignMemory(Math.max(r, a), 65536))
          , u = growMemory(i);
        if (u)
            return !0
    }
    return !1
}

, _w0, _w1, _w3, _w4, _w5, _w6, _w7, _w8, _w11, _w12, _w13, _w14, _w15, _free, _malloc, __emscripten_timeout, memory, __indirect_function_table, wasmMemory;

// [FUNCIÓN]
// Mapea y asigna las funciones exportadas desde la instancia WASM hacia el objeto `Module` de JS.
// Mapeo demostrado en runtime:
// _w0: Instanciación de objeto/renderizador de animación en WASM (`_w0()`)
// _w1: Carga/procesamiento de binario anim_data (`_w1(instance, ptr, len)`)
// _w3: Configuración/asociación de swatch de la animación (`_w3(instance, name, ...)`
// _w4: Envío de eventos o triggers de animación (`_o(e, h)`)
// _w5, _w6, _w8: Configuración de parámetros/frames/tiempos
// _w11, _w12: Generación/extracción de trazados Bezier vectoriales para el canvas (`eyes_grid.min.js`)
// _w13: Obtención de la cantidad máxima de swatches disponibles
// _free / _malloc: Asignación y liberación de memoria en el Heap de C/C++
function assignWasmExports(r) {
    _w0 = Module._w0 = r.i,
    _w1 = Module._w1 = r.j,
    _w3 = Module._w3 = r.k,
    _w4 = Module._w4 = r.l,
    _w5 = Module._w5 = r.m,
    _w6 = Module._w6 = r.n,
    _w7 = Module._w7 = r.o,
    _w8 = Module._w8 = r.p,
    _w11 = Module._w11 = r.q,
    _w12 = Module._w12 = r.r,
    _w13 = Module._w13 = r.s,
    _w14 = Module._w14 = r.t,
    _w15 = Module._w15 = r.u,
    _free = Module._free = r.v,
    _malloc = Module._malloc = r.w,
    __emscripten_timeout = r.x,
    memory = wasmMemory = r.g,
    __indirect_function_table = r.__indirect_function_table
}

var wasmImports = {
    a: ___cxa_throw,
    e: __abort_js,
    c: __emscripten_runtime_keepalive_clear,
    d: __setitimer_js,
    f: _emscripten_resize_heap,
    b: _proc_exit
};

// [FUNCIÓN]
// Inicia el flujo principal de ejecución de la aplicación una vez resueltas las dependencias.
function run() {
    if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return
    }
    if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return
    }
    
    // [FUNCIÓN]
    // Callback que ejecuta la inicialización del runtime y dispara `Module.onRuntimeInitialized`.
    function r() {
        Module.calledRun = !0,
        !ABORT && (initRuntime(),
        Module.onRuntimeInitialized?.(),
        void 0)
    }
    r()
}

var wasmExports;
createWasm(),
run();