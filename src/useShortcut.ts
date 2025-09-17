import { onMounted, onUnmounted } from "vue";

/**
 * A Vue composable for registering global keyboard shortcut handlers.
 * Listens for specified key combinations (e.g., "ctrl+s", "shift+enter") and executes a handler function when matched.
 * Supports multiple shortcuts and customizable event behavior.
 * @param shortcut - A single shortcut string (e.g., "ctrl+s") or an array of shortcut strings.
 * @param handler - The function to call when a shortcut is pressed, receiving the KeyboardEvent.
 * @param options - Optional configuration for event handling.
 * @param options.prevent - If true, calls `preventDefault()` on the event. Defaults to false.
 * @param options.stop - If true, calls `stopPropagation()` on the event. Defaults to false.
 */
export function useShortcut(
    shortcut: string | string[],
    handler: (e: KeyboardEvent) => void,
    options: {
        prevent?: boolean;
        stop?: boolean;
    } = {}
) {
    // Parse shortcuts into an array of objects with modifier keys and main key
    const shortcuts = (Array.isArray(shortcut) ? shortcut : [shortcut])
        .map<string[]>((i) => i.toLowerCase().split("+"))
        .map((parts) => {
            return {
                ctrl: parts.includes("ctrl"),
                shift: parts.includes("shift"),
                alt: parts.includes("alt"),
                meta: parts.includes("meta"),
                key: parts.find(
                    (k) => !["ctrl", "shift", "alt", "meta"].includes(k)
                ),
            };
        });

    // Event listener to check for matching shortcuts and trigger handler
    const listener = (e: KeyboardEvent) => {
        for (const sc of shortcuts) {
            const isMatch =
                e.ctrlKey === sc.ctrl &&
                e.shiftKey === sc.shift &&
                e.altKey === sc.alt &&
                e.metaKey === sc.meta &&
                e.key.toLowerCase() === (sc.key ?? "").toLowerCase();

            if (isMatch) {
                if (options.prevent) e.preventDefault();
                if (options.stop) e.stopPropagation();
                handler(e);
                break;
            }
        }
    };

    // Register the event listener when the component is mounted
    onMounted(() => {
        window.addEventListener("keydown", listener);
    });

    // Remove the event listener when the component is unmounted
    onUnmounted(() => {
        window.removeEventListener("keydown", listener);
    });
}
