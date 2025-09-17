import type { TemplateRef } from "vue";
import { onMounted, onUnmounted } from "vue";

type ClearableElement = Pick<
    HTMLInputElement,
    | "addEventListener"
    | "removeEventListener"
    | "selectionStart"
    | "setRangeText"
    | "dispatchEvent"
    | "value"
>;

/**
 * Clears the input value when Escape key is pressed.
 * Optionally clears only the portion around a separator.
 *
 * @param inputRef Ref to an input or textarea element
 * @param separator Optional string to determine selection boundaries
 */
export function useAutoClear(
    inputRef: TemplateRef<ClearableElement | null>,
    separator?: string
) {
    if (!inputRef) return;

    const handler = (ev: KeyboardEvent) => {
        if (ev.code !== "Escape") return;

        const el = inputRef.value;
        if (!el) return;

        let start = 0;
        let end = el.value.length;

        if (separator) {
            const pos = el.selectionStart || 0;

            // find start
            for (let i = pos - 1; i >= 0; i--) {
                if (el.value[i] === separator) {
                    start = i;
                    break;
                }
            }

            // find end
            for (let i = pos; i < el.value.length; i++) {
                if (el.value[i] === separator) {
                    end = i;
                    break;
                }
            }
        }

        el.setRangeText("", start, end);
        el.dispatchEvent(
            new Event("input", { bubbles: true, cancelable: true })
        );
    };

    onMounted(() => {
        inputRef.value?.addEventListener("keydown", handler);
    });

    onUnmounted(() => {
        inputRef.value?.removeEventListener("keydown", handler);
    });
}
