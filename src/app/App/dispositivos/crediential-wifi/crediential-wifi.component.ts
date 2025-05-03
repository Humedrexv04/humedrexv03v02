import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgIf } from '@angular/common';
import { DeviceService } from '../../../Services/device.service';
import { faMehBlank } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-crediential-wifi',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './crediential-wifi.component.html',
  styleUrls: ['./crediential-wifi.component.scss'],
})
export class CredientialWifiComponent implements OnInit {
  ssid: string = '';
  password: string = '';
  deviceId: string = '';
  showConfigInstructions: boolean = false;
  configUrl: SafeResourceUrl;
  errorMessage: string | null = null; // Para mostrar errores al usuario

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: Auth,
    private sanitizer: DomSanitizer,
    private deviceService: DeviceService // Inject the DeviceService
  ) {
    this.configUrl = this.sanitizer.bypassSecurityTrustResourceUrl('http://192.168.4.1');
  }

  ngOnInit(): void {
    this.deviceId = this.route.snapshot.paramMap.get('deviceId')!;
  }

  connectToDevice(): void {
    this.showConfigInstructions = true; // Activa la tarjeta de instrucciones con animación
  }

  openConfigPage(): void {
    window.open('http://192.168.4.1', '_blank');
  }

  onSubmit(): void {
    this.errorMessage = null; // Resetear mensaje de error

    if (!this.ssid || !this.password) {
      this.errorMessage = 'Por favor, ingresa el SSID y la contraseña.';
      return;
    }

    const userUid = this.auth.currentUser?.uid;
    if (!userUid) {
      this.errorMessage = 'Usuario no autenticado. Por favor, inicia sesión.';
      console.error('Usuario no autenticado');
      return;
    }

    // Usar el DeviceService para actualizar las credenciales WiFi
    this.deviceService.updateDeviceCredentials(this.deviceId, this.ssid, this.password)
      .then(() => {
        this.router.navigate(['/view']);
      })
      .catch((err: any) => {
        this.errorMessage = 'Error al guardar las credenciales. Intenta nuevamente.';
        console.error('Error al guardar las credenciales: ', err);
      });
  }

  goToEnterId(): void {
    this.router.navigate(['/enter-id']);
  }
}