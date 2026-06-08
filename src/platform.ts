import { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig } from 'homebridge';
import { componentHelpers } from './homebridgeAccessories/componentHelpers';
import { Accessory, PLATFORM_NAME, PLUGIN_NAME, UUIDGen, Service, Characteristic } from './index';
import { Client } from '@2colors/esphome-native-api';

export class EsphomePlatform implements DynamicPlatformPlugin {
    protected readonly espDevices: any[] = [];
    protected readonly accessories: PlatformAccessory[] = [];

    constructor(
        protected readonly log: Logging,
        protected readonly config: PlatformConfig,
        protected readonly api: API,
    ) {
        this.log.info('ESPHome HV2 - Stable Final Build v2.6.0');

        this.api.on('didFinishLaunching', () => {
            this.connectToDevices();
        });
    }

    protected connectToDevices(): void {
        const devices = (this.config.devices as any[]) || [];
        
        for (const deviceConfig of devices) {
            this.log.info(`[HV2] Connecting to: ${deviceConfig.host}`);

            // Initialize client with correct parameters for modern ESPHome
            const device: any = new Client({
                host: deviceConfig.host,
                port: deviceConfig.port || 6053,
                password: deviceConfig.password || '',
                clientName: 'Homebridge HV2', // Required for handshake in ESPHome 2025+
                apiVersionMajor: 1,
                apiVersionMinor: 40 
            } as any);

            this.espDevices.push(device);
            device.connect();

            device.on('connected', () => {
                this.log.info(`[HV2] TCP Connection established with ${deviceConfig.host}. Handshaking...`);
            });

            device.on('initialized', () => {
                this.log.info(`[HV2] !!! INITIALIZED !!! Success with ${deviceConfig.host}`);
            });

            device.on('deviceInfo', (info: any) => {
                this.log.info(`[HV2] Device Info received: ${info.name} (Model: ${info.modelName || 'ESPHome Device'})`);
            });

            // The library emits 'newEntity' for every discovered entity
            device.on('newEntity', (entity: any) => {
                const type = (entity.type as string)?.toLowerCase();
                this.log.info(`[HV2] Entity discovered: ${entity.config.name} (type: ${type})`);
                this.registerEntity(type, entity);
            });

            device.on('error', (err: any) => {
                this.log.error(`[HV2] Connection Error (${deviceConfig.host}): ${err.message || err}`);
            });
            
            device.on('disconnected', () => {
                this.log.warn(`[HV2] Disconnected from ${deviceConfig.host}. Retrying...`);
            });
        }
    }

    private registerEntity(type: string, entity: any): void {
        const componentHelper = componentHelpers.get(type);
        if (!componentHelper) {
            this.log.debug(`[HV2] No helper for entity type: ${type} (${entity.config.name})`);
            return;
        }

        const uuid = UUIDGen.generate(entity.config.uniqueId || entity.config.name);
        let accessory = this.accessories.find((a) => a.UUID === uuid);

        if (!accessory) {
            this.log.info(`[HV2] Registering: ${entity.config.name}`);
            accessory = new Accessory(entity.config.name, uuid);

            const infoService = accessory.getService(Service.AccessoryInformation);
            if (infoService) {
                infoService
                    .setCharacteristic(Characteristic.Manufacturer, 'ESPHome')
                    .setCharacteristic(Characteristic.Model, type)
                    .setCharacteristic(Characteristic.SerialNumber, entity.config.objectId || 'Unknown');
            }

            if (componentHelper(entity, accessory)) {
                this.accessories.push(accessory);
                this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
        } else {
            componentHelper(entity, accessory);
        }
    }

    public configureAccessory(accessory: PlatformAccessory): void {
        this.accessories.push(accessory);
    }
}