import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { PlantService } from '../../../Services/plant.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../Services/auth.service';
import { DeviceService } from '../../../Services/device.service';
import { NgIf } from '@angular/common';
import { Observable, firstValueFrom } from 'rxjs';
import { Plant } from '../../../Models/plant.mode';

@Component({
  selector: 'app-plant-detail',
  imports: [NgIf],
  templateUrl: './plant-detail.component.html',
  styleUrls: ['./plant-detail.component.scss'],
  standalone: true
})
export class PlantDetailComponent implements OnInit, OnDestroy {
  @Input() plant: Plant | null = null;
  userId: string | null = null;
  plantId!: string;
  humidityWidth: string = '0%';
  humidityValue: number | null = null;
  electrovalvulaState: boolean = false;
  errorMessage: string | null = null;
  private updateInterval: any;
  private lastRelayState: boolean | null = null; // Track last relay state to avoid redundant updates

  constructor(
    private plantService: PlantService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private deviceService: DeviceService
  ) { }

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
      }
    }

    if (this.plant?.humedad) {
      this.humidityWidth = `${this.plant.humedad}%`;
    }

    this.startSensorUpdates();
  }

  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  loadPlantDetails(): void {
    this.plantService.getPlantDetails(this.userId!, this.plantId)
      .then(data => {
        this.plant = data;
        this.humidityWidth = `${this.plant.humedad}%`;
        this.getSensorDataForPlant();
      })
      .catch(error => {
        console.error('Error al cargar los detalles de la planta:', error);
      });
  }

  startSensorUpdates(): void {
    this.getSensorDataForPlant();
    this.updateInterval = setInterval(() => {
      this.getSensorDataForPlant();
    }, 5000);
  }

  async getSensorDataForPlant(): Promise<void> {
    this.errorMessage = null;

    if (!this.plant?.sensorHumedad) {
      console.log('Planta no tiene sensor asignado');
      return;
    }

    const { deviceId, sensorKey } = this.plant.sensorHumedad;

    try {
      const sensorData = await this.withRetry(
        () => this.deviceService.getSensorData(deviceId, sensorKey),
        3,
        1000
      );

      this.humidityValue = this.validateSensorData(sensorData);
      this.humidityWidth = `${this.humidityValue}%`;

      // Compare registered humidity with current humidity
      const targetHumidity = this.plant.humedad;
      const currentHumidity = this.humidityValue;
      const newRelayState = currentHumidity <= targetHumidity; // true (on) if <= target, false (off) if > target
      this.electrovalvulaState = newRelayState;

      // Determine relayId based on sensorKey (e.g., sensor1 -> relay1, sensor2 -> relay2)
      const sensorNumber = sensorKey.match(/\d+$/)?.[0]; // Extract number from sensorKey (e.g., "1" from "sensor1")
      if (!sensorNumber) {
        throw new Error('Formato de sensorKey no válido. Se esperaba "sensor" seguido de un número.');
      }
      const relayId = `relay${sensorNumber}`;

      // Update relay state in Firebase only if changed
      if (newRelayState !== this.lastRelayState) {
        await this.deviceService.updateRelayState(deviceId, relayId, newRelayState);
        this.lastRelayState = newRelayState;
        console.log(`Relay state for ${relayId} updated to ${newRelayState}`);
      }
    } catch (error) {
      this.handleSensorError(error);
    }
  }

  private validateSensorData(data: any): number {
    if (data === null || data === undefined) {
      throw new Error('No se recibieron datos del sensor');
    }

    let humidity: number | null;

    if (typeof data === 'number') {
      humidity = data;
    } else if (typeof data === 'object') {
      humidity =
        data.humidity ??
        data.humedad ??
        data.value ??
        data.moisture ??
        null;

      if (humidity === null) {
        console.error('Estructura de datos inesperada:', data);
        throw new Error('Formato de datos no reconocido');
      }
    } else {
      console.error('Tipo de datos inesperado:', data);
      throw new Error('Formato de datos no reconocido');
    }

    const numericValue = Number(humidity);
    if (isNaN(numericValue)) {
      throw new Error('El valor de humedad no es numérico');
    }

    return Math.max(0, Math.min(100, numericValue));
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delayMs: number
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) await new Promise(res => setTimeout(res, delayMs));
      }
    }

    throw lastError;
  }

  private handleSensorError(error: any): void {
    console.error('Error en sensor:', error);

    const errorMap: Record<string, string> = {
      'No se recibieron datos del sensor': 'El sensor no está enviando datos',
      'Formato de datos no reconocido': 'Formato de datos inesperado del sensor',
      'El valor de humedad no es numérico': 'Datos inválidos del sensor',
      'Formato de sensorKey no válido. Se esperaba "sensor" seguido de un número.': 'Sensor no configurado correctamente'
    };

    this.errorMessage = errorMap[error.message] || 'Error al leer el sensor';
    this.humidityValue = 0;
    this.humidityWidth = '0%';
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

  manualActivationActive: boolean = false;
  remainingTime: number = 0;
  private countdownInterval: any;

  // ... resto del código existente ...

  async activateManualWatering(): Promise<void> {
    if (!this.plant?.sensorHumedad) return;

    const { deviceId, sensorKey } = this.plant.sensorHumedad;
    const sensorNumber = sensorKey.match(/\d+$/)?.[0];
    if (!sensorNumber) return;

    const relayId = `relay${sensorNumber}`;

    try {
      this.manualActivationActive = true;
      this.remainingTime = 10;

      // Iniciar cuenta regresiva
      this.countdownInterval = setInterval(() => {
        this.remainingTime--;
        if (this.remainingTime <= 0) {
          clearInterval(this.countdownInterval);
          this.manualActivationActive = false;
        }
      }, 1000);

      await this.deviceService.manualActivateRelay(deviceId, relayId, 10000);
    } catch (error) {
      console.error('Error en activación manual:', error);
      this.manualActivationActive = false;
      clearInterval(this.countdownInterval);
    }
  }

  goToPlantList(): void {
    this.router.navigate(['/view/plant-list']);
  }

  gotoEditPlant(): void {
    this.router.navigate(['/edit-plant', this.plantId]);
  }
}