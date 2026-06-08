import { Characteristic, Service } from '../index';
import { PlatformAccessory, Service as HAPService } from 'homebridge';

const fahrenheitUnit = '°F';

/**
 * Checks if the sensor is a temperature sensor based on its unit.
 */
const isTemperatureComponent = (unitOfMeasurement: string | undefined): boolean =>
    unitOfMeasurement === '°C' || unitOfMeasurement === fahrenheitUnit;

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
    
    // Note: If your tinaco uses 'm' or 'cm', we can add custom logic here later.
    return false;
};

/**
 * Standard setup for Temperature and Humidity style sensors.
 */
const defaultSetup = (
    component: any,
    accessory: PlatformAccessory,
    SelectedService: typeof Service.TemperatureSensor | typeof Service.HumiditySensor,
    SelectedCharacteristic: typeof Characteristic.CurrentTemperature | typeof Characteristic.CurrentRelativeHumidity,
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

    // Set the initial value from the ESP32
    updateValue(component.state);

    // Subscribe to real-time state changes from the device
    component.on('state', (value: number) => {
        updateValue(value);
    });
};