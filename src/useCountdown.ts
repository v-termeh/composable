import { ref, computed } from "vue";
import { toHMS } from "@v-termeh/utils";

/**
 * A Vue composable for managing a countdown timer.
 * @returns An object containing methods to start/stop the timer and computed properties for the formatted time and timer state.
 */
export function useCountdown() {
    const h = ref(0);
    const m = ref(0);
    const s = ref(0);

    let interval: ReturnType<typeof setInterval> | null = null;

    const hours = computed(() => h.value);
    const minutes = computed(() => m.value);
    const seconds = computed(() => s.value);

    /**
     * A computed property that returns the formatted timer.
     * Returns "00:00" if the timer is at or below zero.
     */
    const timer = computed(() => {
        if (h.value <= 0 && m.value <= 0 && s.value <= 0) {
            return "00:00";
        }

        const parts = [
            Math.max(0, m.value).toString().padStart(2, "0"),
            Math.max(0, s.value).toString().padStart(2, "0"),
        ];
        if (h.value > 0) {
            parts.unshift(h.value.toString().padStart(2, "0"));
        }
        return parts.join(":");
    });

    /**
     * A computed property indicating whether the timer is actively counting down.
     */
    const isTimerRunning = computed(
        () => interval !== null && (h.value > 0 || m.value > 0 || s.value > 0)
    );

    /**
     * Starts the countdown timer with the specified duration.
     * @param duration - The duration to count down from (non-negative number).
     * @param unit - The unit of the duration.
     */
    function startTimer(
        duration: number,
        unit: "milliseconds" | "seconds" = "seconds"
    ) {
        duration = Number(duration);
        if (!duration || !Number.isFinite(duration) || duration < 0) return;

        stopTimer();

        const parts = toHMS(duration, unit);
        h.value = parts.hours;
        m.value = parts.minutes;
        s.value = parts.seconds;

        startInterval();
    }

    /**
     * Resumes the timer from the current time, if paused and non-zero.
     */
    function resumeTimer() {
        if (h.value > 0 || m.value > 0 || s.value > 0) {
            startInterval();
        }
    }

    /**
     * Pauses the timer without resetting the current time.
     */
    function pauseTimer() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    }

    /**
     * Stops the timer and resets it to zero.
     */
    function stopTimer() {
        pauseTimer();
        h.value = 0;
        m.value = 0;
        s.value = 0;
    }

    /**
     * Internal function to start or resume the countdown interval.
     */
    function startInterval() {
        interval = setInterval(() => {
            s.value--;
            if (s.value < 0) {
                s.value = 59;
                m.value--;
                if (m.value < 0) {
                    m.value = 59;
                    h.value--;
                }
            }

            if (h.value <= 0 && m.value <= 0 && s.value <= 0) {
                stopTimer();
            }
        }, 1000);
    }

    return {
        hours,
        minutes,
        seconds,
        timer,
        isTimerRunning,
        startTimer,
        resumeTimer,
        pauseTimer,
        stopTimer,
    };
}
