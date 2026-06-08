import { CharacteristicEventTypes, CharacteristicGetCallback } from 'hap-nodejs';
// Eliminamos la importación de BinarySensor que causaba el error TS2305
import { Characteristic, Service } from '../index';
import { PlatformAccessory } from 'homebridge';

// Define HomeKit services and characteristics types
type SupportedServices =
    | typeof Service.MotionSensor
    | typeof Service.LeakSensor
    | typeof Service.ContactSensor
    | typeof Service.SmokeSensor;
type SupportedCharacteristics =
    | typeof Characteristic.MotionDetected
    | typeof Characteristic.ContactSensorState
    | typeof Characteristic.SmokeDetected
    | typeof Characteristic.LeakDetected;

interface BinarySensorHomekit {
    characteristic: SupportedCharacteristics;
    service: SupportedServices;
}

/**
 * Maps ESPHome device classes to HomeKit Services and Characteristics
 */
const getHomekitConfig = (deviceClass: string): BinarySensorHomekit | undefined => {
    const configMap: Record<string, BinarySensorHomekit> = {
        'motion': {
            characteristic: Characteristic.MotionDetected,
            service: Service.MotionSensor,
        },
        'window': {
            characteristic: Characteristic.ContactSensorState,
            service: Service.ContactSensor,
        },
        'door': {
            characteristic: Characteristic.ContactSensorState,
            service: Service.ContactSensor,
        },
        'smoke': {
            characteristic: Characteristic.SmokeDetected,
            service: Service.SmokeSensor,
        },
        'moisture': {
            characteristic: Characteristic.LeakDetected,
            service: Service.LeakSensor,
        },
    };
    return configMap[deviceClass];
};

/**
 * Helper to configure Binary Sensors in Homebridge.
 * We use 'any' for the component to avoid export member errors from the library.
 */
export const binarySensorHelper = (component: any, accessory: PlatformAccessory): boolean => {
    // Accessing deviceClass from the component configuration
    const homekitStuff = getHomekitConfig(component.config?.deviceClass || '');

    if (homekitStuff) {
        const ServiceConstructor = homekitStuff.service as any;
        let service = accessory.getService(ServiceConstructor);
        
        if (!service) {
            service = accessory.addService(ServiceConstructor, component.config.name);
        }

        // Setup the GET handler using the component's current state
        service
            .getCharacteristic(homekitStuff.characteristic)
            .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
                callback(null, component.state);
            });

        // Listen for state changes using the library's event emitter
        component.on('state', (state: boolean) => {
            service?.getCharacteristic(homekitStuff.characteristic).updateValue(state);
        });

        return true;
    }
    return false;
};