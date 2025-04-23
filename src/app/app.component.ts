import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { AuthService } from './Services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'myapp';

  private messaging = inject(Messaging);
  private authService = inject(AuthService);

  ngOnInit() {
    this.setupFCM();
  }

  async setupFCM() {
    try {
      const fcmToken = await getToken(this.messaging); // Sin vapidKey

      if (fcmToken) {
        console.log('✅ Token FCM obtenido:', fcmToken);

        // Guardar token en Firestore si hay usuario logueado
        const user = await this.authService.getCurrentUser();
        if (user) {
          await this.authService.saveUser(
            user.uid,
            user.email ?? '',
            user.displayName ?? 'Sin nombre',
            undefined,
            fcmToken
          );
        }
      }
    } catch (error) {
      console.error('❌ Error al obtener el token FCM:', error);
    }

    // Escuchar notificaciones en foreground
    onMessage(this.messaging, (payload) => {
      console.log('📩 Notificación recibida en foreground:', payload);
      // Aquí puedes mostrar una alerta o toast si quieres
    });
  }
}
