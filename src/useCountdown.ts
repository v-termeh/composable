import { ref, computed } from "vue";
import { toHMS } from "@v-termeh/utils";

/**
 * A Vue composable for managing a countdown timer.
 * @returns An object containing methods to start/stop the timer and computed properties for the formatted time and timer state.
 */
export function useCountdown() {
    const hours = ref(0);
    const minutes = ref(0);
    const seconds = ref(0);
    let interval: ReturnType<typeof setInterval> | null = null;

    /**
     * A computed property that returns the formatted timer.
     * Returns "00:00" if the timer is at or below zero.
     */
    const timer = computed(() => {
        if (hours.value <= 0 && minutes.value <= 0 && seconds.value <= 0) {
            return "00:00";
        }

        const parts = [
            Math.max(0, minutes.value).toString().padStart(2, "0"),
            Math.max(0, seconds.value).toString().padStart(2, "0"),
        ];
        if (hours.value > 0) {
            parts.unshift(hours.value.toString().padStart(2, "0"));
        }
        return parts.join(":");
    });

    /**
     * A computed property indicating whether the timer is actively counting down.
     */
    const isTimerRunning = computed(
        () => interval !== null && (hours.value > 0 || minutes.value > 0 || seconds.value > 0)
    );

    /**
     * Starts the countdown timer with the specified duration.
     * @param duration - The duration to count down from (non-negative number).
     * @param unit - The unit of the duration.
     */
    function startTimer(duration: number, unit: "milliseconds" | "seconds" = "seconds") {
        duration = Number(duration);
        if (!duration || !Number.isFinite(duration) || duration < 0) return;

        stopTimer();

        const parts = toHMS(duration, unit);
        hours.value = parts.hours;
        minutes.value = parts.minutes;
        seconds.value = parts.seconds;

        startInterval();
    }

    /**
     * Resumes the timer from the current time, if paused and non-zero.
     */
    function resumeTimer() {
        if (hours.value > 0 || minutes.value > 0 || seconds.value > 0) {
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
        hours.value = 0;
        minutes.value = 0;
        seconds.value = 0;
    }

    /**
     * Internal function to start or resume the countdown interval.
     */
    function startInterval() {
        interval = setInterval(() => {
            seconds.value--;
            if (seconds.value < 0) {
                seconds.value = 59;
                minutes.value--;
                if (minutes.value < 0) {
                    minutes.value = 59;
                    hours.value--;
                }
            }

            if (hours.value <= 0 && minutes.value <= 0 && seconds.value <= 0) {
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
