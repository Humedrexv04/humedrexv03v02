export interface Plant {
    id?: string;
    img: string | undefined,
    name: string,
    horario: string,
    humedad: number,
    sensorHumedad?: { deviceId: string; sensorKey: string } | undefined;
    electrovalvula: number | undefined,
}
