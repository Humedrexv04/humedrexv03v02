import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../Services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = {
    userId: '',
    name: '',
    email: '',
    plantCount: 0
  };

  async ngOnInit() {
    try {
      const currentUser = await this.authService.getCurrentUser();
      if (currentUser) {
        this.user.userId = currentUser.uid;
        this.user.email = currentUser.email || 'Sin email registrado';

        const userData = await this.authService.getUserData(currentUser.uid);
        this.user.name = userData.name;

        // Cargar número de plantas
        this.user.plantCount = await this.authService.getPlantCount(currentUser.uid);
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}