import { IdGen } from "./IdGen";
import { SimpleObj } from "./SimpleObj";

const TAMANIO_ALEATORIO = 10;
const MAX_BUFFER_CHANGES = 50;

export interface KeyValDataType {
    k: string;
    v?: any;
}

export interface BatchDataType {
    "r": any;
    "t": string;
    "+": KeyValDataType[];
    "-": KeyValDataType[];
    "*": KeyValDataType[];
    total: number;
};

export const fakeProcessor = ({ min = 500, max = 1000 }) => {
    return new Promise<void>((resolve) => {
        const tiempo = min + Math.random() * (max - min);
        setTimeout(() => {
            resolve();
        }, tiempo);
    });
};

export class MyTuples {
    static TIPOS_BASICOS = ["string", "number", "boolean"];
    static arrayCompress(someArray: any[], maxLength: number = 65535) {
        const response = [];
        let actualString = "[";
        let actualCount = 0;
        for (let i = 0; i < someArray.length; i++) {
            const actual = JSON.stringify(someArray[i]);
            if (actual.length > maxLength - 2) {
                throw new Error(`Can't compress with size ${maxLength} one item has size ${actual.length}`);
            }
            let caracteresExtra = 1;
            if (actualCount > 0) {
                caracteresExtra++;
            }
            if (actualString.length + actual.length > maxLength - caracteresExtra) {
                // Se hace push y se crea un nuevo string
                actualString += "]";
                response.push(actualString);
                actualString = "[";
                actualString += actual;
                actualCount = 1;
            } else {
                if (actualCount > 0) {
                    actualString += ",";
                }
                actualString += actual;
                actualCount += 1;
            }
        }
        // Se agrega el último
        if (actualString.length > 0) {
            actualString += "]";
            response.push(actualString);
        }
        return response;
    };
    static arrayUnCompress(someArray: string) {
        const response = [];
        for (let i = 0; i < someArray.length; i++) {
            const actual = JSON.parse(someArray[i]);
            for (let j = 0; j < actual.length; j++) {
                response.push(actual[j]);
            }
        }
        return response;
    }
    static convertFromBD(model: any) {
        const response: any = {};
        model.forEach((value: any) => {
            response[value.k] = value.v;
        });
        return response;
    }
    static getTuples(o: any, blackKeyPatterns: any[] = [], filterRoutes: any[] = []) {
        const response: any = {};
        let cache: any[] = [];
        function isInBlackList(ruta: string) {
            for (let i = 0; i < blackKeyPatterns.length; i++) {
                const pattern = blackKeyPatterns[i];
                if (pattern.test(ruta)) {
                    return true;
                }
            }
            return false;
        }
        function startsWithInArray(ruta: string, filterRoutes: string[]) {
            for (let i = 0; i < filterRoutes.length; i++) {
                const prefix = filterRoutes[i];
                if (ruta.startsWith(prefix)) {
                    return true;
                }
            }
            return false;
        }
        function visitor(mo: any, path: any[] = []) {
            if (typeof mo == "object") {
                if (mo != null) {
                    if (cache.includes(mo)) return;
                    cache.push(mo);
                }
                for (const [key, value] of Object.entries(mo)) {
                    const rutaLocal = path.concat([key]);
                    const ruta = rutaLocal.join(".");
                    if (isInBlackList(ruta) || (filterRoutes.length > 0 && !startsWithInArray(ruta, filterRoutes))) {
                        continue;
                    }
                    if (MyTuples.TIPOS_BASICOS.indexOf(typeof value) >= 0 || value === null) {
                        response[ruta] = value;
                    } else {
                        if (typeof value == "object" && value !== null && !cache.includes(value)) {
                            if (value instanceof Array) {
                                response[ruta] = [];
                            } else {
                                response[ruta] = {};
                            }
                        }
                        visitor(value, rutaLocal);
                    }
                }
            }
        }
        visitor(o);
        return response;
    }
    static getObject(t1: any, response: any = {}) {
        const llaves = Object.keys(t1);
        for (let i = 0; i < llaves.length; i++) {
            const llave = llaves[i];
            const valor = t1[llave];
            SimpleObj.recreate(response, "t." + llave, valor);
        }
        return response;
    }
    static restarArreglo(a: any[], b: any[]) {
        return a.filter((value) => {
            return b.indexOf(value) < 0;
        });
    }
    static intersecionArreglo(a: any[], b: any[]) {
        return a.filter((value) => {
            return b.indexOf(value) >= 0;
        });
    }
    static getBuilder(config: any = {}) {
        const START_BACKOFF = typeof config.START_BACKOFF == "number" ? config.START_BACKOFF : 0;
        const BACK_OFF_MULTIPLIER = typeof config.BACK_OFF_MULTIPLIER == "number" ? config.BACK_OFF_MULTIPLIER : 500;
        // Cuántas tuplas se pueden afectar en un llamado
        const MAX_SEND_SIZE = typeof config.MAX_SEND_SIZE == "number" ? config.MAX_SEND_SIZE : 20;
        const LOW_PRESSURE_MS = typeof config.LOW_PRESSURE_MS == "number" ? config.LOW_PRESSURE_MS : 1000;

        let blackKeyPatterns: any[] = [];
        let resultado: any = {};
        let myFreeze: any = null;
        let pending: any[] = [];
        let procesor: any = null;
        let listeners: any[] = [];
        let ultimaFechaInicio: any = null;
        let isProcessing: boolean = false;
        const ownTrackedChanges: any[] = [];

        const setBlackKeyPatterns = (myBlack: any) => {
            blackKeyPatterns = myBlack;
        }

        const addActivityListener = (a: any) => {
            if (!(a in listeners)) {
                listeners.push(a);
            }
            return () => {
                const indice = listeners.indexOf(a);
                listeners.splice(indice, 1);
            };
        };
        const setActivityStatus = (value: any) => {
            for (let i = 0; i < listeners.length; i++) {
                const listener = listeners[i];
                if (typeof listener == "function") {
                    listener(value);
                }
            }
        };

        const startProcess = () => {
            // Single execution
            if (isProcessing) {
                return;
            }
            if (typeof procesor != "function") {
                setActivityStatus(false);
                return;
            }
            // Low pressure
            const ahora = new Date().getTime();
            ultimaFechaInicio = ahora;
            const internalFun = async () => {
                if (ultimaFechaInicio == ahora) {
                    isProcessing = true;
                    // Notify
                    setActivityStatus(isProcessing);
                    // Then try process
                    const processAll = async () => {
                        if (pending.length > 0) {
                            const ultimo = JSON.parse(JSON.stringify(pending.splice(0, 1)[0]));
                            //Se deben partir los cambios en grupos de MAX_SEND_SIZE
                            const crearBatch = (): BatchDataType => {
                                const batch: BatchDataType = {
                                    "r": createTrackId(),
                                    "t": createTimestamp(),
                                    "+": [],
                                    "-": [],
                                    "*": [],
                                    total: 0,
                                };
                                trackChangeId(batch);
                                const pasarElemento = (simbolo: string) => {
                                    const lista = ultimo[simbolo];
                                    if (lista.length > 0) {
                                        (batch as any)[simbolo].push(lista.splice(lista.length - 1, 1)[0]);
                                        batch.total += 1;
                                        return true;
                                    }
                                    return false;
                                };
                                const pasarAlgunElemento = () => {
                                    return pasarElemento("-") || pasarElemento("+") || pasarElemento("*");
                                };
                                const pasarElementos = () => {
                                    let pasoAlgo = false;
                                    do {
                                        pasoAlgo = pasarAlgunElemento();
                                    } while (pasoAlgo && batch.total < MAX_SEND_SIZE);
                                };
                                pasarElementos();
                                return batch;
                            };

                            let unBatch: any;
                            do {
                                unBatch = crearBatch();
                                const reintentos = () => {
                                    let backOffCount = START_BACKOFF;
                                    return new Promise((resolve, reject) => {
                                        const unIntento = () => {
                                            // Retry infinitelly with linear backoff
                                            const delay = backOffCount * BACK_OFF_MULTIPLIER;
                                            //console.log(`unIntento delay ${delay}`);
                                            setTimeout(async () => {
                                                try {
                                                    const theResponse = await procesor(unBatch);
                                                    //const theResponse = await fakeProcessor();
                                                    resolve(theResponse);
                                                } catch (error: any) {
                                                    if ([403].indexOf(error.status) < 0) {
                                                        backOffCount += 1;
                                                        unIntento();
                                                    } else {
                                                        reject(error);
                                                    }
                                                }
                                            }, delay);
                                        };
                                        unIntento();
                                    });
                                };
                                if (unBatch.total > 0) {
                                    await reintentos();
                                }
                            } while (unBatch.total > 0);
                        }
                        return pending.length;
                    };//processAll
                    try {
                        let procesados = 0;
                        do {
                            // Se evacúa todo lo que está pendiente!
                            procesados = await processAll();
                        } while (procesados > 0);
                    } catch (err) {
                        // do nothing
                    }
                    isProcessing = false;
                    setActivityStatus(isProcessing);
                }
            };
            if (LOW_PRESSURE_MS == 0) {
                internalFun();
            } else {
                setTimeout(internalFun, LOW_PRESSURE_MS);//setTimeout
            }
        };//startProcess

        const isOwnChange = (cambio: BatchDataType) => {
            const randomId = cambio["r"];
            if (ownTrackedChanges.indexOf(randomId) >= 0) {
                return true;
            }
            return false;
        };

        const trackChangeId = (batch: BatchDataType) => {
            ownTrackedChanges.push(batch.r);
            const tamanioActual = ownTrackedChanges.length;
            const sobrantes = tamanioActual - MAX_BUFFER_CHANGES;
            if (sobrantes > 0) {
                ownTrackedChanges.splice(0, sobrantes);
            }
        };

        const createTimestamp = (): string => {
            const temp = IdGen.num2ord(new Date().getTime());
            if (temp != null) {
                return temp;
            }
            return "";
        }

        const createTrackId = () => {
            return Math.floor(Math.random() * Math.pow(10, TAMANIO_ALEATORIO)).toString(36);
        };

        return {
            setBlackKeyPatterns,
            isOwnChange,
            addActivityListener,
            build: (buffer: any) => {
                resultado = MyTuples.getObject(buffer, resultado);
            },
            end: () => {
                if (!resultado.t) {
                    resultado.t = {};
                }
                myFreeze = JSON.stringify(resultado.t);
                return JSON.parse(myFreeze);
            },
            affect: (batch: BatchDataType, listenerKeys: any[] = [], callback: null | Function = null) => {
                const tuplas1 = MyTuples.getTuples(JSON.parse(myFreeze));
                const llavesBorrar: any[] = batch["-"];
                const llavesNuevasModificadas = batch["*"].concat(batch["+"]);

                //Borro las tuplas
                for (let i = 0; i < llavesBorrar.length; i++) {
                    const llaveBorrar: string = llavesBorrar[i].k;
                    if (callback !== null && listenerKeys.indexOf(llaveBorrar) >= 0) {
                        callback(llaveBorrar, undefined);
                    }
                    delete tuplas1[llaveBorrar];
                }
                //Reemplazo las tuplas
                for (let i = 0; i < llavesNuevasModificadas.length; i++) {
                    const nuevaModificar = llavesNuevasModificadas[i];
                    if (callback !== null && listenerKeys.indexOf(nuevaModificar.k) >= 0) {
                        callback(nuevaModificar.k, nuevaModificar.v);
                    }
                    tuplas1[nuevaModificar.k] = nuevaModificar.v;
                }
                const resultado = MyTuples.getObject(tuplas1, {});
                if (!resultado.t) {
                    resultado.t = {};
                }
                myFreeze = JSON.stringify(resultado.t);
                return JSON.parse(myFreeze);
            },
            setProcesor: (p: any) => {
                procesor = p;
            },
            trackDifferences: (nuevo: any, listenerKeys: any[] = [], callback: null | Function = null, filterRoutes: any[] = []) => {
                const tuplas2 = MyTuples.getTuples(nuevo, blackKeyPatterns, filterRoutes);
                const tuplas1 = MyTuples.getTuples(JSON.parse(myFreeze), blackKeyPatterns, filterRoutes);

                const tuplas2Keys = Object.keys(tuplas2);
                const tuplas1Keys = Object.keys(tuplas1);

                // Calculas las nuevas (llaves de 2 menos las llaves de 1)
                const nuevas = MyTuples.restarArreglo(tuplas2Keys, tuplas1Keys);
                // Calcular las borradas (llaves de 1 menos las llaves de 2)
                const borradas = MyTuples.restarArreglo(tuplas1Keys, tuplas2Keys);
                // Calcular las modificadas (ver intersección de llaves)
                const modificadas = MyTuples.intersecionArreglo(tuplas1Keys, tuplas2Keys);

                const batch: BatchDataType = {
                    "r": createTrackId(),
                    "t": createTimestamp(),
                    "+": [],
                    "-": [],
                    "*": [],
                    total: 0,
                };

                trackChangeId(batch);

                for (let i = 0; i < nuevas.length; i++) {
                    const llave = nuevas[i];
                    if (callback != null && listenerKeys.indexOf(llave) >= 0) {
                        callback(llave, tuplas2[llave]);
                    }
                    batch["+"].push({
                        k: llave,
                        v: tuplas2[llave],
                    });
                }
                for (let i = 0; i < borradas.length; i++) {
                    const llave = borradas[i];
                    if (callback != null && listenerKeys.indexOf(llave) >= 0) {
                        callback(llave, undefined);
                    }
                    batch["-"].push({
                        k: llave,
                    });
                }
                for (let i = 0; i < modificadas.length; i++) {
                    const llave = modificadas[i];
                    let valor1 = tuplas1[llave];
                    let valor2 = tuplas2[llave];
                    if (typeof valor1 == "object" && valor1 != null) {
                        valor1 = JSON.stringify(valor1);
                    }
                    if (typeof valor2 == "object" && valor2 != null) {
                        valor2 = JSON.stringify(valor2);
                    }
                    if (valor1 !== valor2) {
                        if (callback != null && listenerKeys.indexOf(llave) >= 0) {
                            callback(llave, tuplas2[llave]);
                        }
                        batch["*"].push({
                            k: llave,
                            v: tuplas2[llave],
                        });
                    }
                }

                const compFun = (a: KeyValDataType, b: KeyValDataType) => {
                    return b.k.length - a.k.length;
                };
                batch['*'].sort(compFun);
                batch['-'].sort(compFun);
                batch['+'].sort(compFun);

                batch.total = batch['*'].length + batch['-'].length + batch['+'].length;
                if (batch.total > 0) {
                    myFreeze = JSON.stringify(nuevo);
                    pending.push(batch);
                    startProcess();
                }

                return batch;
            }
        };
    }
}

module.exports = {
    MyTuples
};
