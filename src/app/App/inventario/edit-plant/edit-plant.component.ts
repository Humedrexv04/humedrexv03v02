import { Component, Input, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { Plant } from '../../../Models/plant.mode';
import { PlantService } from '../../../Services/plant.service';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../Services/auth.service';

@Component({
  selector: 'app-edit-plant',
  templateUrl: './edit-plant.component.html',
  styleUrls: ['./edit-plant.component.css'],
  imports:[IonicModule, FormsModule, NgIf]
})
export class EditPlantComponent implements OnInit {
  userId: string | null = null; // ID del usuario
  plantId!: string; // ID de la planta a editar
  plant: Plant | null = null; // Planta a editar
  errorMessage: string | null = null;
  img: string = ''; // Variable para almacenar la imagen

  constructor(
    private plantService: PlantService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.plantId = this.route.snapshot.paramMap.get('id') || ''; // Obtener el ID de la planta de la ruta

    try {
      const currentUser  = await this.authService.getCurrentUser (); // Obtener el usuario actual
      if (currentUser ) {
        this.userId = currentUser .uid; // Asigna el ID del usuario
      } else {
        console.error('No hay usuario autenticado');
        return; // Salir si no hay usuario autenticado
      }
    } catch (error) {
      console.error('Error al obtener el usuario actual:', error);
      return; // Salir si hay un error
    }

    // Solo llama a loadPlantDetails si userId no es null
    if (this.userId) {
      this.loadPlantDetails();
    } else {
      console.error('No se puede cargar los detalles de la planta sin un userId válido');
    }
  }

  loadPlantDetails(): void {
    console.log('Cargando detalles de la planta...');
    console.log('userId:', this.userId);
    console.log('plantId:', this.plantId);

    this.plantService.getPlantDetails(this.userId!, this.plantId) // Usa el operador de aserción no nula
      .then(data => {
        this.plant = data; // Asigna los detalles de la planta
        this.img = this.plant.img; // Asigna la imagen actual a la variable img
        console.log('Detalles de la planta cargados:', this.plant);
      })
      .catch(error => {
        console.error('Error al cargar los detalles de la planta:', error);
        this.errorMessage = error.message; // Manejo de errores
      });
  }

  updatePlant(): void {
    if (this.plant && this.userId) {
      this.plant.img = this.img; // Asegúrate de que la imagen se actualice
      this.plantService.updatePlant(this.userId, this.plantId, this.plant)
        .then(() => {
          console.log('Planta actualizada con éxito');
          this.router.navigate(['/view/plant-list']); // Redirigir a la lista de plantas
        })
        .catch(error => {
          console.error('Error al actualizar la planta:', error);
          this.errorMessage = error.message; // Manejo de errores
        });
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.img = e.target.result; // Asigna la imagen a la variable img
      };
      reader.readAsDataURL(file); // Lee el archivo como Data URL
    }
  }

  gotoPlantDetail(){
    this.router.navigate(['/plant', this.plantId]);
  }
}