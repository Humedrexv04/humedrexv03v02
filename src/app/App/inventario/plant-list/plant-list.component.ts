import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit } from '@angular/core';
import { PlantService } from '../../../Services/plant.service';
import { AuthService } from '../../../Services/auth.service';
import { DeviceService } from '../../../Services/device.service';
import { Plant } from '../../../Models/plant.mode';
import { PlantaItemComponent } from '../../../Components/planta-item/planta-item.component';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-plant-list',
  standalone: true,
  imports: [PlantaItemComponent, NgFor],
  templateUrl: './plant-list.component.html',
  styleUrls: ['./plant-list.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PlantListComponent implements OnInit {
  plants: Plant[] = [];
  selectedPlant: Plant | null = null;
  isHidden = false;
  nivelAgua: number | null = null;
  deviceId: string | null = null;

  constructor(
    private plantService: PlantService,
    private authService: AuthService,
    private deviceService: DeviceService
  ) { }

  ngOnInit() {
    this.loadPlants();
    this.loadNivelAgua();
  }

  loadPlants() {
    this.authService.getCurrentUser()
      .then(user => {
        if (user) {
          this.plantService.loadPlants(user.uid).subscribe(plants => {
            this.plants = plants;
          });
        } else {
          console.error('No hay usuario autenticado');
        }
      })
      .catch(error => console.error('Error al cargar las plantas:', error));
  }

  loadNivelAgua() {
    this.deviceService.getUserDevices().subscribe(devices => {
      if (devices.length > 0) {
        const deviceId = devices[0].id;
        this.deviceId = deviceId;
        this.deviceService.getSensorData(deviceId, 'nivel_agua')
          .then(nivel => {
            this.nivelAgua = nivel;
          })
          .catch(error => {
            console.error('Error al obtener NIVEL_AGUA:', error);
          });
      } else {
        console.warn('El usuario no tiene dispositivos asignados');
      }
    });
  }

  getNivelAgua(): number | null {
    return this.nivelAgua;
  }
}
