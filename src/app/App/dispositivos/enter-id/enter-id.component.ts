import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { DeviceService } from '../../../Services/device.service';

@Component({
  selector: 'app-enter-id',
  standalone: true,
  imports: [FormsModule, NgIf, CommonModule],
  templateUrl: './enter-id.component.html',
  styleUrls: ['./enter-id.component.scss'],
})
export class EnterIdComponent implements OnInit {
  deviceId: string = '';
  errorMessage: string | null = null; // Para mostrar errores al usuario

  constructor(
    private router: Router,
    private auth: Auth,
    private deviceService: DeviceService // Inject the DeviceService
  ) { }

  ngOnInit(): void { }

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

    // Usar el DeviceService para agregar el dispositivo
    this.deviceService.addDevice(sanitizedDeviceId)
      .then(() => {
        // Redirigir a la configuración WiFi
        this.router.navigate(['/crediential-wifi', sanitizedDeviceId]);
      })
      .catch((err) => {
        // Mapear errores del servicio a mensajes amigables para el usuario
        if (err === 'Usuario no autenticado') {
          this.errorMessage = 'Usuario no autenticado. Por favor, inicia sesión.';
        } else if (err === 'El dispositivo no existe en Realtime Database') {
          this.errorMessage = 'El dispositivo no existe. Verifica el ID ingresado.';
        } else if (err === 'El dispositivo ya está asignado a otro usuario') {
          this.errorMessage = 'El dispositivo ya está asignado a otro usuario.';
        } else {
          this.errorMessage = 'Error al asignar el dispositivo. Intenta nuevamente.';
        }
        console.error('Error al asignar dispositivo: ', err);
      });
  }

  // Método para sanitizar deviceId
  private sanitizeDeviceId(deviceId: string): string | null {
    if (!deviceId) return null;
    const sanitized = deviceId.trim(); // Eliminar espacios
    return sanitized.length > 0 ? sanitized : null;
  }

  returnToDispositivos(): void {
    this.router.navigate(['/dispositivos']);
  }
}