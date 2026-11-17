import { createApp } from 'vue';
import 'uno.css';
import './styles/css/global.css';
import { setupI18n } from './locales';
import PreparationApp from './preparation/app.vue';

const app = createApp(PreparationApp);
setupI18n(app);
app.mount('#app');
