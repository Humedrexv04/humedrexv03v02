import { Component, OnInit } from '@angular/core';
import { Firestore, collection } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { collectionData } from '@angular/fire/firestore'; // Asegúrate de importar collectionData
import { NgFor, NgIf } from '@angular/common';
import { AuthService } from '../../Services/auth.service';
import { DeviceService } from '../../Services/device.service';

@Component({
  selector: 'app-dispositivos',
  imports: [NgFor, NgIf],
  templateUrl: './dispositivos.component.html',
  styleUrls: ['./dispositivos.component.scss'],
})
export class DispositivosComponent implements OnInit {
  devices: any[] = [];

  constructor(
    private deviceService: DeviceService,  // Usa tu servicio para obtener dispositivos
    private router: Router,
    private authService: AuthService,
    private route: Router
  ) { }

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(): void {
    this.deviceService.getUserDevices().subscribe(devices => {
      this.devices = devices;  // Asigna los dispositivos obtenidos a la variable `devices`
    });
  }

  addDevice(): void {
    this.router.navigate(['/enter-id']);
  }

  // Función que redirige a la página de detalles del dispositivo
  viewDevice(deviceId: string): void {
    this.router.navigate([`/device-details/${deviceId}`]);
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
