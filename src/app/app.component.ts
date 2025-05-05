// app.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'myapp';

  ngOnInit() {
    this.setupPushListeners();
  }

  setupPushListeners() {
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('📩 Notificación recibida:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('👉 Acción realizada en la notificación:', action);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Error al registrar notificaciones:', error);
    });
  }
}
