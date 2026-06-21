import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { TranslateService } from './core/services/translate.service';
import { ProjectContextService } from './core/services/project-context.service';
import { AuthService } from './core/services/auth.service';

function initApp(translate: TranslateService, projectContext: ProjectContextService, auth: AuthService) {
  return async () => {
    await translate.use('ar').catch(() => undefined);
    if (auth.token()) {
      await auth.loadProfile().catch(() => auth.logout());
    }
    await projectContext.loadProjects().catch(() => undefined);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initApp,
      deps: [TranslateService, ProjectContextService, AuthService],
      multi: true,
    },
  ],
};
