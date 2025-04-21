import { Component, OnInit, Input } from '@angular/core';
import { PlantService } from '../../../Services/plant.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Plant } from '../../../Models/plant.mode';
import { AuthService } from '../../../Services/auth.service';
import { addIcons } from 'ionicons';
import { create, time, trash } from 'ionicons/icons';
import { NgIf } from '@angular/common';
import { Esp32Service } from '../../../Services/esp32.service'; // Importar el servicio de ESP32
import { Observable } from 'rxjs';

@Component({
  selector: 'app-plant-detail',
  imports: [IonicModule, NgIf],
  templateUrl: './plant-detail.component.html',
  styleUrls: ['./plant-detail.component.css']
})
export class PlantDetailComponent implements OnInit {
  @Input() plant!: Plant;
  userId: string | null = null;
  plantId!: string;
  humidityWidth: string = '0%';
  sensorData: any; // Para almacenar los datos del sensor
  electrovalvulaState: boolean = false; // Para almacenar el estado de la electrovalvula

  constructor(
    private plantService: PlantService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private esp32Service: Esp32Service // Inyectar el servicio de ESP32
  ) {
    addIcons({
      trash,
      create,
      time
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.plant) {
      this.plantId = this.route.snapshot.paramMap.get('id') || '';

      try {
        const currentUser = await this.authService.getCurrentUser();
        if (currentUser) {
          this.userId = currentUser.uid;
        } else {
          console.error('No hay usuario autenticado');
          return;
        }
      } catch (error) {
        console.error('Error al obtener el usuario actual:', error);
        return;
      }

      if (this.userId) {
        this.loadPlantDetails();
      } else {
        console.error('No se puede cargar los detalles de la planta sin un userId válido');
      }
    }

    if (this.plant && this.plant.humedad) {
      this.humidityWidth = `${this.plant.humedad}%`;
    }
  }

  loadPlantDetails(): void {
    console.log('Cargando detalles de la planta...');
    console.log('userId:', this.userId);
    console.log('plantId:', this.plantId);

    this.plantService.getPlantDetails(this.userId!, this.plantId)
      .then(data => {
        this.plant = data;
        console.log('Detalles de la planta cargados:', this.plant);

        // Aquí puedes agregar cualquier otra lógica que necesites para la planta
      })
      .catch(error => {
        console.error('Error al cargar los detalles de la planta:', error);
      });
  }

  deletePlant(): void {
    if (this.plantId && this.userId) {
      this.plantService.deletePlant(this.userId, this.plantId)
        .then(() => {
          console.log('Planta eliminada con éxito');
          this.router.navigate(['/view/plant-list']);
        })
        .catch(error => {
          console.error('Error al eliminar la planta:', error);
        });
    }
  }

  goToPlantList(): void {
    this.router.navigate(['/view/plant-list']);
  }

  gotoEditPlant(): void {
    this.router.navigate(['/edit-plant', this.plantId]);
  }
}