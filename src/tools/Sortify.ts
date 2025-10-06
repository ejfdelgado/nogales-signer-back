export function sortify(value: any): string {
    return JSON.stringify(normalize(value));
}

function normalize(value: any): any {
    if (Array.isArray(value)) {
        // Normalize each element first
        const normalizedItems = value.map(normalize);
        // Sort array items by their JSON string representation
        return normalizedItems.sort((a, b) => {
            const sa = JSON.stringify(a);
            const sb = JSON.stringify(b);
            return sa.localeCompare(sb);
        });
    } else if (value && typeof value === "object") {
        const sorted: any = {};
        for (const key of Object.keys(value).sort()) {
            sorted[key] = normalize(value[key]);
        }
        return sorted;
    }
    return value;
}
