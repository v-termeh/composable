<script setup lang="ts">
import TimerDemo from "./components/TimerDemo.vue";
import CountdownDemo from "./components/CountdownDemo.vue";
import EmptySlotDemo from "./components/EmptySlotDemo.vue";
import MediaQueriesDemo from "./components/MediaQueriesDemo.vue";
</script>

<template>
    <div style="padding: 2rem; font-family: sans-serif">
        <h1>Composable Demos</h1>
        <hr />
        <TimerDemo />
        <hr />
        <CountdownDemo />
        <hr />
        <EmptySlotDemo>
            <template #demo>
                <!-- Try changing this slot content to test useEmptySlot -->
                <span>Slot content</span>
            </template>
        </EmptySlotDemo>
        <hr />
        <MediaQueriesDemo />
    </div>
</template>
