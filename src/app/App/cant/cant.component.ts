import { Component, OnInit, OnDestroy } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { Esp32Service } from '../../Services/esp32.service'; // Importa el servicio
import { IonicModule } from '@ionic/angular';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  selector: 'app-cant',
  templateUrl: './cant.component.html',
  styleUrls: ['./cant.component.css'],
  imports: [IonicModule, CommonModule]
})
export class CantComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription(); // Para manejar las suscripciones
  testSensorData: any; // Variable para almacenar los datos del sensor

  constructor(private esp32Service: Esp32Service, private auth: Auth) { } // Inyección del servicio

  ngOnInit() {
    // Suscribirse a los datos del sensor
    this.subscription.add(
      this.esp32Service.getTestSensorData().subscribe(data => {
        this.testSensorData = data; // Almacena los datos en la variable
        console.log(this.testSensorData); // Muestra los datos en la consola
      })
    );

    // Manejo del estado de autenticación (opcional)
    onAuthStateChanged(this.auth, user => {
      if (user) {
        console.log('Usuario autenticado:', user);
      } else {
        console.log('Usuario no autenticado');
      }
    });
  }

  ngOnDestroy() {
    // Limpia las suscripciones al destruir el componente
    this.subscription.unsubscribe();
  }
}