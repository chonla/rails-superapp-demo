import { createApp } from "vue"
import { createRouter, createWebHistory } from "vue-router"
import App from "./App.vue"
import Home from "./views/Home.vue"
import Counter from "./views/Counter.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/counter", name: "counter", component: Counter }
  ]
})

createApp(App).use(router).mount("#app")
