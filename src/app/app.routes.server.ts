import { RenderMode, ServerRoute } from '@angular/ssr';
import { ActivityService } from './services/activity.service';
import { GroupService } from './services/group.service';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'activities/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'groups/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
