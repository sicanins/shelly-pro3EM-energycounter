# shelly-pro3EM-energycounter

This is a shelly script that runs on the Shelly Pro 3EM with firmware >= 1.0.0.

It samples the total_instant_power every 500ms and integrates it into two variables: consumed and returned energy.
The results is written into the "name" field of the device. Therefore its visible in the headline of the web-interface and can also be queried by the iobroker.shelly plugin.
KVS flash storage is used add persistance to the measured energy values; they are saved every half hour.

You can write the flash values by: (for example to make it match your grid energy meter)
- start the script
- type into the debug console below the script: "SetKVS("EnergyConsumed", 100.1*3600000 );" to set the consumed energy to 100.1 KWh.


