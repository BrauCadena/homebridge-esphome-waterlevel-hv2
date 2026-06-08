import { lightHelper } from './light';
import { binarySensorHelper } from './binarySensor';
import { sensorHelper } from './sensor';
import { switchHelper } from './switch';
import { PlatformAccessory } from 'homebridge';

/**
 * Define the helper function type.
 * Using 'any' for the component parameter to ensure compatibility across 
 * different versions of the ESPHome native API library.
 */
export type ComponentHelper = (component: any, accessory: PlatformAccessory) => boolean;

/**
 * Maps ESPHome entity types (strings) to their respective Homebridge helpers.
 * Note: The native ESPHome API uses underscores for types like 'binary_sensor'.
 */
export const componentHelpers = new Map<string, ComponentHelper>([
    ['light', lightHelper],
    ['binary_sensor', binarySensorHelper],
    ['sensor', sensorHelper],
    ['switch', switchHelper],
]);