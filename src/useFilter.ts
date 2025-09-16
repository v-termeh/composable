import { computed, reactive } from "vue";
import type { PrimitiveType, CompoundType } from "@v-termeh/utils";
import { isString, isNumber, isNumeric, isArray, isCompoundType, isObject } from "@v-termeh/utils";
import { useSigner } from "./useSigner";
import { useStorage } from "./useStorage";

type OrderType = "asc" | "desc";
type StorableType = "limit" | "sorts";
type FilterType = Record<string, CompoundType>;
type Callback = (params: Record<string, unknown>, urlEncoded: string) => void;

export interface Sort {
    field: string;
    order: OrderType;
}

export interface Filters {
    page: number;
    limit: number;
    search: string;
    sorts: Sort[];
    filters: FilterType;
}

/**
 * Provides a composable filter utility for managing and persisting filter state,
 * including pagination, sorting, searching, and custom filters. Integrates with
 * storage, encoding, and signing utilities to persist and validate filter state.
 *
 * @template TRecord - The type of the record data.
 * @template TMeta - The type of the meta data.
 *
 * @param storagePrefix - The prefix used for storage keys.
 * @param options - Optional configuration for storables and default filter values.
 * @param options.storables - The filter options to persist in storage, or "all" to persist all.
 * @param options.defaults - Default values for the filter state.
 *
 * @returns An object containing reactive filter state, computed properties, and filter management methods.
 */
export function useFilter<TRecord extends object, TMeta extends object>(
    storagePrefix: string,
    options?: {
        storables?: StorableType[] | "all";
        defaults?: Partial<Filters>;
    }
) {
    // composables
    const utils = useUtils();
    const signer = useSigner();
    const encoder = useEncoder();
    const storage = useStorage(localStorage, storagePrefix);
    const response = useResponse<TRecord, TMeta>();

    // options with defaults
    options = {
        // options
        storables: "all",
        ...utils.removeZero({
            storables: options?.storables,
        }),
        // defaults
        defaults: {
            page: 1,
            limit: 20,
            search: "",
            sorts: [],
            filters: {},
            ...utils.removeZero(options?.defaults),
            ...utils.removeZero({
                limit: utils.isValidOption("limit", options?.storables)
                    ? storage.number("limit")
                    : undefined,
                sort: utils.isValidOption("sorts", options?.storables)
                    ? encoder.decodeSorts(storage.string("sorts") || "") || undefined
                    : undefined,
            }),
        },
    };

    // Stats
    const stats = reactive<{
        sign: string;
        locked: boolean;
        callback?: Callback;

        // values
        page: number;
        limit: number;
        search: string;
        sorts: Sort[];
        filters: FilterType;
    }>({
        sign: "",
        locked: false,
        callback: undefined,

        page: utils.positiveSafe(options?.defaults?.page, 0)!,
        limit: utils.positiveSafe(options?.defaults?.limit, 0)!,
        search: utils.stringSafe(options?.defaults?.search, "")!,
        sorts: utils.arraySafe<Sort>(options?.defaults?.sorts, [])!,
        filters: utils.objectSafe<FilterType>(options?.defaults?.filters, {})!,
    });

    // Computed
    const page = computed(() => stats.page);
    const limit = computed(() => stats.limit);
    const search = computed(() => stats.search);
    const sort = computed(() => stats.sorts?.[0]);
    const sorts = computed(() => stats.sorts);
    const filters = computed(() => ({ ...utils.removeZero(stats.filters) }));
    const isFiltered = computed(() => Object.keys(filters.value).length > 0);
    function filter<T extends CompoundType>(key: string) {
        return computed<T | undefined>(() => stats.filters?.[key] as T);
    }

    /**
     * Registers a callback to be called when filters are applied.
     * @param callback - The callback function.
     */
    function onApply(callback: Callback) {
        stats.callback = callback;
    }

    /**
     * Parses and applies filters from an encoded URL string.
     * @param encoded - The encoded filter string.
     */
    function parseURL(encoded: string) {
        apply(encoder.decode(encoded));
    }

    /**
     * Parses and applies filters from a response object.
     * @param r - The response object.
     */
    function parseResponse(r: unknown) {
        apply(response.parse(r));
    }

    /**
     * Applies new filter values, updates state, persists changes, and triggers callbacks.
     * @param filters - Partial filter values to apply.
     */
    async function apply(filters: Partial<Filters>) {
        if (stats.locked) return;
        stats.locked = true;
        try {
            if (utils.positiveSafe(filters?.page, 0)! > 0) {
                stats.page = Number(filters.page);
            }

            if (utils.positiveSafe(filters?.limit, 0)! > 0) {
                stats.limit = Number(filters.limit);
            }

            if (isString(filters.search) && filters.search != "") {
                stats.search = filters.search;
            }

            if (isArray(filters.sorts)) {
                stats.sorts = filters.sorts;
            }

            if (isObject(filters.filters)) {
                stats.filters = (utils.removeZero(filters.filters) ?? {}) as FilterType;
            }

            // Store changes and call callback
            const params = {
                page: stats.page,
                limit: stats.limit,
                search: stats.search,
                sorts: stats.sorts,
                filters: { ...stats.filters },
            };

            const isSame = await signer.validate(params, stats.sign);
            if (!isSame) {
                stats.sign = await signer.sign(params);
                stats.callback?.(params, encoder.encode(params));

                // Store filter options
                const limit = utils.positiveSafe(stats.limit, 0)!;
                const sorts = utils.arraySafe<Sort>(stats.sorts, [])!;
                if (utils.isValidOption("limit", options?.storables) && limit > 0) {
                    storage.set("limit", limit.toString());
                }
                if (utils.isValidOption("sorts", options?.storables) && sorts.length) {
                    storage.set("sorts", encoder.encodeSorts(sorts));
                }
            }
        } finally {
            stats.locked = false;
        }
    }

    return {
        page,
        limit,
        search,
        sort,
        sorts,
        filters,
        isFiltered,
        filter,
        total: response.total,
        from: response.from,
        to: response.to,
        pages: response.pages,
        meta: response.meta,
        records: response.records,
        onApply,
        parseURL,
        parseResponse,
        apply,
    };
}

/**
 * A composable function that manages and parses paginated API response data in a reactive way.
 *  *
 * @template TRecord - The type of each record in the response data array.
 * @template TMeta - The type of the meta object in the response.
 *
 * @property {ComputedRef<number>} total - The total number of records.
 * @property {ComputedRef<number>} from - The starting record index in main database.
 * @property {ComputedRef<number>} to - The ending record index in main database.
 * @property {ComputedRef<number>} pages - The total number of pages.
 * @property {ComputedRef<TMeta>} meta - The meta information from the response.
 * @property {ComputedRef<TRecord[]>} records - The array of records in the response.
 * @property {ComputedRef<boolean>} isEmpty - Whether the records array is empty.
 *
 * @returns An object containing computed properties for pagination and metadata, utility getters, and a parser method.
 */
function useResponse<TRecord, TMeta>() {
    const utils = useUtils();
    const response = reactive<Record<string, unknown>>({});

    // getters
    const total = computed(() => utils.positiveSafe(response.total));
    const from = computed(() => utils.positiveSafe(response.from));
    const to = computed(() => utils.positiveSafe(response.to));
    const pages = computed(() => utils.positiveSafe(response.pages));
    const meta = computed(() => utils.objectSafe<TMeta>(response.meta));
    const records = computed(() => utils.arraySafe<TRecord>(response.data, []));
    const isEmpty = computed(() => records.value!.length <= 0);

    // utilities
    /**
     * Gets the current page number from the response.
     * @returns {number} The current page number, or a safe default if not present.
     */
    function getPage() {
        return utils.positiveSafe(response.page);
    }

    /**
     * Gets the current page size (limit) from the response.
     * @returns {number} The current limit, or a safe default if not present.
     */
    function getLimit() {
        return utils.positiveSafe(response.limit);
    }

    /**
     * Gets the current search query from the response.
     * @returns {string} The search query string, or a safe default if not present.
     */
    function getSearch() {
        return utils.stringSafe(response.search);
    }

    /**
     * Gets the current sorting options from the response.
     * @returns {Sort[]} An array of sorting options, or an empty array if not present.
     */
    function getSorts() {
        return utils.arraySafe<Sort>(response.sorts);
    }

    /**
     * Gets the current filter object from the response.
     * @returns {FilterType} The filter object, or a safe default if not present.
     */
    function getFilters() {
        return utils.objectSafe<FilterType>(response.filters);
    }

    /**
     * Parses a raw response object, updates the internal state, and returns a sanitized filter object.
     * If the input is not an object, resets the internal state and returns an empty object.
     * @param {unknown} r - The raw response object to parse.
     * @returns {Partial<Filters>} The sanitized filter object.
     */
    function parse(r: unknown): Partial<Filters> {
        if (isObject(r)) {
            Object.assign(response, r);
            return utils.removeZero({
                page: getPage(),
                limit: getLimit(),
                search: getSearch(),
                sorts: getSorts(),
                filters: getFilters(),
            });
        } else {
            Object.keys(response).forEach((k) => delete response[k]);
            return {};
        }
    }

    return {
        total,
        from,
        to,
        pages,
        meta,
        records,
        isEmpty,
        getPage,
        getLimit,
        getSearch,
        getSorts,
        getFilters,
        parse,
    };
}

/**
 * Creates a utility for encoding and decoding Filters objects to/from URL query strings.
 * @returns An object with `encode` and `decode` methods to handle Filters objects.
 */
function useEncoder() {
    const utils = useUtils();

    /**
     * Encodes a primitive value for URL query string.
     * @param v The primitive value to encode (string, number, boolean, or null).
     * @returns The encoded value, with null represented as "[null]".
     */
    function encodeValue(v: PrimitiveType): string {
        return v == null ? encodeURIComponent("[null]") : encodeURIComponent(String(v));
    }

    /**
     * Decodes a URL-encoded string.
     * @param v The encoded string to decode.
     * @returns The decoded string.
     */
    function decodeValue(v: string): string {
        return decodeURIComponent(v);
    }

    /**
     * Infers the type of a decoded string value.
     * @param value The decoded string to infer type from.
     * @returns The inferred value as a PrimitiveType (string, number, boolean, or null).
     */
    function inferType(value: string): PrimitiveType {
        value = decodeValue(value);
        if (value === "true") return true;
        if (value === "false") return false;
        if (value === "[null]") return null;
        if (isNumeric(value)) return Number(value);
        return value;
    }

    /**
     * Encodes an array of primitive values into a comma-separated string.
     * @param value The array of primitive values to encode.
     * @returns A comma-separated string of encoded values.
     */
    function encodeArray(value: PrimitiveType[]): string {
        return value.map((v) => encodeValue(v)).join(",");
    }

    /**
     * Decodes a comma-separated string into an array of primitive values.
     * @param encoded The encoded string to decode.
     * @returns An array of decoded primitive values.
     */
    function decodeArray(encoded: string): PrimitiveType[] {
        return encoded.split(",").map(inferType);
    }

    /**
     * Encodes a plain object into a comma-separated key-value string.
     * @param value The object to encode.
     * @returns A comma-separated string of encoded key-value pairs.
     */
    function encodeObject(value: Record<string, PrimitiveType>): string {
        return Object.entries(value)
            .map(([k, v]) => `${encodeValue(k)}:${encodeValue(v)}`)
            .join(",");
    }

    /**
     * Decodes a comma-separated key-value string into a plain object.
     * @param encoded The encoded string to decode.
     * @returns A plain object with decoded key-value pairs.
     */
    function decodeObject(encoded: string): Record<string, PrimitiveType> {
        const obj: Record<string, PrimitiveType> = {};
        encoded.split(",").forEach((part) => {
            const [k, v] = part.split(":");
            if (k.trim() && v) {
                obj[decodeValue(k.trim())] = inferType(v);
            }
        });
        return obj;
    }

    /**
     * Encodes an array of Sort objects into a comma-separated string.
     * @param sorts The array of Sort objects to encode.
     * @returns A comma-separated string of encoded field-order pairs.
     */
    function encodeSorts(sorts: Sort[]): string {
        return sorts
            .map((sort) => `${encodeValue(sort.field)}:${encodeValue(sort.order)}`)
            .join(",");
    }

    /**
     * Decodes a comma-separated string into an array of Sort objects.
     * @param encoded The encoded string to decode.
     * @returns An array of Sort objects, filtering out invalid entries.
     */
    function decodeSorts(encoded: string): Sort[] {
        return encoded
            .split(",")
            .filter((i) => i && i.includes(":"))
            .map((i) => {
                const [field, order] = i.split(":");
                if (!field.trim() || !order) return undefined;
                const f = decodeValue(field.trim());
                const o = decodeValue(order);
                return f && utils.isOrderType(o) ? { field: f, order: o } : undefined;
            })
            .filter((i): i is Sort => i !== undefined);
    }

    /**
     * Encodes a Filters object into a URL query string.
     * @param state The Filters object containing page, limit, sorts, search, and filters.
     * @returns A URL-encoded query string.
     */
    function encode(state: Filters): string {
        const params = new URLSearchParams();

        if (isNumber(state.page) && state.page > 0) {
            params.set("page", String(state.page));
        }

        if (isNumber(state.limit) && state.limit > 0) {
            params.set("limit", String(state.limit));
        }

        if (isString(state.search) && state.search != "") {
            params.set("search", state.search);
        }

        if (isArray(state.sorts) && state.sorts.length > 0) {
            params.set("sorts", encodeSorts(state.sorts));
        }

        if (isObject(state.filters)) {
            for (const [key, value] of Object.entries(state.filters)) {
                if (isArray(value)) {
                    params.set(key, encodeArray(value));
                } else if (isObject(value)) {
                    params.set(key, encodeObject(value));
                } else {
                    params.set(key, encodeValue(value));
                }
            }
        }

        return params.toString();
    }

    /**
     * Decodes a URL query string into a Filters object.
     * @param query The URL-encoded query string to decode.
     * @returns A Filters object with parsed values. The `filters` property is an empty object if no valid filters are found.
     */
    function decode(query: string): Filters {
        const params = new URLSearchParams(query);
        const state: Filters = {
            page: 0,
            limit: 0,
            search: "",
            sorts: [],
            filters: {},
        };

        if (params.has("page") && utils.positiveSafe(params.get("page"), 0)! > 0) {
            state.page = Number(params.get("page"));
        }

        if (params.has("limit") && utils.positiveSafe(params.get("limit"), 0)! > 0) {
            state.limit = Number(params.get("limit"));
        }

        if (params.has("search")) {
            state.search = params.get("search") ?? "";
        }

        if (params.has("sorts")) {
            state.sorts = decodeSorts(params.get("sorts")?.trim() ?? "");
        }

        for (const [key, value] of params.entries()) {
            if (["page", "limit", "search", "sorts"].includes(key)) continue;

            const filter = decodeValue(key).trim();
            if (filter) {
                if (value.includes(",") && !value.includes(":")) {
                    state.filters[filter] = decodeArray(value);
                } else if (value.includes(":")) {
                    state.filters[filter] = decodeObject(value);
                } else {
                    state.filters[filter] = inferType(value);
                }
            }
        }

        return state;
    }

    return {
        encode,
        decode,
        encodeArray,
        decodeArray,
        encodeObject,
        decodeObject,
        encodeSorts,
        decodeSorts,
    };
}

/**
 * Creates a utility object with helper functions for common operations.
 * @returns An object containing utility functions.
 */
function useUtils() {
    /**
     * Checks if a value is a valid OrderType ("asc" or "desc").
     * @param v The value to check.
     * @returns True if the value is "asc" or "desc", false otherwise.
     */
    function isOrderType(v: unknown): v is OrderType {
        return v === "asc" || v === "desc";
    }

    /**
     * Checks if a value is a valid Sort object.
     * @param v The value to check.
     * @returns True if the value is valid sort object, false otherwise.
     */
    function isSortType(v: unknown): v is Sort {
        return (
            isObject(v) &&
            "field" in v &&
            isString(v?.field) &&
            "order" in v &&
            isOrderType(v.order)
        );
    }

    /**
     * Checks if a value is a valid FilterType.
     * @param v - The value to check.
     * @returns True if the value conforms to FilterType, false otherwise.
     */
    function isFilterType(v: unknown): v is FilterType {
        return isObject(v) && Object.values(v).every(isCompoundType);
    }

    /**
     * Checks if a key is a valid option based on provided options.
     * @param key The key to validate.
     * @param options An array of valid options or the string "all" to allow any key. If undefined, returns false.
     * @returns True if the key is valid, false otherwise.
     */
    function isValidOption<T = any>(key: T, options?: T[] | "all"): boolean {
        return (isArray(options) && options.includes(key)) || options === "all";
    }

    /**
     * Removes keys with undefined or empty values from an object.
     * @param v The input object to process (optional).
     * @returns A new object with all undefined values removed. Returns an empty object if input is undefined or null.
     */
    function removeZero<T extends Record<string, unknown>>(v?: T): Record<string, unknown> {
        if (isObject(v)) {
            return Object.fromEntries(
                Object.entries(v).filter(
                    ([_, v]) =>
                        !(
                            v === undefined ||
                            (isArray(v) && !v.length) ||
                            (isObject(v) && !Object.keys(v).length)
                        )
                )
            );
        }

        return {};
    }

    /**
     * Returns the value if it is truthy, otherwise returns the alternative.
     * @param values - The values to check.
     * @param alt - The alternative value to return if v is falsy.
     * @returns The value or the alternative.
     */
    function alter<T>(alt: T, ...values: T[]): T {
        function isValidValue(v: unknown): boolean {
            if (v == null) return false;
            if (isArray(v)) return v.length > 0;
            if (isObject(v)) return Object.keys(v).length > 0;
            return !!v;
        }

        for (const v of values) {
            if (isValidValue(v)) {
                return v;
            }
        }

        return alt;
    }

    /**
     * Generic safe helper to validate, transform, and fallback a value.
     *
     * @template T The return type.
     * @param v The input value.
     * @param check A predicate function that validates the input.
     * @param map A transformer function to convert the input to the expected type.
     * @param fallback The fallback value if check fails.
     * @returns The transformed value if valid, otherwise fallback.
     */
    function safe<T>(
        v: unknown,
        check: (v: unknown) => boolean,
        map: (v: unknown) => T,
        fallback?: T
    ): T | undefined {
        return check(v) ? map(v) : fallback;
    }

    /**
     * Returns a string if the value is a non-empty string, otherwise returns fallback.
     */
    function stringSafe(v: unknown, fallback?: string): string | undefined {
        return safe(
            v,
            (x) => isString(x) && x !== "",
            (x) => x as string,
            fallback
        );
    }

    /**
     * Returns a trimmed string if the value is a non-empty string after trim, otherwise returns fallback.
     */
    function stringTrimSafe(v: unknown, fallback?: string): string | undefined {
        return safe(
            v,
            (x) => isString(x) && x.trim() !== "",
            (x) => (x as string).trim(),
            fallback
        );
    }

    /**
     * Returns a positive number if the value is numeric and greater than 0, otherwise returns fallback.
     */
    function positiveSafe(v: unknown, fallback?: number): number | undefined {
        return safe(
            v,
            (x) => isNumeric(x) && Number(x) > 0,
            (x) => Number(x),
            fallback
        );
    }

    /**
     * Returns a non-empty array if the value is an array, otherwise returns fallback.
     */
    function arraySafe<T>(v: unknown, fallback?: T[]): T[] | undefined {
        return safe(
            v,
            (x) => Array.isArray(x) && x.length > 0,
            (x) => x as T[],
            fallback
        );
    }

    /**
     * Returns the value if it is an object, otherwise returns fallback.
     */
    function objectSafe<T>(v: unknown, fallback?: T): T | undefined {
        return safe(
            v,
            (x) => isObject(x),
            (x) => x as T,
            fallback
        );
    }

    return {
        isOrderType,
        isSortType,
        isFilterType,
        isValidOption,
        removeZero,
        alter,
        stringSafe,
        stringTrimSafe,
        positiveSafe,
        arraySafe,
        objectSafe,
    };
}
