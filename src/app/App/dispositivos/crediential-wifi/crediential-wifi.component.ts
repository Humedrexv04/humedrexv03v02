// src/app/crediential-wifi/crediential-wifi.component.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgIf } from '@angular/common';
import { DeviceService } from '../../../Services/device.service';

@Component({
  selector: 'app-crediential-wifi',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './crediential-wifi.component.html',
  styleUrls: ['./crediential-wifi.component.css'],
})
export class CredientialWifiComponent implements OnInit {
  ssid = '';
  password = '';
  deviceId = '';
  showConfigInstructions = false;
  configUrl: SafeResourceUrl;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: Auth,
    private sanitizer: DomSanitizer,
    private deviceService: DeviceService
  ) {
    this.configUrl = this.sanitizer.bypassSecurityTrustResourceUrl('http://192.168.4.1');
  }

  ngOnInit(): void {
    this.deviceId = this.route.snapshot.paramMap.get('deviceId') || '';
  }

  connectToDevice(): void {
    this.showConfigInstructions = true;
  }

  openConfigPage(): void {
    window.open('http://192.168.4.1', '_blank');
  }

  onSubmit(): void {
    this.errorMessage = null;
    if (!this.ssid || !this.password) {
      this.errorMessage = 'Por favor, ingresa el SSID y la contraseña.';
      return;
    }
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.errorMessage = 'Usuario no autenticado. Por favor, inicia sesión.';
      return;
    }
    this.deviceService.updateDeviceCredentials(this.deviceId, this.ssid, this.password)
      .then(() => this.router.navigate(['/view']))
      .catch(() => {
        this.errorMessage = 'Error al guardar las credenciales. Intenta nuevamente.';
      });
  }

  goToEnterId(): void {
    this.router.navigate(['/enter-id']);
  }
}