import { Component, inject } from '@angular/core';
import { addIcons } from 'ionicons';
import { personCircle, leaf, addCircle, water } from 'ionicons/icons';
import { PlantService } from '../Services/plant.service';
import { AuthService } from '../Services/auth.service';
import { Subscription } from 'rxjs';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-view',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.css']
})
export class ViewComponent {
  route = inject(Router);
  plantCount: number = 0;
  private plantsSubscription!: Subscription;
  private authSubscription!: Subscription;

  constructor(
    private plantService: PlantService,
    private authService: AuthService
  ) {
    addIcons({
      personCircle,
      addCircle,
      water,
      leaf
    });
  }

  ngOnInit() {
    this.setupRealTimeCounter();
  }

  // Método para ir al perfil
  goToProfile() {
    this.route.navigate(['/view/home']);
  }

  private setupRealTimeCounter() {
    this.authSubscription = this.authService.user$.subscribe(user => {
      if (user) {
        if (this.plantsSubscription) {
          this.plantsSubscription.unsubscribe();
        }

        this.plantsSubscription = this.plantService.getPlantsObservable(user.uid).subscribe(plants => {
          this.plantCount = plants.length;
          console.log('Conteo actualizado:', this.plantCount);
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.plantsSubscription) {
      this.plantsSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}