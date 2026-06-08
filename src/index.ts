import { API, Characteristic as HAPCharacteristic, PlatformAccessory, Service as HAPService } from 'homebridge';
import * as uuidFunctions from 'hap-nodejs/dist/lib/util/uuid';
import { EsphomePlatform } from './platform';

/**
 * MUST match the "name" field in your package.json
 */
export const PLUGIN_NAME = 'homebridge-esphome-waterlevel-hv2';

/**
 * MUST match the "pluginAlias" field in your config.schema.json
 */
export const PLATFORM_NAME = 'esphome-hv2';

export let UUIDGen: typeof uuidFunctions;
export let Accessory: typeof PlatformAccessory;
export let Service: typeof HAPService;
export let Characteristic: typeof HAPCharacteristic;

/**
 * Main entry point for Homebridge to load the plugin.
 *
 * @param {API} homebridge - The Homebridge API instance.
 */
export default (homebridge: API) => {
    // Accessory must be created from the PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are inherited from hap-nodejs via the Homebridge API
    UUIDGen = homebridge.hap.uuid;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    /**
     * Register your custom HV2 platform.
     * The third parameter refers to the class modified in platform.ts
     */
    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, EsphomePlatform);
};
