import { Routes } from '@angular/router';
import { ViewComponent } from './view/view.component';

// Función para redirigir a la página de inicio si el usuario ya está autenticado

export const routes: Routes = [
    {
        path:'viewSesion',
        loadComponent: () => import('../app/Sesion/view-sesion/view-sesion.component').then(m => m.ViewSesionComponent),
    },
    {
        path: 'login',
        loadComponent: () => import('../app/Sesion/login/login.component').then(m => m.LoginComponent),
    },
    {
        path: 'reset-password',
        loadComponent: () => import('../app/Sesion/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    },
    {
        path: 'register',
        loadComponent: () => import('../app/Sesion/register/register.component').then(m => m.RegisterComponent),
    },
    {
        path: 'view',
        component: ViewComponent,
        children: [
            {
                path: 'add',
                loadComponent: () => import('../app/App/add/add.component').then(m => m.AddComponent)
            },
            {
                path: 'cant',
                loadComponent: () => import('./App/cant/cant.component').then(m => m.CantComponent)
            },
            {
                path: 'home',
                loadComponent: () => import('./App/home/home.component').then(m => m.HomeComponent)
            },
            {
                path: 'plant-list',
                loadComponent: () => import('./App/inventario/plant-list/plant-list.component').then(m => m.PlantListComponent)
            },
            
        ]
    },
    {
        path: 'plant/:id',
        loadComponent: () => import('./App/inventario/plant-detail/plant-detail.component').then(m => m.PlantDetailComponent)
    },
    {
        path: 'edit-plant/:id',
        loadComponent: () => import('./App/inventario/edit-plant/edit-plant.component').then(m => m.EditPlantComponent)
    },
    {
        path: '**',
        redirectTo: '/viewSesion',
        pathMatch: 'full'
    },
];