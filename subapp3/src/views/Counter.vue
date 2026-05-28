<script setup lang="ts">
import { ref } from "vue"

const count = ref(0)
</script>

<template>
  <section>
    <p>
      Client-side state lives entirely inside this iframe — completely isolated
      from the host page's JS realm.
    </p>
    <button @click="count++">Clicked {{ count }} time(s)</button>
  </section>
</template>

<style scoped>
button {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.375rem;
  font-size: 1rem;
  cursor: pointer;
}
button:hover {
  background: #f3f4f6;
}
</style>
