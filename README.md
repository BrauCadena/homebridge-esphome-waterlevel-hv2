# Homebridge ESPHome HV2
[![npm version](https://badge.fury.io/js/homebridge-esphome-hv2.svg)](https://www.npmjs.com/package/homebridge-esphome-hv2)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/blue)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

Developed and maintained by **Brau Cadena**.

This plugin integrates the [ESPHome](https://esphome.io/) platform into Homebridge so that you don't have to go through Home Assistant if you don't want to. It makes use of the native API of ESPHome so that you can expect instant updates for all your accessories.

## 🚀 Why HV2?
This version was specifically refactored to solve modern connectivity issues:
- **API v1.14+ Compatibility**: Fixes the `outdated API 0.0` error found in older plugins when connecting to recent ESPHome firmware.
- **Noise Encryption Support**: Adds the `encryptionKey` field for secure communication (Noise protocol), which is now the standard for ESPHome.
- **Node.js Optimized**: Designed for modern environments, supporting **Node.js 18, 20, and 22**.

### Supported Components:
- **Sensors**: Temperature, humidity, and **Ultrasonic/Water Level** (rendered as percentage).

---

## Installation
Unless you haven't done so already, make sure to install Homebridge first. See instructions [here](https://github.com/homebridge/homebridge/wiki). Once you have done this, you can install this plugin by typing:

```bash
npm install -g homebridge-esphome-hv2
```

## Getting Started
Add the following to your Homebridge config.json or use the Configuration UI:


```json
{
    "platform": "esphome-hv2",
    "devices": [
        {
            "name": "Tinaco Sensor",
            "host": "192.168.68.113",
            "encryptionKey": "YOUR_32_CHAR_ENCRYPTION_KEY",
            "port": 6053,
            "retryAfter": 60000 
        }
    ],
    "discover": true,
    "debug": false
}
```

##  Configuration Fields:
host: (Mandatory) The IP address of your ESP device (e.g., 192.168.1.50 or my_esp.local).
encryptionKey: The Noise encryption key found in your ESPHome YAML under api: encryption: key:.
password: (Legacy) Only use if you are still using the old plaintext password method.
port: Default is 6053.


## Troubleshooting
1. Check your YAML: Please make sure to add the api: entry to your ESPHome configuration!
2. Connection Issues: If you see outdated API 0.0 or Connection Refused, ensure you have copied the encryptionKey exactly as it appears in your YAML and that your Homebridge can ping the device IP.
3. Debug Mode: Before opening a ticket, set "debug": true in your config. This will:

Output the raw data received from your ESP device to the Homebridge console.

Write individual log files for each device under /tmp (or your OS temp folder).

Note: Writing debug files occupies space. Turn off this option once you don't need it anymore.

## Contributing
This project is an open effort to keep the ESPHome-Homebridge ecosystem alive. If you find a bug or want to suggest a feature, please open an issue on the official GitHub repository:

https://github.com/BrauCadena/homebridge-esphome-hv2

## License
Licensed under the GPL-3.0 License.
