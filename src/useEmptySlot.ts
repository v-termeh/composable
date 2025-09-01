import { computed, ref, type Slot, type VNode, Comment, Text, Fragment } from "vue";
import type { VNodeChild } from "@vue/runtime-core";

/**
 * Composable to check if a Vue slot is empty.
 * A slot is considered empty if it contains only Comments, empty Text nodes, or empty Fragments.
 * @param slot - The Vue slot to check (optional).
 * @returns An object containing computed `isEmpty` (whether the slot is empty) and `hasError` (whether an error occurred).
 */
export function useEmptySlot(slot?: Slot) {
    const error = ref<Error | null>(null);

    /**
     * Recursively checks if a VNode is empty.
     * Optimized for early exit on non-empty nodes.
     * @param node - The VNode to check.
     * @returns True if the VNode is empty, false otherwise.
     */
    const isVNodeEmpty = (node: VNode): boolean => {
        if (node.type === Comment) return true;

        if (node.type === Text) {
            return node.children == null || !String(node.children).trim();
        }

        if (node.type === Fragment) {
            const children = node.children as VNodeChild;
            if (!children) return true;

            if (Array.isArray(children)) {
                return !children.some((child) => {
                    if (typeof child === "string" || child == null) {
                        return !!String(child).trim();
                    }
                    return !isVNodeEmpty(child as VNode);
                });
            }

            if (typeof children === "string") {
                return !children.trim();
            }
            if (children && typeof children === "object") {
                return isVNodeEmpty(children as VNode);
            }
            return true;
        }

        return false;
    };

    const isEmpty = computed(() => {
        error.value = null;
        if (!slot) return true;

        try {
            const nodes: VNode[] | undefined = slot();
            if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return true;
            return !nodes.some((node) => !isVNodeEmpty(node));
        } catch (err) {
            console.warn("Error evaluating slot:", err);
            error.value = err as Error;
            return true;
        }
    });

    const hasError = computed(() => !!error.value);

    return { isEmpty, hasError };
}
