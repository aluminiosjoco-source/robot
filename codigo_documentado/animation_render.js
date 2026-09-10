// [CLASE]
// Objeto global de configuración y estado del runtime de Emscripten en el entorno JavaScript.
var Module = typeof Module < "u" ? Module : {}
  , ENVIRONMENT_IS_WEB = !0
  , ENVIRONMENT_IS_WORKER = !1
  
  // [FUNCIÓN]
  // Detiene o aborta la ejecución del entorno Emscripten lanzando la excepción provista.
  , quit_ = (r, e) => {
    throw e
}
  , _scriptName = globalThis.document?.currentScript?.src
  , scriptDirectory = "";

// [FUNCIÓN]
// Resuelve la ruta relativa o URL completa para la carga de recursos WebAssembly adicionales.
function locateFile(r) {
    return scriptDirectory + r
}

var readAsync, readBinary;
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
        scriptDirectory = new URL(".",_scriptName).href
    } catch {}
    
    // [FUNCIÓN]
    // Carga de forma asíncrona datos binarios (ArrayBuffer) desde la red mediante Fetch API.
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
// Sincroniza las vistas del Heap en JavaScript (TypedArrays) cuando la memoria del búfer WebAssembly cambia o crece.
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
// Hook de inicialización ejecutado antes de arrancar el motor de C/C++.
function preRun() {}

// [FUNCIÓN]
// Inicializa las variables internas de estado del runtime e invoca la función 'h' exportada desde C/C++.
function initRuntime() {
    runtimeInitialized = !0,
    wasmExports.h()
}

// [FUNCIÓN]
// Hook ejecutado inmediatamente después de completar el arranque del módulo C/C++.
function postRun() {}

// [FUNCIÓN]
// Aborta la ejecución del runtime Emscripten, registra el error y lanza un RuntimeError de WebAssembly.
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
// Obtiene la localización del archivo "animation_renderer.wasm".
function findWasmBinary() {
    return locateFile("animation_renderer.wasm")
}

// [FUNCIÓN]
// Obtiene el binario WebAssembly de forma sincrónica si se definió previamente 'readBinary'.
function getBinarySync(r) {
    if (readBinary)
        return readBinary(r);
    throw "both async and sync fetching of the wasm failed"
}

// [FUNCIÓN]
// Recupera los bytes del binario WebAssembly ya sea desde memoria o leyéndolo de forma asíncrona.
async function getWasmBinary(r) {
    if (!wasmBinary)
        try {
            var e = await readAsync(r);
            return new Uint8Array(e)
        } catch {}
    return getBinarySync(r)
}

// [FUNCIÓN]
// Instancia el módulo WebAssembly a partir de un ArrayBuffer procesado.
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
// Intenta la compilación e instanciación en streaming de WebAssembly (vía instantiateStreaming).
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
// Devuelve el mapa de funciones e interfaces JavaScript exportadas hacia el módulo WebAssembly.
function getWasmImports() {
    var r = {
        a: wasmImports
    };
    return r
}

// [FUNCIÓN]
// Administra todo el flujo de carga, compilación e instanciación del binario WebAssembly.
async function createWasm() {
    // [FUNCIÓN]
    // Registra las exportaciones recibidas desde C/C++ y libera la dependencia de arranque.
    function r(i, u) {
        return wasmExports = i.exports,
        assignWasmExports(wasmExports),
        updateMemoryViews(),
        removeRunDependency("wasm-instantiate"),
        wasmExports
    }
    addRunDependency("wasm-instantiate");

    // [FUNCIÓN]
    // Helper de extracción de la instancia compilada.
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
// Estructura que envuelve el código de salida enviado al finalizar el programa compilado C/C++.
class ExitStatus {
    name = "ExitStatus";

    // [MÉTODO]
    // Constructor de la excepción ExitStatus con el código de estado correspondiente.
    constructor(e) {
        this.message = `Program terminated with exit(${e})`,
        this.status = e
    }
}

var runDependencies = 0
  , dependenciesFulfilled = null

  // [FUNCIÓN]
  // Reduce el contador de dependencias y ejecuta el callback de satisfacción de dependencias si llega a 0.
  , removeRunDependency = r => {
    if (runDependencies--,
    runDependencies == 0 && dependenciesFulfilled) {
        var e = dependenciesFulfilled;
        dependenciesFulfilled = null,
        e()
    }
}

  // [FUNCIÓN]
  // Incrementa el número de dependencias pendientes necesarias para la ejecución.
  , addRunDependency = r => {
    runDependencies++
}
;

// [CLASE]
// Gestor de estructura e inspección de memoria para excepciones C++ (__cxa_throw).
class ExceptionInfo {
    // [MÉTODO]
    // Asigna el puntero base y calcula la dirección del bloque de control en el Heap.
    constructor(e) {
        this.excPtr = e,
        this.ptr = e - 24
    }
    // [MÉTODO]
    // Establece el puntero al tipo de dato de la excepción C++.
    set_type(e) {
        HEAPU32[this.ptr + 4 >> 2] = e
    }
    // [MÉTODO]
    // Retorna la dirección del tipo de la excepción.
    get_type() {
        return HEAPU32[this.ptr + 4 >> 2]
    }
    // [MÉTODO]
    // Asigna el puntero a la función destructora de la excepción.
    set_destructor(e) {
        HEAPU32[this.ptr + 8 >> 2] = e
    }
    // [MÉTODO]
    // Retorna el puntero a la función destructora.
    get_destructor() {
        return HEAPU32[this.ptr + 8 >> 2]
    }
    // [MÉTODO]
    // Marca la excepción como capturada (caught).
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
    // Marca la excepción como relanzada (rethrown).
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
    // Inicializa los punteros internos de control de la excepción.
    init(e, t) {
        this.set_adjusted_ptr(0),
        this.set_type(e),
        this.set_destructor(t)
    }
    // [MÉTODO]
    // Define el puntero ajustado para transformaciones de tipos de excepción.
    set_adjusted_ptr(e) {
        HEAPU32[this.ptr + 16 >> 2] = e
    }
    // [MÉTODO]
    // Retorna el puntero ajustado para herencia de excepciones.
    get_adjusted_ptr() {
        return HEAPU32[this.ptr + 16 >> 2]
    }
}

var exceptionLast = 0, uncaughtExceptionCount = 0, 

// [FUNCIÓN]
// Función ABI __cxa_throw para soportar el lanzamiento de excepciones C++ desde WebAssembly hacia JS.
___cxa_throw = (r, e, t) => {
    var n = new ExceptionInfo(r);
    throw n.init(e, t),
    exceptionLast = r,
    uncaughtExceptionCount++,
    exceptionLast
}

// [FUNCIÓN]
// Interrupción invocada por el código WASM para abortar la ejecución.
, __abort_js = () => abort("")

, runtimeKeepaliveCounter = 0

// [FUNCIÓN]
// Limpia los contadores de retención del bucle de eventos del runtime.
, __emscripten_runtime_keepalive_clear = () => {
    runtimeKeepaliveCounter = 0
}

, timers = {}

// [FUNCIÓN]
// Maneja y procesa excepciones no controladas generadas en la capa de ejecución.
, handleException = r => {
    if (r instanceof ExitStatus || r == "unwind")
        return EXITSTATUS;
    quit_(1, r)
}

// [FUNCIÓN]
// Determina si el entorno runtime debe permanecer activo tras completar la tarea actual.
, keepRuntimeAlive = () => !0

// [FUNCIÓN]
// Detiene el proceso notificando el código de terminación C/C++.
, _proc_exit = r => {
    EXITSTATUS = r,
    keepRuntimeAlive() || (ABORT = !0),
    quit_(r, new ExitStatus(r))
}

// [FUNCIÓN]
// Abstracción en JS para gestionar la salida segura del entorno.
, exitJS = (r, e) => {
    EXITSTATUS = r,
    _proc_exit(r)
}

, _exit = exitJS

// [FUNCIÓN]
// Evalúa la salida limpia del runtime si no se requiere mantener la sesión viva.
, maybeExit = () => {
    if (!keepRuntimeAlive())
        try {
            _exit(EXITSTATUS)
        } catch (r) {
            handleException(r)
        }
}

// [FUNCIÓN]
// Wrapper seguro para ejecutar llamadas de callbacks de usuario protegiéndolos de fallos en runtime.
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
// Obtiene el tiempo actual de alta precisión mediante la API nativa de performance.
, _emscripten_get_now = () => performance.now()

// [FUNCIÓN]
// Implementa la funcionalidad de temporización 'itimer' mediante timeouts de JavaScript.
, __setitimer_js = (r, e) => {
    if (timers[r] && (clearTimeout(timers[r].id),
    delete timers[r]),
    !e)
        return 0;

    // [CALLBACK]
    // Callback diferido invocado por setTimeout para notificar el evento de expiración de tiempo a C/C++.
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
// Retorna el tamaño límite máximo direccionable para el Heap (2 GB).
, getHeapMax = () => 2147483648

// [FUNCIÓN]
// Alinea la cantidad de memoria solicitada al múltiplo de página configurado.
, alignMemory = (r, e) => Math.ceil(r / e) * e

// [FUNCIÓN]
// Incrementa dinámicamente la memoria del buffer WebAssembly (wasmMemory.grow) y actualiza sus TypedArrays.
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
// Redimensiona el Heap ante solicitudes de reserva de memoria C/C++ (malloc).
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
// Enlaza los símbolos y punteros exportados desde WebAssembly a las variables y métodos expuestos en el objeto Module.
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
// Inicia la secuencia de ejecución del runtime Emscripten verificando dependencias y disparando el callback onRuntimeInitialized.
function run() {
    if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return
    }
    if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return
    }

    // [CALLBACK]
    // Callback que establece las banderas de ejecución disparando initRuntime y Module.onRuntimeInitialized.
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