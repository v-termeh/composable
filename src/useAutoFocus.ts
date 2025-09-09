import type { TemplateRef } from "vue";
import { onMounted } from "vue";

type FocusableElement = Pick<HTMLElement, "focus">;

/**
 * Automatically focuses the given input element when the component is mounted.
 *
 * @param inputRef A template ref to a focusable element (input, textarea, etc.)
 */
export function useAutoFocus(inputRef: TemplateRef<FocusableElement | null>) {
    onMounted(() => {
        if (inputRef.value) {
            inputRef.value?.focus();
        }
    });
}
