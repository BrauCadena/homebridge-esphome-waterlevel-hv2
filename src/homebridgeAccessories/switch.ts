import { CharacteristicEventTypes } from 'hap-nodejs';
import { Characteristic, Service } from '../index';
import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory } from 'homebridge';

/**
 * Helper to configure Switch entities in Homebridge.
 * Using 'any' for the component to bypass specific type export issues from the library.
 */
export const switchHelper = (component: any, accessory: PlatformAccessory): boolean => {
    // Search for an existing Switch service or create a new one
    let service = accessory.getService(Service.Switch);
    
    if (!service) {
        service = accessory.addService(Service.Switch, component.config.name);
    }

    /**
     * Real-time State Synchronization
     * Updates HomeKit when the ESP32 state changes locally
     */
    component.on('state', (state: boolean) => {
        service?.getCharacteristic(Characteristic.On).updateValue(state);
    });

    /**
     * HomeKit Command Handling
     * Manages requests from Siri or the Home App
     */
    service
        .getCharacteristic(Characteristic.On)
        .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
            const targetState = !!value;
            
            // Only send the command to the ESP32 if the target state is different from the current one
            if (component.state !== targetState) {
                targetState 
                    ? component.turnOn().catch(() => null) 
                    : component.turnOff().catch(() => null);
            }
            callback();
        });

    // Initialize the switch with the current state from the device
    service.getCharacteristic(Characteristic.On).updateValue(component.state);

    return true;
};