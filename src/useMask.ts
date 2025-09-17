import type { TemplateRef } from "vue";
import type {
    MaskitoMask,
    MaskitoOptions,
    MaskitoElement,
} from "@maskito/core";
import type { MaskitoNumberParams } from "@maskito/kit";
import { onMounted, onUnmounted } from "vue";
import { maskitoTransform, Maskito } from "@maskito/core";
import { maskitoNumberOptionsGenerator } from "@maskito/kit";

/**
 * Maps custom string tokens to their corresponding RegExp patterns.
 * Useful for defining reusable mask patterns.
 * @example { '#': /[0-9]/, 'A': /[a-z]/i }
 */
export type MaskTokenMap = Record<string, RegExp>;

/**
 * Represents a mask definition.
 * Can be:
 * - A simple string (e.g., '###-##')
 * - A MaskitoMask array (e.g., [/\d/, /\d/, '-', /\d/])
 * - A dynamic function returning a MaskitoMask
 */
export type MaskDefinition = string | MaskitoMask;

/**
 * Represents a Maskito pattern with optional options and mask.
 */
export interface MaskOption {
    /** Maskito options to apply (optional) */
    options?: MaskitoOptions;
    /** Mask definition (string, MaskitoMask, or function) */
    mask?: MaskDefinition;
}

/**
 * Create a MaskOption for a given mask pattern.
 */
export function patternMask(pattern: MaskDefinition): MaskOption {
    return { mask: pattern };
}

/**
 * Create a MaskOption for numeric inputs with MaskitoNumberParams.
 */
export function numericMask(options: MaskitoNumberParams): MaskOption {
    return { options: maskitoNumberOptionsGenerator(options) };
}

/**
 * Create a custom MaskOption directly from MaskitoOptions.
 */
export function customMask(option: MaskitoOptions): MaskOption {
    return { options: option };
}

/**
 * Main composable to handle Maskito masking in Vue.
 * @param globalOptions Default Maskito options
 * @param customTokens Optional custom tokens
 */
export function useMask(
    globalOptions?: MaskitoOptions,
    customTokens?: MaskTokenMap
) {
    const defaultTokens = {
        "#": /[0-9]/,
        A: /[a-z]/i,
        N: /[a-z0-9]/i,
        X: /./,
        ...customTokens,
    } as MaskTokenMap;
    const defaultOptions = { ...globalOptions } as MaskitoOptions;

    /**
     * Apply a mask manually on a string.
     * Overload: can accept either a MaskOption or directly a MaskDefinition.
     *
     * @param value The string to mask
     * @param option Either a MaskOption or a MaskDefinition
     * @returns The masked string
     */
    function mask(value: string, option: MaskOption): string {
        const resolvedOptions = resolveOptions(
            defaultTokens,
            defaultOptions,
            option
        );
        return maskitoTransform(value, resolvedOptions);
    }

    /**
     * Attach a mask directly to a HTML input element.
     * @param input The input element
     * @param option MaskOption defining mask/options
     * @returns Controller with `destroy()` method
     */
    function attachToInput(input: MaskitoElement, option: MaskOption) {
        const resolvedOptions = resolveOptions(
            defaultTokens,
            defaultOptions,
            option
        );
        const instance = new Maskito(input, resolvedOptions);

        return {
            destroy() {
                instance.destroy();
            },
        };
    }

    /**
     * Vue-friendly composable to attach a mask to a template ref.
     * Auto attaches on mount and cleans up on unmount.
     *
     * @param inputRef Ref to input element
     * @param option MaskOption defining mask/options
     * @returns Controller with `update()` and `destroy()` methods
     */
    function useInputMask(
        inputRef: TemplateRef<MaskitoElement | null>,
        option: MaskOption
    ) {
        let instance: { destroy: () => void } | null = null;

        function attach(opt: MaskOption) {
            if (inputRef.value) {
                instance = attachToInput(inputRef.value, opt);
            }
        }

        /**
         * Update the mask/options dynamically.
         * @param opt Optional MaskOption to override current mask/options
         */
        function update(opt?: MaskOption) {
            destroy();
            attach(opt ?? option);
        }

        /**
         * Destroy the mask instance and cleanup event listeners
         */
        function destroy() {
            if (instance) {
                instance.destroy();
                instance = null;
            }
        }

        onMounted(() => attach(option));
        onUnmounted(() => destroy());

        return { update, destroy };
    }

    return { mask, attachToInput, useInputMask };
}

/**
 * Parses a MaskDefinition into a usable MaskitoMask array or dynamic function.
 * Handles token replacement and escape characters.
 */
function parseMask(tokens: MaskTokenMap, mask: MaskDefinition): MaskitoMask {
    if (typeof mask === "function") return mask;
    if (mask instanceof RegExp) return mask;

    let mustEscape = false;
    return (Array.isArray(mask) ? mask : `${mask}`.split(""))
        .map((item) => {
            if (item instanceof RegExp) return item;

            if (mustEscape) {
                mustEscape = false;
                return item;
            }
            if (item === "!") {
                mustEscape = true;
                return "";
            }

            return tokens[item] || item;
        })
        .filter(Boolean);
}

/**
 * Resolves final MaskitoOptions by merging default/global options
 * with a MaskOption containing local options or mask.
 */
function resolveOptions(
    tokens: MaskTokenMap,
    globalOptions: MaskitoOptions,
    option: MaskOption
): MaskitoOptions {
    const mergedOptions = { ...globalOptions, ...(option.options ?? {}) };
    return option.mask
        ? { ...mergedOptions, mask: parseMask(tokens, option.mask) }
        : mergedOptions;
}
