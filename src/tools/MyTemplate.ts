import { CsvFormatterFilters } from "./CsvFormatterFilters";
import { CsvWithFilters } from "./CsvWithFilters";
import { SimpleObj } from "./SimpleObj";

export const pInicio = "\\$\\s*\\[\\s*for\\s+([^\\s\\]]+)\\s+in\\s+([^\\s\\]]+\\s*})\\]";
export const pFin = "\\$\\s*\\[\\s*endfor\\s*\\]";
export const pNoFor = "((?!\\$\\s*\\[for).)*?";
export const pAny = "(.*?)";

const pIfInicio = "\\$\\s*\\[\\s*if\\s+([^\\]]*?)\\s*\\]";
const pIfFin = "\\$\\s*\\[\\s*endif\\s*\\]";
const pElse = "\\$\\s*\\[\\s*else\\s*\\]";

export interface BoundsInterface {
    startIndex: number;
    finishIndex: number;
    formula?: any;
    varName?: string;
    arrayname?: string;
};

export class MyTemplate extends CsvWithFilters {
    static localGetValue(data: any, key: string) {
        // The key could be a JSON
        let trimed = key.trim();
        if (trimed.startsWith('"')) {
            // treated as json string
            return JSON.parse(key);
        }
        return SimpleObj.getValue(data, key);
    }
    static interpolate(text: string, model: any) {
        const renderer = new MyTemplate();
        return renderer.render(text, model);
    }
    // ${algo} -> algo
    static getBiggerOpenClose(
        text: string,
        startPattern: string,
        endPattern: string,
        openIndex: number,
        closeIndex: number,
        extractDataFun: Function,
        elsePattern: string | null = null,
        elseIndex = 4,
    ): null | {
        starterFor: BoundsInterface,
        closeFor: BoundsInterface,
        elseTag: BoundsInterface,
    } {
        let startOrEnd;
        if (elsePattern == null) {
            startOrEnd = new RegExp("(" + startPattern + ")|(" + endPattern + ")", "gsi");
        } else {
            startOrEnd = new RegExp("(" + startPattern + ")|(" + endPattern + ")|(" + elsePattern + ")", "gsi");
        }
        let m;
        let starterFor: any = null;
        let closeFor: any = null;
        let elseTag: any = null;
        let closeCounter = 0;
        do {
            m = startOrEnd.exec(text);
            if (m) {
                if (m[closeIndex] !== undefined) {
                    // Is closing
                    if (starterFor == null) {
                        throw Error("Template error, can not close without start");
                    }
                    if (closeCounter == 0) {
                        closeFor = {
                            startIndex: m.index,
                            finishIndex: m.index + m[0].length
                        };
                        break;
                    }
                    closeCounter--;
                } else if (m[openIndex] !== undefined) {
                    // Is oppening
                    if (starterFor == null) {
                        starterFor = extractDataFun(m);
                        starterFor.startIndex = m.index;
                        starterFor.finishIndex = m.index + m[0].length;
                    } else {
                        closeCounter++;
                    }
                } else if (m[elseIndex] !== undefined) {
                    if (closeCounter == 0) {
                        elseTag = {
                            startIndex: m.index,
                            finishIndex: m.index + m[0].length
                        };
                    }
                }
            }
        } while (m);
        if (starterFor == null) {
            //There is no mode fors...
            return null;
        }
        if (starterFor !== null && closeFor == null) {
            throw Error(`Expected close somewhere after ${starterFor.match}`);
        }
        return {
            starterFor,
            closeFor,
            elseTag
        };
    }
    static getBiggerIf(text: string) {
        const temp = MyTemplate.getBiggerOpenClose(text, pIfInicio, pIfFin, 1, 3, (m: any) => {
            return {
                formula: m[2],
            };
        }, pElse);
        if (temp == null) {
            return null;
        }
        const {
            starterFor,
            closeFor,
            elseTag,
        } = temp;
        const response: any = {
            formula: starterFor.formula,
            part1: text.substring(0, starterFor.startIndex),
            part2: text.substring(closeFor.finishIndex),
            localTemplateFalse: "",
        };

        if (elseTag == null) {
            response.localTemplateTrue = text.substring(starterFor.finishIndex, closeFor.startIndex);
        } else {
            response.localTemplateTrue = text.substring(starterFor.finishIndex, elseTag.startIndex);
            response.localTemplateFalse = text.substring(elseTag.finishIndex, closeFor.startIndex);
        }
        return response;
    }
    static getBiggerFor(text: string) {
        const temp = MyTemplate.getBiggerOpenClose(text, pInicio, pFin, 1, 4, (m: any) => {
            return {
                match: m[0],
                varName: m[2],
                arrayname: m[3],
            }
        });
        if (temp == null) {
            return null;
        }
        const starterFor: any = temp.starterFor;
        const closeFor: any = temp.closeFor;
        return {
            varName: starterFor.varName,
            arrayName: MyTemplate.getVariableNames(starterFor.arrayname),
            localTemplate: text.substring(starterFor.finishIndex, closeFor.startIndex),
            part1: text.substring(0, starterFor.startIndex),
            part2: text.substring(closeFor.finishIndex),
        };
    }
    static getVariableNames(text: string) {
        return text.replace(/\$\s*\{\s*([^}]+?)\s*\}/g, "$1");
    }
    replaceFors(template: string, data: any) {
        // Expand for
        // ${for color in colores} este es mi ${color.id} ${endfor}
        const someFor = MyTemplate.getBiggerFor(template);
        if (someFor == null) {
            return {
                template,
                times: 0,
            };
        }
        const {
            arrayName,
            localTemplate,
            part1,
            part2,
            varName
        } = someFor;
        let response: any[] = [];
        const valor = SimpleObj.getValue(data, arrayName);
        if (valor != null && typeof valor == "object") {
            const llaves = Object.keys(valor);
            response = llaves.map((llave) => {
                const keyPatter = new RegExp("\\$\\s*\\{" + varName, "g");
                //console.log(`keyPatter = ${keyPatter}`);
                return localTemplate.replace(keyPatter, (match) => {
                    return "${" + arrayName + "." + llave;
                });
            });
        }
        const middle = response.join("");
        return {
            template: part1 + middle + part2,
            times: 1
        };
    }
    computeIf(formula: string, data: any) {
        const plainFormula = this.replaceBareValues(formula, data, "\\{", "\\}", "\\}", true);
        //console.log(plainFormula);
        return eval(plainFormula);// Yes it's safe here, believeme, uncomment above
    }
    replaceIfs(template: string, data: any) {
        const someIf = MyTemplate.getBiggerIf(template);
        if (someIf == null) {
            return {
                template,
                times: 0,
            };
        }
        //console.log(plainFormula);
        const isTrue = this.computeIf(someIf.formula, data);
        if (isTrue === true) {
            return {
                template: someIf.part1 + someIf.localTemplateTrue + someIf.part2,
                times: 1,
            };
        } else {
            return {
                template: someIf.part1 + someIf.localTemplateFalse + someIf.part2,
                times: 1,
            };
        }
    }
    render(template: string, data: any, skipUndefined = false) {

        let iteration: any = {};
        do {
            iteration = this.replaceFors(template, data);
            template = iteration.template;
        } while (iteration.times > 0);

        // Evaluate ${if ...} ${endif}
        do {
            iteration = this.replaceIfs(template, data);
            template = iteration.template;
        } while (iteration.times > 0);

        // Replace values
        return this.replaceBareValues(template, data, undefined, undefined, undefined, false, skipUndefined);
    }
    replaceBareValues(template: string,
        data: any,
        open: string = "\\{",
        close: string = "\\}",
        closeNoScape: string = "}",
        useStringify: boolean = false,
        skipUndefined: boolean = false,
    ) {
        const myPattern = new RegExp("\\$\\s*" + open + "([^" + closeNoScape + "]+)\\s*" + close, "g");
        // Segond level replace
        const myPattern2d = new RegExp("(\\$\\s*" + open + "[^$" + closeNoScape + "]+)\\$" + open + "([^" + closeNoScape + "]+)" + close + "([^" + closeNoScape + "]*" + close + ")", "g");
        template = template.replace(myPattern2d, (match, g1, g2, g3) => {
            const response = this.getColumnDescription(g2)[0];
            const valor = MyTemplate.localGetValue(data, response.id);
            const temp = this.filterValue(valor, response, undefined, response.id);
            if (temp === undefined) {
                return match;
            } else {
                return g1 + temp + g3;
            }
        });
        template = template.replace(myPattern, (match, g1) => {
            const response = this.getColumnDescription(g1)[0];
            const valor = MyTemplate.localGetValue(data, response.id);
            if (!useStringify) {
                const temp = this.filterValue(valor, response, undefined, response.id);
                if (!skipUndefined) {
                    // Duplicated code...
                    if (typeof temp == "object") {
                        return JSON.stringify(temp);
                    }
                    return temp;
                } else {
                    if (temp === undefined) {
                        return match;
                    } else {
                        // Duplicated code...
                        if (typeof temp == "object") {
                            return JSON.stringify(temp);
                        }
                        return temp;
                    }
                }
            } else {
                const temp = this.filterValue(valor, response, undefined, response.id);
                return JSON.stringify(temp);
            }
        });
        return template;
    }

    // MyTemplate.readCall("call(sound, ${val} + ${val1}, param2)", { val: 5, val1: 8 });
    static readCall(texto: string, model: any) {
        const renderer = new MyTemplate();
        renderer.registerFunction("rand", CsvFormatterFilters.rand);
        const response: any = {
            action: null,
            arguments: [],
        }
        const partes = /^\s*call\(\s*([^,]+)\s*(.+)\)\s*$/ig.exec(texto);
        if (partes) {
            response.action = partes[1];
            const argumentos = partes[2].split(",");
            for (let i = 0; i < argumentos.length; i++) {
                const argumento = argumentos[i].trim();
                if (argumento.length > 0) {
                    try {
                        const evaluado = renderer.render(argumento, model);
                        try {
                            const evaluado2 = eval(evaluado);
                            response.arguments.push(evaluado2);
                        } catch (err0) {
                            response.arguments.push(evaluado);
                        }
                    } catch (err) {
                        response.arguments.push(argumento);
                    }
                }
            }
        }
        return response;
    }
};
