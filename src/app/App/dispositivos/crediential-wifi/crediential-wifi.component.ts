import { Component, OnInit } from '@angular/core';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-crediential-wifi',
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore,
    private auth: Auth,
    private sanitizer: DomSanitizer
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
    if (this.ssid && this.password) {
      const userUid = this.auth.currentUser?.uid;

      if (!userUid) {
        console.error('Usuario no autenticado');
        return;
      }

      const deviceDocRef = doc(this.firestore, `users/${userUid}/devices/${this.deviceId}`);

      updateDoc(deviceDocRef, {
        ssid: this.ssid,
        password: this.password,
        connected: true,
      })
        .then(() => {
          this.router.navigate(['/view']);
        })
        .catch((err) => {
          console.error('Error al guardar las credenciales: ', err);
        });
    }
  }

  goToEnterId() {
    this.router.navigate(['/enter-id']);
  }
}