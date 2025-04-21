import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../Services/auth.service';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { leafOutline, moon, personCircleOutline, sunny } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  imports: [IonicModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  route = inject(Router);

  // Datos del usuario
  user = {
    userId: '',
    name: '',
    email: '',
    plantCount: 0 // Puedes agregar lógica para obtener este dato si es necesario
  };

  constructor(private authService: AuthService) {
    addIcons({
      sunny,
      moon,
      personCircleOutline,
      leafOutline
    });
  }

  async ngOnInit() {
    // Cargar datos del usuario
    try {
      const currentUser = await this.authService.getCurrentUser();
      if (currentUser) {
        this.user.userId = currentUser.uid;
        this.user.email = currentUser.email || 'Sin email registrado';

        // Obtener el nombre de usuario desde Firestore
        const userData = await this.authService.getUserData(currentUser.uid);
        this.user.name = userData.name;
      } else {
        console.warn('No hay usuario autenticado.');
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }

  }

  async logout() {
    try {
      await this.authService.logout();
      this.route.navigate(['/login']);
      console.log('Cierre de sesión exitoso');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}
