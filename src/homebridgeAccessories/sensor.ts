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
        defaultSetup(component, accessory, Service.LightSensor, Characteristic.CurrentAmbientLightLevel);
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

    /**
     * Updates the HomeKit characteristic with the current value.
     */
    const updateValue = (value: number | undefined) => {
        if (value === undefined) return;
        
        const finalValue = valuesAreFahrenheit 
            ? fahrenheitToCelsius(value) 
            : value;
            
        sensorService?.getCharacteristic(SelectedCharacteristic).updateValue(finalValue);
    };

    // Set initial value — state is an object { state: number, key: number, ... }
    updateValue(component.state?.state);

    // Subscribe to real-time state changes
    component.on('state', (stateObj: any) => {
        updateValue(typeof stateObj === 'object' ? stateObj.state : stateObj);
    });
};