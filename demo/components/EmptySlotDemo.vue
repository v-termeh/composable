<script setup lang="ts">
import { useEmptySlot } from "../../src/useEmptySlot";
import { useSlots } from "vue";
const slots = useSlots();
const { isEmpty, hasError } = useEmptySlot(slots.demo);
</script>

<template>
    <div>
        <h2>useEmptySlot Demo</h2>
        <slot name="demo" />
        <div>
            <span v-if="isEmpty">Slot is empty</span>
            <span v-else>Slot is not empty</span>
            <span v-if="hasError" style="color: red"> (Error)</span>
        </div>
    </div>
</template>
