import type { DeepPartial, MergeOptions } from "@v-termeh/utils";
import { deepClone, mergeConfig } from "@v-termeh/utils";
import { reactive, toValue } from "vue";

/**
 * A generic composable for managing a reactive configuration object
 * that can be updated with path-based merge strategies.
 *
 * @template T - The type of the configuration object.
 * @param defaultConfig - The base configuration object. It is deep-cloned
 * internally to ensure the original object remains unchanged.
 * @returns An object containing:
 * - `config`: A reactive version of the configuration.
 * - `set`: A function to update the configuration by merging a new partial config.
 */
export function useConfig<T extends Record<string, any>>(defaultConfig: T) {
    // A reactive object to hold the configuration.
    const config = reactive(deepClone(defaultConfig));

    /**
     * Updates the reactive configuration by merging a new partial object.
     * This method uses `mergeConfig` to handle different merge strategies
     * for specific paths.
     *
     * @param newConfig - The partial configuration to merge.
     * @param options - A map of dot-separated paths to their specific merge strategies.
     */
    function set(newConfig: DeepPartial<T>, options?: MergeOptions) {
        const mergedResult = mergeConfig(toValue(config), newConfig, options);
        Object.assign(config, mergedResult);
    }

    return { config, set };
}
