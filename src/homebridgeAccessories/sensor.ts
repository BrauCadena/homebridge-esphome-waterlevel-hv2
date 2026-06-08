import { Characteristic, Service } from '../index';
import { PlatformAccessory, Service as HAPService } from 'homebridge';

const fahrenheitUnit = '°F';

/**
 * Checks if the sensor is a temperature sensor based on its unit.
 */
const isTemperatureComponent = (unitOfMeasurement: string | undefined): boolean =>
    unitOfMeasurement === '°C' || unitOfMeasurement === fahrenheitUnit;

const isDistanceComponent = (unitOfMeasurement: string | undefined, deviceClass: string | undefined): boolean =>
    ['m', 'cm', 'mm'].includes(unitOfMeasurement ?? '') || deviceClass === 'distance';

/**
 * Converts Fahrenheit values to Celsius for HomeKit compatibility.
 */
const fahrenheitToCelsius = (fahrenheit: number): number => ((fahrenheit - 32) * 5) / 9;

/**
 * Helper to configure Sensor entities in Homebridge.
 * Using 'any' for the component to handle the water tank level and other sensors.
 */
export const sensorHelper = (component: any, accessory: PlatformAccessory): boolean => {
    // Access unit and config metadata from the ESPHome entity
    const unit = component.config?.unitOfMeasurement;
    const icon = component.config?.icon;
    const deviceClass = component.config?.deviceClass;

    // Route to Temperature Sensor
    if (isTemperatureComponent(unit)) {
        defaultSetup(component, accessory, Service.TemperatureSensor, Characteristic.CurrentTemperature);
        return true;
    } 
    // Route to Humidity Sensor (often used for water level percentage)
    else if (
        unit === '%' &&
        (icon === 'mdi:water-percent' || deviceClass === 'humidity')
    ) {
        defaultSetup(component, accessory, Service.HumiditySensor, Characteristic.CurrentRelativeHumidity);
        return true;
    }
    
    // Distance sensor (water level in m/cm/mm) — mapped to LightSensor since HomeKit has no distance service
    else if (isDistanceComponent(unit, deviceClass)) {
        distanceSetup(component, accessory);
        return true;
    }

    return false;
};

/**
 * Standard setup for Temperature and Humidity style sensors.
 */
const defaultSetup = (
    component: any,
    accessory: PlatformAccessory,
    SelectedService: typeof Service.TemperatureSensor | typeof Service.HumiditySensor | typeof Service.LightSensor,
    SelectedCharacteristic: typeof Characteristic.CurrentTemperature | typeof Characteristic.CurrentRelativeHumidity | typeof Characteristic.CurrentAmbientLightLevel,
): void => {
    // Retrieve existing service or create a new one
    let sensorService = accessory.getService(SelectedService);
    
    if (!sensorService) {
        sensorService = accessory.addService(SelectedService, component.config.name);
    }

    const unit = component.config?.unitOfMeasurement;
    const valuesAreFahrenheit = unit === fahrenheitUnit;

    let lastValue: number = valuesAreFahrenheit
        ? fahrenheitToCelsius(component.state?.state ?? 0)
        : (component.state?.state ?? 0);

    const characteristic = sensorService.getCharacteristic(SelectedCharacteristic);

    // Respond to HomeKit polls so it never shows "No Response"
    characteristic.onGet(() => lastValue);

    const updateValue = (value: number | undefined) => {
        if (value === undefined) return;
        lastValue = valuesAreFahrenheit ? fahrenheitToCelsius(value) : value;
        characteristic.updateValue(lastValue);
    };

    // Set initial value — state is an object { state: number, key: number, ... }
    updateValue(component.state?.state);

    // Subscribe to real-time state changes
    component.on('state', (stateObj: any) => {
        updateValue(typeof stateObj === 'object' ? stateObj.state : stateObj);
    });
};

/**
 * Distance/water-level sensor setup.
 * HomeKit's CurrentAmbientLightLevel enforces a minimum of 0.0001 — values at or
 * below zero (e.g. empty tank) must be clamped or HomeKit rejects the update.
 */
const distanceSetup = (component: any, accessory: PlatformAccessory): void => {
    let sensorService = accessory.getService(Service.LightSensor);
    if (!sensorService) {
        sensorService = accessory.addService(Service.LightSensor, component.config.name);
    }

    let lastValue = Math.max(0.0001, component.state?.state ?? 0.0001);

    const characteristic = sensorService.getCharacteristic(Characteristic.CurrentAmbientLightLevel);

    // Respond to HomeKit polls so it never shows "No Response"
    characteristic.onGet(() => lastValue);

    const updateValue = (value: number | undefined) => {
        if (value === undefined || value === null) return;
        lastValue = Math.max(0.0001, value);
        characteristic.updateValue(lastValue);
    };

    updateValue(component.state?.state);

    component.on('state', (stateObj: any) => {
        updateValue(typeof stateObj === 'object' ? stateObj.state : stateObj);
    });
};