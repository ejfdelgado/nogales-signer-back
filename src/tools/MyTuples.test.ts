import { MyTuples } from "./MyTuples";
import { sortify } from "./Sortify";

export interface PruebaDataType {
    f: any;
    i: any;
    e: any;
};

export const testTuples = async () => {
    const BATCH_SIZE = 3;
    const reverse = false;
    const show = false;
    const useProcessor = ["none", "good", "bad"][0];
    const pruebas: PruebaDataType[] = [
        {
            f: { a: 2 },
            i: {},
            e: { "+": [{ "k": "a", "v": 2 }], "-": [], "*": [] },//solo agregar
        },
        {
            f: [{}],
            i: [{ 0: true }],
            e: { "+": [], "-": [{ "k": "0.0" }], "*": [] },//solo quitar
        },
        {
            f: [true],
            i: [false],
            e: { "+": [], "-": [], "*": [{ "k": "0", "v": true }] },//solo modificar
        },
        {
            f: { a: 1, b: "t", c: true, e: null, f: "soy nuevo" },
            i: { a: 1, b: "t", c: true, d: false, e: null, f: undefined },
            e: { "+": [{ "k": "f", "v": "soy nuevo" }], "-": [{ "k": "d" }], "*": [] }//agregar y quitar
        },
        {
            f: { a: [], b: { g: 6, h: 7 } },
            i: { a: [2], b: { g: 5 } },
            e: { "+": [{ "k": "b.h", "v": 7 }], "-": [{ "k": "a.0" }], "*": [{ "k": "b.g", "v": 6 }] }//agregar, quitar y modificar
        },
        {
            f: { a: { b: { c: [{ h: "hola", i: "como", j: "estas" }] } } },
            i: { a: { b: { c: [3, { h: "hola" }] } } },
            e: { "+": [{ "k": "a.b.c.0.h", "v": "hola" }, { "k": "a.b.c.0.i", "v": "como" }, { "k": "a.b.c.0.j", "v": "estas" }], "-": [{ "k": "a.b.c.1" }, { "k": "a.b.c.1.h" }], "*": [{ "k": "a.b.c.0", "v": {} }] }
        },
        {
            f: [{ e: 3 }, 5, 8, [9]],
            i: [{ e: 3 }, 5, 8, [9]],
            e: { "+": [], "-": [], "*": [] },
        },
        {
            f: { a: 5, b: [], c: {} },
            i: { a: 5, b: [], c: {} },
            e: { "+": [], "-": [], "*": [] },
        },
        {
            f: [1, 2, 3, 4],
            i: [1, 2, 3, 4],
            e: { "+": [], "-": [], "*": [] },
        },
        {
            f: ["1", "2", "3"],
            i: ["1", "2", "3"],
            e: { "+": [], "-": [], "*": [] },
        },
        {
            f: [true, false, true],
            i: [true, false, true],
            e: { "+": [], "-": [], "*": [] },
        },
        {
            f: { a: [5, 6, 7], b: { n: true, h: false, ert: "dzfgfsdgfsdg" }, c: [{ g: 5 }, { g: 6 }, { g: 7 }] },
            i: { a: [5, 6, 7], b: { n: true, h: false, ert: "dzfggfsdg" }, c: [{ g: 6 }, { g: 7 }] },
            e: { "*": [{ "k": "b.ert", "v": "dzfgfsdgfsdg" }, { "k": "c.0.g", "v": 5 }, { "k": "c.1.g", "v": 6 }], "+": [{ "k": "c.2", "v": {} }, { "k": "c.2.g", "v": 7 }], "-": [] },
        },
        {
            f: { a: { 1: 6, 4: 5 } },
            i: { a: { 1: 6, 4: 5 } },
            e: { "+": [], "-": [], "*": [] },
        }, //esto no se debe guardar porque pasará a ser un arreglo
    ];

    const mockProcessorGood = (payload: any) => {
        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                console.log(`Processing ${JSON.stringify(payload, null, 4)} OK`);
                resolve();
            }, 0);
        });
    };

    const getBadProcessor = () => {
        let count = 0;
        let maxCount = 3;
        const mockProcessorBad = (payload: any) => {
            return new Promise<void>((resolve, reject) => {
                setTimeout(() => {
                    if (count < maxCount) {
                        console.log(`Processing ${JSON.stringify(payload, null, 4)} ERROR`);
                        reject();
                        count++;
                    } else {
                        console.log(`Processing ${JSON.stringify(payload, null, 4)} OK`);
                        resolve();
                        count = 0;
                    }

                }, 500);
            });
        };
        return mockProcessorBad;
    };

    // Las funciones se deben ignorar
    pruebas[0].i.p = function () { };
    // Los loops se deben ignorar
    pruebas[5].i.loop = pruebas[5].i;

    for (let i = 0; i < pruebas.length; i++) {
        console.log(`Prueba ${i + 1} ----------------------------------------------`);
        const prueba = pruebas[i];
        const tuplas = MyTuples.getTuples(prueba.i);
        //console.log(JSON.stringify(tuplas, null, 4));
        const referencia = sortify(prueba.i);
        //console.log(referencia);
        const intercambio = sortify(tuplas);
        let buffer: any = {};
        const builder = MyTuples.getBuilder();
        const builder2 = MyTuples.getBuilder();
        if (useProcessor == "bad") {
            builder.setProcesor(getBadProcessor());
        }
        if (useProcessor == "good") {
            builder.setProcesor(mockProcessorGood);
        }
        let llaves1 = Object.keys(tuplas);
        if (reverse) {
            llaves1 = llaves1.reverse();
        }
        llaves1.forEach(element => {
            buffer[element] = tuplas[element];
            if (Object.keys(buffer).length >= BATCH_SIZE) {
                builder.build(buffer);
                builder2.build(buffer);
                buffer = {};
            }
        });
        if (Object.keys(buffer).length > 0) {
            builder.build(buffer);
            builder2.build(buffer);
            buffer = {};
        }
        const resultadoTxt = sortify(builder.end());
        builder2.end();

        const indicadorActividad = new Promise<void>((resolve) => {
            builder.addActivityListener((status: any) => {
                if (!status) {
                    resolve();
                    console.log("Terminado...");
                } else {
                    console.log("Esperando...");
                }
            });
        });
        const differences = builder.trackDifferences(prueba.f);
        //console.log(JSON.stringify(differences, null, 4));
        await indicadorActividad;

        const afectado = builder2.affect(differences);
        //console.log(JSON.stringify(afectado, null, 4));
        prueba.e.r = differences.r;
        prueba.e.t = differences.t;
        prueba.e.total = differences.total;
        const differencesTxt = sortify(differences);

        if (show) {
            console.log("--------------------------------------------------------");
            console.log(referencia);
            console.log(intercambio);
            console.log(resultadoTxt);
        }

        if (referencia != resultadoTxt) {
            throw Error(`referencia ${referencia} \nintercambio ${intercambio}\nresultadoTxt ${resultadoTxt}`);
        }

        if (sortify(prueba.e) != differencesTxt) {
            throw Error(`Modificación fallida ${JSON.stringify(prueba)}\n${differencesTxt}`);
        }

        if (sortify(prueba.f) != sortify(afectado)) {
            throw Error(`Afectación fallida ${JSON.stringify(prueba)}`);
        }
        console.log(`Prueba ${i + 1} OK`);
    }
}

export const testConverter = () => {
    const pruebas = [
        {
            i: [
                { k: "6543:fdgfd.ghgf.t", v: 2 },
                { k: "6543:fdgfd.ghgf", v: {} },
                { k: "6543:fdgfd", v: {} },
            ],
            o: {
                "6543:fdgfd.ghgf.t": 2,
                "6543:fdgfd.ghgf": {},
                "6543:fdgfd": {},
            }
        },
        {
            i: [],
            o: {},
        }
    ];

    for (let i = 0; i < pruebas.length; i++) {
        const actual = pruebas[i];
        const input = actual.i;
        const o = actual.o;
        const response = MyTuples.convertFromBD(input);

        const oText = sortify(o);
        const responseTxt = sortify(response);
        if (oText != responseTxt) {
            throw new Error(`Prueba fallida ${oText} != ${responseTxt}`);
        }
    }
};

export const testArray = () => {
    const restas = [
        { a: [1, 3, 5], b: [3], r: [1, 5] },
        { a: [], b: [4, 7], r: [] },
        { a: [3, 4, 5], b: [], r: [3, 4, 5] },
    ];
    const interseccion = [
        { a: [1, 3, 5], b: [3], r: [3] },
        { a: [], b: [4, 8, 9], r: [] },
        { a: [4, 8, 9], b: [], r: [] },
    ];
    for (let i = 0; i < restas.length; i++) {
        const prueba = restas[i];
        const response = MyTuples.restarArreglo(prueba.a, prueba.b);
        const responseTxt = sortify(response);
        const refTxt = sortify(prueba.r);
        if (responseTxt != refTxt) {
            throw Error(`Resta fallida ${JSON.stringify(prueba)}`);
        }
    }
    for (let i = 0; i < interseccion.length; i++) {
        const prueba = interseccion[i];
        const response = MyTuples.intersecionArreglo(prueba.a, prueba.b);
        const responseTxt = sortify(response);
        const refTxt = sortify(prueba.r);
        if (responseTxt != refTxt) {
            throw Error(`Interseccion fallida ${JSON.stringify(prueba)}`);
        }
    }
}

export const testArrayCompress = () => {
    const casos = [
        { i: { someArray: [1, 23, 3, 4], maxLength: 5 }, myExpected: ["[1]", "[23]", "[3,4]"] },
        { i: { someArray: [1, 230, 3, 4], maxLength: 5 }, myExpected: ["[1]", "[230]", "[3,4]"] },
        { i: { someArray: [1, 2301, 3, 4], maxLength: 5 }, myExpected: "Can't compress with size 5 one item has size 4" },
        { i: { someArray: [1, 2, 3, 4], maxLength: 5 }, myExpected: ["[1,2]", "[3,4]"] },
    ];

    for (let i = 0; i < casos.length; i++) {
        const caso = casos[i];
        let myActual = null;
        let myRaw: any = null;
        try {
            myRaw = MyTuples.arrayCompress(caso.i.someArray, caso.i.maxLength);
            myActual = sortify(myRaw);
        } catch (err: any) {
            myActual = sortify(err.message);
        }

        const myExpected = sortify(caso.myExpected);
        if (myExpected != myActual) {
            throw Error(`Compresion fallida expected: ${myExpected} actual ${myActual}`);
        } else {
            console.log(`Case compress ${i + 1} Ok`);
        }

        if (caso.myExpected instanceof Array) {
            // Se valida la descompresión
            const uncompressed = MyTuples.arrayUnCompress(myRaw);
            const unCompressExpected = sortify(caso.i.someArray);
            const unCompressActual = sortify(uncompressed);
            if (unCompressExpected != unCompressActual) {
                throw Error(`Descompresion fallida expected: ${unCompressExpected} actual ${unCompressActual}`);
            } else {
                console.log(`Case uncompress ${i + 1} Ok`);
            }
        }
    }
}

export const testSimpleTuples = () => {

    const mockProcessorGood = (payload: any) => {
        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                console.log(`Processing ${JSON.stringify(payload, null, 4)} OK`);
                resolve();
            }, 0);
        });
    };

    let model: any = { persona: { nombre: "Edgar", edad: 38 } };
    const builderConfig = { MAX_SEND_SIZE: 1000, LOW_PRESSURE_MS: 0, BACK_OFF_MULTIPLIER: 0 };
    const builder = MyTuples.getBuilder(builderConfig);
    builder.setProcesor(mockProcessorGood);
    builder.build({});
    const res1 = builder.end();
    model.persona.nombre = "Edgar Delgado";
    delete model.persona.edad;
    model.persona.color = "red";
    model.persona.animal = "dog";
    //console.log(res1);

    const differences1 = builder.trackDifferences(model);
    const afectado1 = builder.affect(differences1);
    console.log(afectado1);

    const differences2 = builder.trackDifferences({});
    const afectado2 = builder.affect(differences2);
    console.log(afectado2);

    const differences3 = builder.trackDifferences({ a: 1 });
    const afectado3 = builder.affect(differences3);
    console.log(afectado3);
}