import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { ActivatedRoute } from '@angular/router';
import { Auth } from '@angular/fire/auth'; // Inyectar el servicio de autenticación

@Component({
  selector: 'app-data-sensores',
  imports: [NgIf],
  templateUrl: './data-sensores.component.html',
  styleUrls: ['./data-sensores.component.scss'],
})
export class DataSensoresComponent implements OnInit {
  deviceId: string = '';
  deviceData: any = null;

  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore,
    private auth: Auth // Inyectar el servicio de autenticación
  ) { }

  ngOnInit(): void {
    this.deviceId = this.route.snapshot.paramMap.get('deviceId')!; // Obtén el ID del dispositivo de la URL
    this.loadDeviceData();
  }

  loadDeviceData(): void {
    const userUid = this.auth.currentUser?.uid;  // Obtener UID del usuario autenticado

    if (!userUid) {
      console.error('Usuario no autenticado');
      return;
    }

    // Obtener la referencia al documento del dispositivo
    const deviceDocRef = doc(this.firestore, `users/${userUid}/devices/${this.deviceId}`);

    // Obtener los datos del dispositivo
    getDoc(deviceDocRef).then((docSnapshot) => {
      if (docSnapshot.exists()) {
        this.deviceData = docSnapshot.data();
      } else {
        console.log("No se encontraron datos para este dispositivo");
      }
    }).catch(err => {
      console.error("Error al obtener los datos del dispositivo: ", err);
    });
  }
}
