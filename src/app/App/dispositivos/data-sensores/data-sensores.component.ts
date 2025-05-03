import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIf, CommonModule, NgFor } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { DeviceService } from '../../../Services/device.service';
import { PlantService } from '../../../Services/plant.service';
import { FormsModule } from '@angular/forms';
import { RealtimeDataService } from '../../../Services/realtime-database.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-data-sensores',
  standalone: true,
  imports: [NgIf, CommonModule, NgFor, FormsModule],
  templateUrl: './data-sensores.component.html',
  styleUrls: ['./data-sensores.component.scss']
})
export class DataSensoresComponent implements OnInit, OnDestroy {
  deviceId: string = '';
  deviceData: any = { relays: {} };
  errorMessage: string | null = null;
  plants: any[] = [];
  selectedPlantId: string = '';
  selectedSensor: string = '';
  loading: boolean = true;
  connectionStatus: boolean = false;
  relayIds: string[] = [];
  sensorKeys: string[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: Auth,
    private deviceService: DeviceService,
    private plantService: PlantService,
    private realtimeDataService: RealtimeDataService
  ) { }

  ngOnInit(): void {
    this.deviceId = this.route.snapshot.paramMap.get('deviceId')!;
    this.initializeComponent();
  }

  private async initializeComponent(): Promise<void> {
    try {
      await this.loadDeviceData();
      await this.loadUserPlants();
      this.setupRealtimeSubscriptions();
    } catch (error) {
      this.handleError('Error inicializando componente', error);
    }
  }

  private async loadDeviceData(): Promise<void> {
    const userUid = this.auth.currentUser?.uid;
    if (!userUid) {
      this.handleError('Usuario no autenticado');
      return;
    }

    try {
      const data = await this.deviceService.getDeviceData(this.deviceId);
      this.deviceData = { ...data, relays: data.relays || {} };
      this.relayIds = Object.keys(this.deviceData.relays);
      this.sensorKeys = this.getSensorKeys();
      this.loading = false;
    } catch (err) {
      this.handleError('Error al cargar datos del dispositivo', err);
    }
  }

  private setupRealtimeSubscriptions(): void {
    this.subscriptions.push(
      this.deviceService.getDeviceConnectionStatus(this.deviceId)
        .subscribe({
          next: (status) => this.connectionStatus = status.status === 'connected',
          error: (err) => console.error('Error estado conexión:', err)
        })
    );

    this.subscriptions.push(
      this.deviceService.subscribeToSensorData(this.deviceId)
        .subscribe({
          next: (sensors) => {
            this.deviceData = { ...this.deviceData, ...sensors };
            this.sensorKeys = this.getSensorKeys();
          },
          error: (err) => console.error('Error datos sensores:', err)
        })
    );
  }

  getSensorKeys(): string[] {
    const excludedKeys = ['id', 'relays', 'conectado', 'uid', 'creado', 'actualizadoEn'];
    return Object.keys(this.deviceData)
      .filter(key =>
        !excludedKeys.includes(key) &&
        typeof this.deviceData[key] === 'number' &&
        !key.toLowerCase().includes('relay')
      );
  }

  async toggleRelay(relayId: string): Promise<void> {
    const newState = !this.deviceData.relays[relayId];
    try {
      await this.deviceService.updateRelayState(this.deviceId, relayId, newState);
    } catch (error) {
      this.handleError('Error al actualizar relé', error);
    }
  }

  private async loadUserPlants(): Promise<void> {
    const userUid = this.auth.currentUser?.uid;
    if (!userUid) return;

    try {
      this.plants = await this.plantService.getPlants(userUid);
    } catch (err) {
      this.handleError('Error cargando plantas', err);
    }
  }

  async assignSensorToPlant(): Promise<void> {
    if (!this.validateAssignment()) return;

    const userUid = this.auth.currentUser?.uid;
    if (!userUid) {
      this.handleError('Usuario no autenticado');
      return;
    }

    try {
      await this.plantService.updatePlant(userUid, this.selectedPlantId, {
        sensorHumedad: {
          deviceId: this.deviceId,
          sensorKey: this.selectedSensor
        }
      });
      this.handleAssignmentSuccess();
    } catch (err) {
      this.handleError('Error asignando sensor', err);
    }
  }

  private validateAssignment(): boolean {
    if (!this.selectedPlantId || !this.selectedSensor) {
      this.errorMessage = 'Selecciona una planta y un sensor';
      return false;
    }
    return true;
  }

  private handleAssignmentSuccess(): void {
    this.errorMessage = null;
    alert('Sensor asignado correctamente');
    this.selectedPlantId = '';
    this.selectedSensor = '';
    this.loadUserPlants();
  }

  private handleError(message: string, error?: any): void {
    this.errorMessage = message;
    this.loading = false;
    console.error(error || message);
  }

  goToDispositivos(): void {
    this.router.navigate(['/view/dispositivos']);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.realtimeDataService.unsubscribeDevice(this.deviceId);
  }
}