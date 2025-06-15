import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './common.scss';
import { useLocalStorage } from './composables/useLocalStorage';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// LocalStorageの初期化
useLocalStorage();

app.mount('#app');
