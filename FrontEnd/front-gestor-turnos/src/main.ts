import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { routes } from './app/app.routes';

// Usa la configuración definida en appConfig
bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
