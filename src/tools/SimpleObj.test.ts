import { SimpleObj } from "./SimpleObj"; 7
import { sortify } from "./Sortify";

export function testGetValue() {
    const MY_CASES = [
        { obj: { a: 1 }, key: "a", val: 1 },
        { obj: { a: { b: 4 } }, key: "a.b", val: 4 },
        { obj: [6], key: "0", val: 6 },
        { obj: [{ x: 9 }], key: "0.x", val: 9 },
        { obj: null, key: "noex", val: null, def: null },
        { obj: { a: ["a", true, false] }, key: "a.2", val: false },
        { obj: { a: 1 }, key: "b", val: undefined },
        { obj: { x: { v: { a: null } } }, key: "x.v.a.n.j", val: "nada", def: "nada" },
    ];

    for (let i = 0; i < MY_CASES.length; i++) {
        const MY_CASE = MY_CASES[i];
        const obj = MY_CASE.obj;
        const key = MY_CASE.key;
        const def = MY_CASE.def;
        const myExpected = MY_CASE.val;
        const response = SimpleObj.getValue(obj, key, def);
        if (response !== myExpected) {
            throw Error(`expected ${JSON.stringify(myExpected)} actual ${JSON.stringify(response)}`);
        } else {
            console.log(`case ${i + 1} OK! ${JSON.stringify(myExpected)} equals ${JSON.stringify(response)}`);
        }
    }
}

export function testWriteValue() {
    const MY_CASES = [
        { obj: { a: 1 }, key: "a", val: 2, exp: { a: 2 } },
        { obj: { players: {} }, key: "players.P12", val: { name: "Edgar" }, exp: { players: { P12: { name: "Edgar" } } } },
    ];
    for (let i = 0; i < MY_CASES.length; i++) {
        const MY_CASE = MY_CASES[i];
        const obj = MY_CASE.obj;
        const key = MY_CASE.key;
        const val = MY_CASE.val;
        const myExpected = MY_CASE.exp;
        const response = SimpleObj.recreate(obj, key, val);
        const textoEsperado = sortify(myExpected);
        const textoCalculado = sortify(response);
        if (textoCalculado !== textoEsperado) {
            throw Error(`expected ${JSON.stringify(textoEsperado)} actual ${JSON.stringify(textoCalculado)}`);
        } else {
            console.log(`case ${i + 1} OK! ${JSON.stringify(textoEsperado)} equals ${JSON.stringify(textoCalculado)}`);
        }
    }
};

//testGetValue();
//testWriteValue();

