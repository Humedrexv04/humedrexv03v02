import { Component, OnInit } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { AuthService } from '../../Services/auth.service';
import { DeviceService } from '../../Services/device.service';

@Component({
  selector: 'app-dispositivos',
  standalone: true, // Añadido para componentes standalone
  imports: [NgFor, NgIf],
  templateUrl: './dispositivos.component.html',
  styleUrls: ['./dispositivos.component.scss'],
})
export class DispositivosComponent implements OnInit {
  devices: any[] = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(
    private deviceService: DeviceService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(): void {
    this.loading = true;
    this.error = null;

    this.deviceService.getUserDevices().subscribe({
      next: (devices) => {
        // Verificar que cada dispositivo tenga un id
        this.devices = devices.map(device => {
          // Si el ID está en una propiedad 'id'
          if (device.id) {
            return device;
          }
          // Si Firestore devuelve documentos con el ID separado
          else if (device.payload && device.payload.doc) {
            return {
              id: device.payload.doc.id,
              ...device.payload.doc.data()
            };
          }
          // Log para depuración
          console.log('Estructura del dispositivo:', device);
          return device;
        });

        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar dispositivos:', err);
        this.error = 'No se pudieron cargar los dispositivos. Intente nuevamente.';
        this.loading = false;
      }
    });
  }

  addDevice(): void {
    this.router.navigate(['/enter-id']);
  }

  viewDevice(device: any): void {
    // Extraer el ID correctamente según la estructura del objeto
    const deviceId = this.getDeviceId(device);

    if (deviceId) {
      console.log('Navegando a dispositivo:', deviceId);
      this.router.navigate(['/data-sensores', deviceId]);
    } else {
      console.error('ID de dispositivo no válido:', device);
    }
  }

  configureWifi(device: any): void {
    const deviceId = this.getDeviceId(device);

    if (deviceId) {
      console.log('Configurando WiFi para dispositivo:', deviceId);
      this.router.navigate(['/credential-wifi', deviceId]);
    } else {
      console.error('ID de dispositivo no válido para configuración WiFi:', device);
    }
  }

  // Método auxiliar para extraer el ID correctamente
  private getDeviceId(device: any): string | null {
    if (!device) return null;

    // Si el ID está directamente en el objeto
    if (typeof device === 'string') {
      return device;
    }

    // Si el ID está en una propiedad 'id'
    if (device.id) {
      return device.id;
    }

    // Si el ID está en una propiedad 'deviceId'
    if (device.deviceId) {
      return device.deviceId;
    }

    // Si Firestore devuelve documentos con ID separado
    if (device.payload && device.payload.doc) {
      return device.payload.doc.id;
    }

    console.warn('No se pudo determinar el ID del dispositivo:', device);
    return null;
  }

  refresh(): void {
    this.loadDevices();
  }
}