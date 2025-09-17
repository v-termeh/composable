import { ref, computed } from "vue";

/**
 * Countdown timer based on absolute time.
 * Accurate even if the tab is inactive or the user navigates away.
 */
export function useTimer() {
    const hours = ref(0);
    const minutes = ref(0);
    const seconds = ref(0);

    let interval: ReturnType<typeof setInterval> | null = null;
    let endTime: number | null = null; // timestamp in ms

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
        () => endTime !== null && Date.now() < endTime
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

        const durationMs = unit === "seconds" ? duration * 1000 : duration;
        endTime = Date.now() + durationMs;

        updateRemaining();
        startInterval();
    }

    /**
     * Stops the timer and resets it to zero.
     */
    function stopTimer() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
        endTime = null;
        hours.value = 0;
        minutes.value = 0;
        seconds.value = 0;
    }

    /**
     * Internal function to keep updating the displayed time.
     */
    function startInterval() {
        if (interval) return;
        interval = setInterval(updateRemaining, 1000);
    }

    /**
     * Updates the displayed remaining time based on endTime.
     */
    function updateRemaining() {
        if (!endTime) return;

        const now = Date.now();
        const diff = Math.max(0, Math.floor((endTime - now) / 1000));
        if (diff <= 0) {
            stopTimer();
            return;
        }

        hours.value = Math.floor(diff / 3600);
        minutes.value = Math.floor((diff % 3600) / 60);
        seconds.value = diff % 60;
    }

    return {
        hours,
        minutes,
        seconds,
        timer,
        isTimerRunning,
        startTimer,
        stopTimer,
    };
}
