import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit } from '@angular/core';
import { PlantService } from '../../../Services/plant.service';
import { AuthService } from '../../../Services/auth.service';
import { Plant } from '../../../Models/plant.mode';
import { PlantaItemComponent } from '../../../Components/planta-item/planta-item.component';
import { NgFor } from '@angular/common';


@Component({
  selector: 'app-plant-list',
  imports: [PlantaItemComponent, NgFor],
  templateUrl: './plant-list.component.html',
  styleUrls: ['./plant-list.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PlantListComponent implements OnInit {
  plants: Plant[] = [];
  selectedPlant: Plant | null = null; // Planta seleccionada para mostrar detalles
  isHidden = false; // Controla la visibilidad del modal

  constructor(private plantService: PlantService, private authService: AuthService) { }

  ngOnInit() {
    this.loadPlants();
  }


  loadPlants() {
    this.authService.getCurrentUser()
      .then(user => {
        if (user) {
          this.plantService.loadPlants(user.uid).subscribe(plants => {
            this.plants = plants; // Actualiza la lista de plantas en tiempo real
          });
        } else {
          console.error('No hay usuario autenticado');
        }
      })
      .catch(error => {
        console.error('Error al cargar las plantas:', error);
      });
  }
}