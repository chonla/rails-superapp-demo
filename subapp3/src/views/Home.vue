<script setup lang="ts">
const now = new Date().toISOString()
</script>

<template>
  <section>
    <p>
      This sub-app is a stock Vue 3 + Vue Router build. It is embedded into
      <code>superapp</code> via an <code>&lt;iframe&gt;</code> pointed at this
      app's own origin &mdash; no super-app-specific configuration is required
      here.
    </p>
    <p>Page rendered at <code>{{ now }}</code>.</p>
  </section>
</template>
