import { deepClone } from "@v-termeh/utils";
import { reactive } from "vue";

/**
 * Strategy to apply when merging a configuration path.
 *
 * - `"merge"`: Deep merge the new value into the existing value.
 * - `"replace"`: Replace the existing value entirely with the new value.
 * - `"safe"`: If the new value is `undefined`, ignore it.
 */
export type MergeStrategy = "merge" | "replace" | "safe";

/**
 * Makes all properties in T (and nested objects) optional.
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object
        ? T[P] extends Function
            ? T[P]
            : DeepPartial<T[P]>
        : T[P];
};

/**
 * Options for controlling how specific paths are merged in `useConfig`.
 */
type MergeOptions = Record<string, MergeStrategy>;

/**
 * Generic composable for managing immutable and reactive configuration
 * with path-based merge strategies.
 *
 * @template T - The type of the configuration object.
 * @param defaultConfig - The default configuration object. It is cloned internally to keep it immutable.
 * @returns An object containing:
 * - `config`: reactive version of the configuration.
 * - `set(newConfig, options)`: function to merge a partial config with path-based strategies.
 */
export function useConfig<T extends Record<string, any>>(defaultConfig: T) {
    const config = reactive(deepClone(defaultConfig));

    function set(newConfig: DeepPartial<T>, options?: MergeOptions) {
        const strategies = options || {};

        /**
         * Internal recursive function to perform deep merge.
         * It mutates the target object directly.
         */
        function merge(target: any, source: any, path = ""): void {
            if (
                typeof source !== "object" ||
                source === null ||
                Array.isArray(source)
            ) {
                return;
            }

            for (const key of Object.keys(source)) {
                const currentPath = path ? `${path}.${key}` : key;
                const strategy = strategies[currentPath];

                const sourceValue = source[key];
                const targetValue = target[key];

                // Apply "safe" strategy: ignore `undefined` values
                if (strategy === "safe" && sourceValue === undefined) {
                    continue;
                }

                // Default "safe" behavior for non-specified paths (unless it's an object)
                if (
                    strategy === undefined &&
                    typeof sourceValue !== "object" &&
                    sourceValue === undefined
                ) {
                    continue;
                }

                // Apply "replace" strategy or replace for arrays
                if (strategy === "replace" || Array.isArray(sourceValue)) {
                    target[key] = deepClone(sourceValue);
                    continue;
                }

                // Deep merge for nested objects with "merge" strategy or as default behavior
                if (
                    typeof sourceValue === "object" &&
                    sourceValue !== null &&
                    typeof targetValue === "object" &&
                    targetValue !== null
                ) {
                    merge(targetValue, sourceValue, currentPath);
                } else {
                    // Default behavior: replace the value
                    target[key] = deepClone(sourceValue);
                }
            }
        }

        merge(config, newConfig);
    }

    return { config, set };
}
