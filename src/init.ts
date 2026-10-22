import 'dotenv/config';
import { App } from './app';

const app = new App();

app.start().catch((error: unknown) => {
    console.error('No se pudo iniciar el servidor:', error);
    process.exitCode = 1;
});
