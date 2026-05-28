import { createApp } from 'vue';
import { Quasar } from 'quasar';
import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';

import '@quasar/extras/material-icons/material-icons.css';

import 'quasar/src/css/index.sass';
import { router } from './router/router';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.use(Quasar, {
  plugins: {},
});
app.mount('#app');
