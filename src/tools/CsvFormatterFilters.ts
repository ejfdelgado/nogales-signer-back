export class CsvFormatterFilters {
    static randomMemory: any = {};
    static formatRandomMemory() {
        console.log("Formating random memory");
        CsvFormatterFilters.randomMemory = {};
    }
    static parseInt(valor: any, myDefault = NaN) {
        const temp = parseInt(valor);
        if (isNaN(temp)) {
            return myDefault;
        } else {
            return temp;
        }
    }
    static parseFloat(valor: any, myDefault = NaN) {
        const temp = parseFloat(valor);
        if (isNaN(temp)) {
            return myDefault;
        } else {
            return temp;
        }
    }
    static json(valor: any) {
        return JSON.stringify(valor);
    }
    static rand(val: any, ...args: any[]) {
        let listaBase = args;
        if (!(listaBase instanceof Array)) {
            return "";
        }
        const keyMemory = val;
        let lista = CsvFormatterFilters.randomMemory[keyMemory];
        if (!(lista instanceof Array) || lista.length == 0) {
            lista = [...listaBase];
            CsvFormatterFilters.randomMemory[keyMemory] = lista;
        }
        const random = Math.random();
        //console.log(`random = ${random}`);
        const myRandom = Math.floor(random * lista.length);
        let choosed: any = "" + lista[myRandom];
        // Se saca de la lista
        lista.splice(myRandom, 1);
        if (/^\s*true\s*$/i.exec(choosed) !== null) {
            choosed = true;
        } else if (/^\s*false\s*$/i.exec(choosed) !== null) {
            choosed = false;
        } else if (/^\s*\d+\s*$/.exec(choosed) !== null) {
            choosed = parseInt(choosed);
        }
        return choosed;
    }
    static testRandom() {
        const lista = ["a", "b"];
        for (let i = 0; i < 10; i++) {
            console.log(CsvFormatterFilters.rand(lista));
        }
    }
    static map(myMap: any) {
        return (key: any) => {
            return myMap[key];
        }
    }
    static noNewLine(valor: any, replacer = "") {
        if (typeof valor == "string") {
            return valor.replace(/(?:\r\n|\r|\n)/g, replacer);
        }
        return valor;
    }
    static replace(valor: any, pattern: any, replacer = "") {
        if (typeof valor == "string") {
            return valor.replace(pattern, replacer);
        }
        return valor;
    }
}