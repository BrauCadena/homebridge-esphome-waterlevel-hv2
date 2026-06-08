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

            /**
             * DYNAMIC COMPONENT DISCOVERY
             * The @2colors library emits specific events for each component type.
             * We listen to all common types to ensure we catch your sensors.
             */
            const componentTypes = [
                'sensor', 'binarySensor', 'switch', 'light', 'fan', 
                'climate', 'number', 'select', 'cover', 'textSensor',
				'binary_sensor'
            ];
            
            componentTypes.forEach(type => {
                device.on(type, (entity: any) => {
                    this.log.info(`[HV2] ${type.toUpperCase()} discovered: ${entity.config.name}`);
                    
                    if (!device.entities) {
                        device.entities = [];
                    }

                    // Check if entity is already in our list to avoid duplicates
                    const exists = device.entities.find((e: any) => e.config.objectId === entity.config.objectId);
                    if (!exists) {
                        // We inject the type into the entity object so addAccessories knows how to process it
                        entity.type = type; 
                        device.entities.push(entity);
                    }

                    // Trigger accessory registration/update
                    this.addAccessories(device);
                });
            });

            // Generic entity fallback (if supported by your library version)
            device.on('entity', (entity: any) => {
                this.log.info(`[HV2] Generic Entity discovered: ${entity.config.name}`);
                if (!device.entities) device.entities = [];
                device.entities.push(entity);
                this.addAccessories(device);
            });

            device.on('error', (err: any) => {
                this.log.error(`[HV2] Connection Error (${deviceConfig.host}): ${err.message || err}`);
            });
            
            device.on('disconnected', () => {
                this.log.warn(`[HV2] Disconnected from ${deviceConfig.host}. Retrying...`);
            });
        }
    }

    private addAccessories(device: any): void {
        const entities = device.entities || [];
        if (entities.length === 0) return;

        for (const entity of entities) {
            // Match the component type with our Homebridge helpers
            const componentHelper = componentHelpers.get(entity.type);
            if (!componentHelper) continue;

            // Generate a persistent UUID
            const uuid = UUIDGen.generate(entity.config.uniqueId || entity.config.name);
            let accessory = this.accessories.find((a) => a.UUID === uuid);
            
            if (!accessory) {
                this.log.info(`[HV2] Registering New Accessory: ${entity.config.name}`);
                accessory = new Accessory(entity.config.name, uuid);
                
                // Set standard accessory information
                const infoService = accessory.getService(Service.AccessoryInformation);
                if (infoService) {
                    infoService
                        .setCharacteristic(Characteristic.Manufacturer, 'ESPHome')
                        .setCharacteristic(Characteristic.Model, entity.type || 'Generic Device')
                        .setCharacteristic(Characteristic.SerialNumber, entity.config.objectId || 'Unknown');
                }

                // Call the helper to set up services and characteristics
                if (componentHelper(entity, accessory)) {
                    this.accessories.push(accessory);
                    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
                }
            } else {
                // Update existing accessory state/logic
                componentHelper(entity, accessory);
            }
        }
    }

    public configureAccessory(accessory: PlatformAccessory): void {
        this.accessories.push(accessory);
    }
}