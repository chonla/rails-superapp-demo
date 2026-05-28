<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router"
</script>

<template>
  <div class="subapp-root">
    <header>
      <h1>Sub App 3</h1>
      <p class="subtitle">Vue 3 + Vite SPA, embedded via &lt;iframe&gt;</p>
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/counter">Counter</RouterLink>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style>
:root {
  font-family: system-ui, -apple-system, sans-serif;
  color: #1f2937;
}

body {
  margin: 0;
  padding: 1.25rem;
  background: #f9fafb;
}

.subapp-root {
  max-width: 640px;
}

header h1 {
  font-size: 1.25rem;
  margin: 0 0 0.25rem;
}

.subtitle {
  margin: 0 0 0.75rem;
  color: #6b7280;
  font-size: 0.875rem;
}

nav {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

nav a {
  color: #2563eb;
  text-decoration: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

nav a.router-link-active {
  background: #dbeafe;
}
</style>
