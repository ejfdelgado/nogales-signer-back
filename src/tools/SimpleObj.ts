
export class SimpleObj {
    static recreate(obj: any, path: string, value: any): void {
        if (typeof path !== "string" || !path.length) return;

        const keys = path.split(".");
        let current = obj;

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const isLast = i === keys.length - 1;
            const isArrayIndex = /^\d+$/.test(key);

            if (isLast) {
                // Final assignment
                if (isArrayIndex) {
                    if (!Array.isArray(current)) current = [];
                    (current as any[])[Number(key)] = value;
                } else {
                    current[key] = value;
                }
            } else {
                const nextKey = keys[i + 1];
                const nextIsArray = /^\d+$/.test(nextKey);

                if (isArrayIndex) {
                    const index = Number(key);
                    if (!Array.isArray(current)) {
                        // Convert or initialize current as array
                        current = [];
                    }
                    if (!current[index]) {
                        current[index] = nextIsArray ? [] : {};
                    }
                    current = current[index];
                } else {
                    if (
                        typeof current[key] !== "object" ||
                        current[key] === null ||
                        (Array.isArray(current[key]) && !nextIsArray)
                    ) {
                        // Replace invalid types or wrong structure
                        current[key] = nextIsArray ? [] : {};
                    }
                    current = current[key];
                }
            }
        }
    }

    static getValue(obj: any, path: string, defaultValue: any = undefined): any {
        if (typeof path !== "string" || !path.length || obj === null || obj === undefined) return defaultValue;

        const keys = path.split(".");
        let current: any = obj;

        for (const key of keys) {
            if (current === undefined || current === null) return defaultValue;

            const isArrayIndex = /^\d+$/.test(key);
            if (isArrayIndex) {
                if (!Array.isArray(current)) return defaultValue;
                current = current[Number(key)];
            } else {
                if (typeof current !== "object") return defaultValue;
                current = current[key];
            }
        }
        return current === undefined ? (defaultValue) : current;
    }
}