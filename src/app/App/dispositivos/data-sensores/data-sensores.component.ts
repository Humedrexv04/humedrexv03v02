// src/app/data-sensores/data-sensores.component.ts
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
  styleUrls: ['./data-sensores.component.css']
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
  lastUpdated: string = '';
  formattedLastUpdated: string = '';
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
    this.selectedSensor = '';
    this.deviceId = this.route.snapshot.paramMap.get('deviceId')!;
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.realtimeDataService.unsubscribeDevice(this.deviceId);
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
      if (this.deviceData.timestamp) {
        this.updateTimestampDisplay(this.deviceData.timestamp);
      }
      this.loading = false;
    } catch (err) {
      this.handleError('Error al cargar datos del dispositivo', err);
    }
  }

  private setupRealtimeSubscriptions(): void {
    this.subscriptions.push(
      this.deviceService.getDeviceConnectionStatus(this.deviceId)
        .subscribe({
          next: s => this.connectionStatus = s.status === 'connected',
          error: err => console.error('Error estado conexiÃ³n:', err)
        })
    );
    this.subscriptions.push(
      this.deviceService.subscribeToSensorData(this.deviceId)
        .subscribe({
          next: sensors => {
            this.deviceData = { ...this.deviceData, ...sensors };
            this.sensorKeys = this.getSensorKeys();
            if (sensors['timestamp']) {
              this.updateTimestampDisplay(sensors['timestamp']);
            }
          },
          error: err => console.error('Error datos sensores:', err)
        })
    );
  }

  private updateTimestampDisplay(timestamp: any): void {
    const date = new Date(timestamp);
    this.lastUpdated = date.toISOString();
    this.formattedLastUpdated = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getSensorKeys(): string[] {
    const excluded = ['id', 'relays', 'conectado', 'uid', 'creado', 'actualizadoEn', 'timestamp'];
    return Object.keys(this.deviceData)
      .filter(key =>
        !excluded.includes(key) &&
        typeof this.deviceData[key] === 'number' &&
        !key.toLowerCase().includes('relay')
      );
  }

  getWaterLevelSensor(): string | null {
    return this.sensorKeys.find(k =>
      k.toLowerCase().includes('volumen') && k.toLowerCase().includes('agua')
    ) || null;
  }

  getAssignableSensors(): string[] {
    const waterKey = this.getWaterLevelSensor();
    return this.sensorKeys.filter(k => k !== waterKey);
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
        sensorHumedad: { deviceId: this.deviceId, sensorKey: this.selectedSensor }
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

  private async loadUserPlants(): Promise<void> {
    const userUid = this.auth.currentUser?.uid;
    if (!userUid) return;
    try {
      this.plants = await this.plantService.getPlants(userUid);
    } catch (err) {
      this.handleError('Error cargando plantas', err);
    }
  }

  private handleError(msg: string, err?: any): void {
    this.errorMessage = msg;
    this.loading = false;
    console.error(err || msg);
  }

  goToDispositivos(): void {
    this.router.navigate(['/view/dispositivos']);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}