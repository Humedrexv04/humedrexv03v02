// src/app/enter-id/enter-id.component.ts
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
  styleUrls: ['./enter-id.component.css'],
})
export class EnterIdComponent implements OnInit {
  deviceId: string = '';
  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private auth: Auth,
    private deviceService: DeviceService
  ) { }

  ngOnInit(): void { }

  onSubmit(): void {
    this.errorMessage = null;
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

    this.deviceService.addDevice(sanitizedDeviceId)
      .then(() => {
        this.router.navigate(['/crediential-wifi', sanitizedDeviceId]);
      })
      .catch((err) => {
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

  private sanitizeDeviceId(deviceId: string): string | null {
    if (!deviceId) return null;
    const sanitized = deviceId.trim();
    return sanitized.length > 0 ? sanitized : null;
  }

  returnToDispositivos(): void {
    this.router.navigate(['/view/dispositivos']);
  }
}