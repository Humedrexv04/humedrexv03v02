import { Component, OnInit } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-enter-id',
  imports: [FormsModule],
  templateUrl: './enter-id.component.html',
  styleUrls: ['./enter-id.component.scss'],
})
export class EnterIdComponent implements OnInit {
  deviceId: string = '';

  constructor(
    private router: Router,
    private firestore: Firestore,
    private auth: Auth // Inyectar el servicio de autenticación
  ) { }

  ngOnInit(): void { }

  onSubmit(): void {
    if (this.deviceId) {
      const userUid = this.auth.currentUser?.uid;

      if (!userUid) {
        console.error('Usuario no autenticado');
        return;
      }

      // Obtener referencia al dispositivo en la colección global
      const deviceRef = doc(this.firestore, `devices/${this.deviceId}`);

      // Verificar si el dispositivo existe en la colección global
      getDoc(deviceRef).then(docSnapshot => {
        if (docSnapshot.exists()) {
          const deviceData = docSnapshot.data();

          // Verificar si el dispositivo ya está asignado a otro usuario
          if (deviceData?.['uid']) {
            console.error('El dispositivo ya está asignado a otro usuario');
            return;
          }

          // El dispositivo no tiene un `uid`, lo asignamos al usuario actual
          this.assignDeviceToUser(userUid, deviceRef);
        } else {
          console.error('El dispositivo no existe en la colección global');
        }
      }).catch(err => {
        console.error('Error al verificar dispositivo: ', err);
      });
    }
  }

  // Método para asignar el dispositivo al usuario
  private assignDeviceToUser(userUid: string, deviceRef: any): void {
    // Actualizar el dispositivo en la colección global con el `uid` del usuario
    updateDoc(deviceRef, {
      uid: userUid,
      conectado: true,  // Marcar como conectado
      conectadoEn: new Date() // Timestamp de cuando se conectó
    }).then(() => {
      // Agregar el dispositivo a la subcolección del usuario
      const userDeviceRef = doc(this.firestore, `users/${userUid}/devices/${this.deviceId}`);
      setDoc(userDeviceRef, {
        deviceId: this.deviceId,
        conectado: true,  // Marcar como conectado
        creado: new Date(),  // Timestamp de cuando se agregó el dispositivo
        humedad: null, // Puedes inicializar estos valores según sea necesario
        valvula: null,
        agua: null,
      }).then(() => {
        this.router.navigate(['/credential-wifi', this.deviceId]);
      }).catch(err => {
        console.error('Error al agregar dispositivo al usuario: ', err);
      });
    }).catch(err => {
      console.error('Error al actualizar el dispositivo en la colección global: ', err);
    });
  }

  returnToDispositivos(){
    this.router.navigate(['/dispositivos']);
  }
}
