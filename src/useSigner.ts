/**
 * A composable function to generate and validate a checksum for an object.
 * This is useful for detecting changes in the state regardless of key order.
 */
export function useSigner() {
    /**
     * Checks if a value is an array.
     * @typeParam T - The expected array element type.
     * @param v - The value to check.
     * @returns True if the value is an array, false otherwise.
     */
    function isArray<T>(v: unknown): v is T[] {
        return Array.isArray(v);
    }

    /**
     * Checks if a value is a plain object (not null or array).
     * @param v - The value to check.
     * @returns True if the value is a plain object, false otherwise.
     */
    function isObject(v: unknown): v is Record<string, unknown> {
        return v != null && typeof v === "object" && !Array.isArray(v);
    }

    /**
     * Encodes a value into a string representation.
     * - `null` becomes `[null]`
     * - `undefined` becomes `[undefined]`
     * - Other values are stringified using `String()`.
     *
     * @param v - The value to encode.
     * @returns Encoded string representation of the value.
     */
    function encodeValue(v: unknown): string {
        if (v === null) return "[null]";
        if (v === undefined) return "[undefined]";
        return String(v);
    }

    /**
     * Flattens an object into an array of "key:value" strings.
     * @param obj - The object to flatten.
     * @param prefix - The prefix used for nested keys (internal use).
     * @returns An array of flattened "key:value" strings.
     */
    function flatten(obj: unknown, prefix: string = ""): string[] {
        if (!isObject(obj) && !isArray(obj)) {
            return [`${prefix || "value"}:${encodeValue(obj)}`];
        }

        let result: string[] = [];

        for (const [k, v] of Object.entries(obj)) {
            const key = prefix ? `${prefix}.${k}` : k;

            if (isObject(v)) {
                result = result.concat(flatten(v, key));
            } else if (isArray(v)) {
                for (const el of v) {
                    if (isObject(el) || isArray(el)) {
                        result = result.concat(flatten(el, key));
                    } else {
                        result.push(`${key}:${encodeValue(el)}`);
                    }
                }
            } else {
                result.push(`${key}:${encodeValue(v)}`);
            }
        }

        return result.sort();
    }

    /**
     * Generates a SHA-256 checksum for the given object.
     * @param data The object to sign.
     * @returns A Promise that resolves to the hexadecimal checksum string.
     */
    async function sign(data: unknown): Promise<string> {
        const flatted = flatten(data).join("|");
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(flatted);
        const hashBuffer = await crypto.subtle.digest("SHA-256", encodedData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        return hashHex;
    }

    /**
     * Validates if the object's checksum matches the provided signature.
     * @param data The object to validate.
     * @param signature The checksum to compare against.
     * @returns A Promise that resolves to a boolean indicating the validation result.
     */
    async function validate(
        data: unknown,
        signature: string
    ): Promise<boolean> {
        const newSign = await sign(data);
        return newSign === signature;
    }

    return {
        sign,
        validate,
    };
}
