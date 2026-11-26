import { createApp } from "vue";
import App from "./App.vue";
import "./styles/app.css";
import { initRouter } from "./router.js";

initRouter();
createApp(App).mount("#app");