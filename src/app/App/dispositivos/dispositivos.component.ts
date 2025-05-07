// src/app/dispositivos/dispositivos.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { AuthService } from '../../Services/auth.service';
import { DeviceService } from '../../Services/device.service';
import { Subscription } from 'rxjs';
import { RealtimeDataService } from '../../Services/realtime-database.service';

@Component({
  selector: 'app-dispositivos',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './dispositivos.component.html',
  styleUrls: ['./dispositivos.component.css'],
})
export class DispositivosComponent implements OnInit, OnDestroy {
  devices: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  unlinkLoading: { [deviceId: string]: boolean } = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private deviceService: DeviceService,
    private realtimeDataService: RealtimeDataService,
    public router: Router,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.loadDevices();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadDevices(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        this.error = 'Usuario no autenticado';
        this.loading = false;
        return;
      }

      this.deviceService.getUserDevices().subscribe({
        next: (devices) => {
          // control si no hay dispositivos
          if (!devices || devices.length === 0) {
            this.devices = [];
            this.loading = false;
            return;
          }
          this.devices = devices;
          this.subscribeToConnectionStatus();
        },
        error: (err) => {
          console.error('Error al cargar dispositivos:', err);
          this.error = 'Error al cargar dispositivos';
          this.loading = false;
        }
      });
    } catch (error) {
      console.error('Error:', error);
      this.error = 'Error al verificar usuario';
      this.loading = false;
    }
  }

  subscribeToConnectionStatus(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    for (const device of this.devices) {
      const statusSub = this.realtimeDataService.subscribeToDeviceStatus(device.id).subscribe({
        next: (response: any) => {
          device.conectado = response.status === 'connected';
        },
        error: (err: any) => {
          console.error(`Error al escuchar estado de ${device.id}:`, err);
          device.conectado = false;
        }
      });
      this.subscriptions.push(statusSub);
    }
    this.loading = false;
  }

  addDevice(): void {
    this.router.navigate(['/enter-id']);
  }

  viewDevice(deviceId: string): void {
    this.router.navigate(['/data-sensores', deviceId]);
  }

  async unlinkDevice(deviceId: string): Promise<void> {
    if (!deviceId || this.unlinkLoading[deviceId]) return;

    this.unlinkLoading[deviceId] = true;

    try {
      await this.deviceService.unlinkDevice(deviceId);
      this.devices = this.devices.filter(d => d.id !== deviceId);
    } catch (error) {
      console.error('Error al desvincular:', error);
      this.error = 'Error al desvincular dispositivo';
    } finally {
      this.unlinkLoading[deviceId] = false;
    }
  }

  refresh(): void {
    this.loadDevices();
  }
}