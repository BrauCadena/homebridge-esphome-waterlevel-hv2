import {
    CharacteristicEventTypes,
    CharacteristicSetCallback,
    CharacteristicValue,
    PlatformAccessory,
    Service as HAPService,
} from 'homebridge';
import { Characteristic, Service } from '../index';
import { ComponentHelper } from './componentHelpers';

const DEFAULT_NO_EFFECT = 'None';

/**
 * Helper to configure Light entities in Homebridge.
 * Using 'any' for the component to avoid export member errors from the native library.
 */
export const lightHelper: ComponentHelper = (component: any, accessory: PlatformAccessory): boolean => {
    // Search for an existing Lightbulb service or create a new one
    let lightBulbService: HAPService | undefined = accessory.getService(Service.Lightbulb);
    
    if (!lightBulbService) {
        lightBulbService = accessory.addService(Service.Lightbulb, component.config.name);
    }

    /**
     * ON / OFF State Handling
     */
    lightBulbService
        .getCharacteristic(Characteristic.On)
        .on(CharacteristicEventTypes.SET, (on: CharacteristicValue, callback: CharacteristicSetCallback) => {
            // Trigger turnOn or turnOff based on HomeKit input
            on ? component.turnOn().catch(() => null) : component.turnOff().catch(() => null);
            callback();
        });

    /**
     * Brightness Handling
     * Only configured if the ESPHome entity supports it
     */
    if (component.config.supportsBrightness) {
        lightBulbService
            .getCharacteristic(Characteristic.Brightness)
            .on(CharacteristicEventTypes.SET, (brightness: CharacteristicValue, callback: CharacteristicSetCallback) => {
                // ESPHome expects brightness as a float between 0.0 and 1.0
                component.setLight({ brightness: (brightness as number) / 100 }).catch(() => null);
                callback();
            });
    }

    /**
     * RGB Color Handling (Hue & Saturation)
     * Only configured if the ESPHome entity supports RGB
     */
    if (component.config.supportsRgb) {
        lightBulbService
            .getCharacteristic(Characteristic.Hue)
            .on(CharacteristicEventTypes.SET, (hue: CharacteristicValue, callback: CharacteristicSetCallback) => {
                component.setLight({ hue: hue as number }).catch(() => null);
                callback();
            });

        lightBulbService
            .getCharacteristic(Characteristic.Saturation)
            .on(CharacteristicEventTypes.SET, (sat: CharacteristicValue, callback: CharacteristicSetCallback) => {
                component.setLight({ saturation: sat as number }).catch(() => null);
                callback();
            });
    }

    /**
     * Light Effects Handling
     * Creates a separate Switch service for each available effect
     */
    const effects: { service: HAPService, name: string }[] = (component.config.effects || [])
        .filter((effect: string) => effect !== DEFAULT_NO_EFFECT)
        .map((effect: string) => {
            const switchName = `${component.config.name} - ${effect}`;
            let switchService = accessory.getService(switchName);
            if (!switchService) {
                switchService = accessory.addService(Service.Switch, switchName, effect);
            }
            return { service: switchService, name: effect };
        });

    // Setup listeners for each effect switch
    effects.forEach((eff: { service: HAPService, name: string }) => {
        eff.service
            .getCharacteristic(Characteristic.On)
            .on(CharacteristicEventTypes.SET, (on: CharacteristicValue, callback: CharacteristicSetCallback) => {
                const targetEffect = on ? eff.name : DEFAULT_NO_EFFECT;
                component.setLight({ effect: targetEffect }).catch(() => null);
                callback();
            });
    });

    /**
     * Real-time State Updates
     * Listens to the 'state' event from the ESP32 and updates HomeKit
     */
    component.on('state', (state: any) => {
        // Update power state
        lightBulbService!.getCharacteristic(Characteristic.On).updateValue(state.state);
        
        // Update brightness if supported
        if (component.config.supportsBrightness && state.brightness !== undefined) {
            lightBulbService!.getCharacteristic(Characteristic.Brightness).updateValue(state.brightness * 100);
        }

        // Update RGB colors if supported
        if (component.config.supportsRgb) {
            if (state.hue !== undefined) {
                lightBulbService!.getCharacteristic(Characteristic.Hue).updateValue(state.hue);
            }
            if (state.saturation !== undefined) {
                lightBulbService!.getCharacteristic(Characteristic.Saturation).updateValue(state.saturation);
            }
        }

        // Synchronize effect switches with the current active effect
        effects.forEach((eff: { service: HAPService, name: string }) => {
            eff.service.getCharacteristic(Characteristic.On).updateValue(state.effect === eff.name);
        });
    });

    return true;
};