import { Component, OnInit } from '@angular/core';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';  // Inyectar el servicio de autenticación

@Component({
  selector: 'app-crediential-wifi',
  imports: [FormsModule],
  templateUrl: './crediential-wifi.component.html',
  styleUrls: ['./crediential-wifi.component.scss'],
})
export class CredientialWifiComponent implements OnInit {
  ssid: string = '';
  password: string = '';
  deviceId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore,
    private auth: Auth // Inyectar el servicio de autenticación
  ) { }

  ngOnInit(): void {
    this.deviceId = this.route.snapshot.paramMap.get('deviceId')!; // Obtén el ID del dispositivo de la URL
  }

  onSubmit(): void {
    if (this.ssid && this.password) {
      const userUid = this.auth.currentUser?.uid;  // Obtener el UID del usuario autenticado

      if (!userUid) {
        console.error('Usuario no autenticado');
        return;
      }

      // Obtener la referencia del documento del dispositivo del usuario
      const deviceDocRef = doc(this.firestore, `users/${userUid}/devices/${this.deviceId}`);

      // Actualizar las credenciales WiFi y el estado de conexión del dispositivo
      updateDoc(deviceDocRef, {
        ssid: this.ssid,
        password: this.password,
        connected: true // Marcar el dispositivo como conectado
      }).then(() => {
        // Redirigir al usuario a la vista donde se visualiza el estado
        this.router.navigate(['/view']);
      }).catch(err => {
        console.error('Error al guardar las credenciales: ', err);
      });
    }
  }
}
