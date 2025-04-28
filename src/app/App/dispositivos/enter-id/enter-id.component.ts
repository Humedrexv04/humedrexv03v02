import { Component, OnInit } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc, DocumentReference } from '@angular/fire/firestore';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-enter-id',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './enter-id.component.html',
  styleUrls: ['./enter-id.component.scss'],
})
export class EnterIdComponent implements OnInit {
  deviceId: string = '';
  errorMessage: string | null = null; // Para mostrar errores al usuario

  constructor(
    private router: Router,
    private firestore: Firestore,
    private auth: Auth
  ) {}

  ngOnInit(): void {}

  onSubmit(): void {
    this.errorMessage = null; // Resetear mensaje de error

    // Validar y sanitizar deviceId
    const sanitizedDeviceId = this.sanitizeDeviceId(this.deviceId);
    if (!sanitizedDeviceId) {
      this.errorMessage = 'Por favor, ingresa un ID de dispositivo válido.';
      return;
    }

    const userUid = this.auth.currentUser?.uid;
    if (!userUid) {
      this.errorMessage = 'Usuario no autenticado. Por favor, inicia sesión.';
      console.error('Usuario no autenticado');
      return;
    }

    // Obtener referencia al dispositivo en la colección global
    const deviceRef: DocumentReference = doc(this.firestore, `devices/${sanitizedDeviceId}`);

    // Verificar si el dispositivo existe en la colección global
    getDoc(deviceRef)
      .then((docSnapshot) => {
        if (docSnapshot.exists()) {
          const deviceData = docSnapshot.data();

          // Verificar si el dispositivo ya está asignado a otro usuario
          if (deviceData?.['uid']) {
            this.errorMessage = 'El dispositivo ya está asignado a otro usuario.';
            console.error('El dispositivo ya está asignado a otro usuario');
            return;
          }

          // Asignar el dispositivo al usuario actual
          this.assignDeviceToUser(userUid, deviceRef, sanitizedDeviceId);
        } else {
          this.errorMessage = 'El dispositivo no existe. Verifica el ID ingresado.';
          console.error('El dispositivo no existe en la colección global');
        }
      })
      .catch((err) => {
        this.errorMessage = 'Error al verificar el dispositivo. Intenta nuevamente.';
        console.error('Error al verificar dispositivo: ', err);
      });
  }

  // Método para sanitizar deviceId
  private sanitizeDeviceId(deviceId: string): string | null {
    if (!deviceId) return null;
    const sanitized = deviceId.trim(); // Eliminar espacios
    return sanitized.length > 0 ? sanitized : null;
  }

  // Método para asignar el dispositivo al usuario
  private assignDeviceToUser(userUid: string, deviceRef: DocumentReference, deviceId: string): void {
    // Actualizar el dispositivo en la colección global con el uid del usuario
    updateDoc(deviceRef, {
      uid: userUid,
      conectado: true,
      conectadoEn: new Date(),
    })
      .then(() => {
        // Agregar el dispositivo a la subcolección del usuario
        const userDeviceRef = doc(this.firestore, `users/${userUid}/devices/${deviceId}`);
        return setDoc(userDeviceRef, {
          deviceId: deviceId,
          conectado: true,
          creado: new Date(),
          humedad: null,
          valvula: null,
          agua: null,
        });
      })
      .then(() => {
        // Redirigir a la configuración WiFi
        this.router.navigate(['/crediential-wifi', deviceId]);
      })
      .catch((err) => {
        this.errorMessage = 'Error al asignar el dispositivo. Intenta nuevamente.';
        console.error('Error al asignar dispositivo: ', err);
      });
  }

  returnToDispositivos(): void {
    this.router.navigate(['/dispositivos']);
  }
}