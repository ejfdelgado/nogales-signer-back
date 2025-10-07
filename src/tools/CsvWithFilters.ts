
export interface FilterDataType {
    classes: { [key: string]: any };
    methods: { [key: string]: Function };
}

export class CsvWithFilters {
    static PATTERN_FILTER = "\\s*([^|\\s]+)(\\s*\\|\\s*([^:\\s]+)\\s*(:(.*))?)?";
    filterRegistry: FilterDataType = {
        classes: {

        },
        methods: {

        },
    };
    constructor() {
    }
    registerClass(name: string, myClass: any) {
        if (name) {
            this.filterRegistry.classes[name] = myClass;
            console.log(`registerClass(${name}) OK`);
        }
    }
    registerFunction(key: string, myFunction: Function) {
        if (typeof myFunction == "function") {
            this.filterRegistry.methods[key] = myFunction;
            //console.log(`registerFunction(${key}) OK`);
        }
    }
    filterValue(valor: any, columna: any, dato: any, defaultBase: any = undefined) {
        if (columna.theclass && columna.theclass in this.filterRegistry.classes) {
            const oneclass = this.filterRegistry.classes[columna.theclass];
            if (columna.themethod) {
                const onemethod = oneclass[columna.themethod];
                if (typeof onemethod == "function") {
                    let myarguments = [];
                    if (columna.useRow) {
                        myarguments.push(dato);
                    } else {
                        myarguments.push(valor);
                    }
                    myarguments = myarguments.concat(columna.argumentos);
                    valor = onemethod(...myarguments);
                }
            }
        } else if (columna.themethod && columna.themethod in this.filterRegistry.methods) {
            const onemethod = this.filterRegistry.methods[columna.themethod];
            let myarguments = [];
            if (columna.useRow) {
                myarguments.push(dato);
            } else {
                myarguments.push(valor);
            }
            if (["rand"].indexOf(columna.themethod) >= 0) {
                if (myarguments[0] === undefined) {
                    myarguments[0] = defaultBase;
                }
            }
            myarguments = myarguments.concat(columna.argumentos);
            valor = onemethod(...myarguments);
        }
        return valor;
    }
    getColumnDescription(header: string, separator: string = ";") {
        const columnas = [];
        const patron = new RegExp(`([^${separator}]+)`, "g");
        let partes = null;
        do {
            partes = patron.exec(header);
            if (partes !== null) {
                const completo = partes[1];
                const patron2 = new RegExp(CsvWithFilters.PATTERN_FILTER, "g");
                const subpartes = patron2.exec(completo);
                if (subpartes !== null) {
                    const desc: any = {
                        id: subpartes[1],
                        useRow: false,
                    };
                    if (subpartes[3] !== undefined) {
                        let subpartes3 = subpartes[3];
                        if (subpartes3[subpartes3.length - 1] == "*") {
                            subpartes3 = subpartes3.substring(0, subpartes3.length - 1);
                            desc.useRow = true;
                        }
                        let classMethod = subpartes3.split(".");
                        if (classMethod.length == 1) {
                            desc.themethod = classMethod[0];
                        } else {
                            desc.theclass = classMethod[0];
                            desc.themethod = classMethod[1];
                        }
                        const argumentos = [];
                        if (subpartes[5]) {
                            const allArguments = subpartes[5].split(":");
                            for (let k = 0; k < allArguments.length; k++) {
                                try {
                                    argumentos.push(JSON.parse(allArguments[k]));
                                } catch (err) { }
                            }
                        }
                        desc.argumentos = argumentos;
                    }
                    columnas.push(desc);
                }
            }
        } while (partes !== null);
        return columnas;
    }
};