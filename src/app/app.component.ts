import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { AuthService } from './Services/auth.service';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'myapp';

  private authService = inject(AuthService);
  private firestore = inject(Firestore);

  ngOnInit() {
    this.registerPushNotifications();
  }

  registerPushNotifications() {
    // 1. Solicitar permiso al usuario
    PushNotifications.requestPermissions().then(permission => {
      if (permission.receive === 'granted') {
        // 2. Registrar el dispositivo
        PushNotifications.register();
      } else {
        console.warn('🔒 Permiso de notificaciones no concedido');
      }
    });

    // 3. Cuando se registra correctamente
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('✅ Token obtenido:', token.value);

      // Guardar token en Firestore si hay usuario
      const user = await this.authService.getCurrentUser();
      if (user) {
        const ref = doc(this.firestore, 'users', user.uid);
        await setDoc(ref, {
          pushToken: token.value,
          updatedAt: new Date()
        }, { merge: true });
        console.log('📦 Token guardado en Firestore');
      }
    });

    // 4. Si ocurre un error al registrar
    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Error al registrar notificaciones:', error);
    });

    // 5. Cuando llega una notificación mientras la app está abierta
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('📩 Notificación recibida:', notification);
      // Aquí puedes mostrar un toast, alerta o modal
    });

    // 6. Cuando el usuario toca una notificación
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('👉 Acción realizada en la notificación:', action);
      // Aquí puedes redirigir o ejecutar lógica basada en la acción
    });
  }
}
