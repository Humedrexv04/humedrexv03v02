import { Routes } from '@angular/router';
import { ViewComponent } from './view/view.component';
import { authGuardGuard } from './Guards/auth.guard.guard';
import { loginRedirectGuard } from './Guards/login-redirect-guard.guard';

export const routes: Routes = [
    {
        path: 'viewSesion',
        loadComponent: () => import('../app/Sesion/view-sesion/view-sesion.component').then(m => m.ViewSesionComponent),
        canActivate: [loginRedirectGuard]
    },
    {
        path: 'login',
        loadComponent: () => import('../app/Sesion/login/login.component').then(m => m.LoginComponent),
        canActivate: [loginRedirectGuard]
    },
    {
        path: 'reset-password',
        loadComponent: () => import('../app/Sesion/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
        canActivate: [loginRedirectGuard]
    },
    {
        path: 'register',
        loadComponent: () => import('../app/Sesion/register/register.component').then(m => m.RegisterComponent),
        canActivate: [loginRedirectGuard]
    },
    {
        path: 'view',
        component: ViewComponent,
        canActivate: [authGuardGuard],
        children: [
            {
                path: 'add',
                loadComponent: () => import('./App/add/add.component').then(m => m.AddComponent)
            },
            {
                path: 'home',
                loadComponent: () => import('./App/home/home.component').then(m => m.HomeComponent),
            },
            {
                path: 'plant-list',
                loadComponent: () => import('./App/inventario/plant-list/plant-list.component').then(m => m.PlantListComponent)
            },
            {
                path: 'dispositivos',
                loadComponent: () => import('./App/dispositivos/dispositivos.component').then(m => m.DispositivosComponent),
                canActivate: [authGuardGuard]
            }
        ]
    },
    {
        path: 'plant/:id',
        loadComponent: () => import('./App/inventario/plant-detail/plant-detail.component').then(m => m.PlantDetailComponent),
        canActivate: [authGuardGuard]
    },
    {
        path: 'edit-plant/:id',
        loadComponent: () => import('./App/inventario/edit-plant/edit-plant.component').then(m => m.EditPlantComponent),
        canActivate: [authGuardGuard]
    },
    {
        path: 'enter-id',
        loadComponent: () => import('./App/dispositivos/enter-id/enter-id.component').then(m => m.EnterIdComponent),
        canActivate: [authGuardGuard]
    },
    {
        path: 'crediential-wifi/:deviceId',
        loadComponent: () => import('./App/dispositivos/crediential-wifi/crediential-wifi.component').then(m => m.CredientialWifiComponent),
        canActivate: [authGuardGuard]
    },
    {
        path: 'data-sensores/:deviceId',
        loadComponent: () => import('./App/dispositivos/data-sensores/data-sensores.component').then(m => m.DataSensoresComponent),
        canActivate: [authGuardGuard]
    },
    {
        path: '',
        loadComponent: () => import('./Components/splash/splash.component').then(m => m.SplashComponent)
    },
    {
        path: '**',
        redirectTo: '/viewSesion',
        pathMatch: 'full'
    },
];