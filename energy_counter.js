let energyReturnedWs = 0.0;
let energyConsumedWs = 0.0;

let energyReturnedKWh = 0.0;
let energyConsumedKWh = 0.0;

let log = 0;

// set this to false to stop publishing on MQTT
let MQTTpublish = true;

// query the MQTT prefix on startup
let SHELLY_ID = undefined;
Shelly.call("Mqtt.GetConfig", "", function (res, err_code, err_msg, ud) {
  SHELLY_ID = res["topic_prefix"];
});

function SetKVS(key, value)
{
 Shelly.call(
   "KVS.Set", {
     "key": key,
     "value": value,
   },
   function(result) {
     if (log > 0)
       print("KVS Saved, rev:", result.rev);
   }
 );
}
 
function SaveCounters()
{
  SetKVS("EnergyConsumedKWh", energyConsumedKWh );
  SetKVS("EnergyReturnedKWh", energyReturnedKWh );
}
Shelly.call(
   "KVS.Get", {
     "key": "EnergyReturnedKWh",
   },
  function callback(result, error_code, error_message, userdata) {
     if (error_code === 0) 
     {
       energyReturnedKWh = Number(result.value);
       print("Loaded returned energy: ", energyReturnedKWh, " KWh");
     }       
   }
 );
 
 Shelly.call(
   "KVS.Get", {
     "key": "EnergyConsumedKWh",
   },
  function callback(result, error_code, error_message, userdata) {
     if (error_code === 0) 
     {
       energyConsumedKWh = Number(result.value);
       print("Loaded consumed energy: ", energyConsumedKWh, " KWh");
     }       
   }
 );

let counter3600 = 0;
let counter20 = 18;

let lastPublishedMQTTConsumed = "";
let lastPublishedMQTTReturned = "";

function timerHandler(user_data)
{
  let em = Shelly.getComponentStatus("em", 0);
  if (typeof em.total_act_power !== 'undefined') {
    let power = em.total_act_power;
    
    if (power >= 0)
    {
        energyConsumedWs = energyConsumedWs + power * 0.5;
    }
    else
    {
        energyReturnedWs = energyReturnedWs - power * 0.5;
    }
    
    // once a full Wh is accumulated, move it to the KWh counter
    let fullWh = Math.floor((energyConsumedWs / 3600));
    if (fullWh > 0)
    {
      energyConsumedKWh += fullWh / 1000;
      energyConsumedWs -= fullWh * 3600;
      if (log > 0)
        print("Changed consumed KWh: ",energyConsumedKWh);
    }
    
    fullWh = Math.floor((energyReturnedWs / 3600));
    if (fullWh > 0)
    {
      energyReturnedKWh += fullWh / 1000;
      energyReturnedWs -= fullWh * 3600;
      if (log > 0)
        print("Changed returned KWh: ",energyReturnedKWh);
    }
    
    if (log > 0)
      print(power , "W");
      
    counter3600 = counter3600 + 1;
    if (counter3600 > 3600)      
    {
      counter3600 = 0;     
      SaveCounters();
    }
    
    counter20 = counter20 + 1;
    if ( counter20 > 20)
    {
      counter20 = 0;  
      Shelly.call(
        "Sys.SetConfig", {
           config: {device:{name:energyConsumedKWh.toFixed(3)+" KWh ; "+energyReturnedKWh.toFixed(3)+" KWh"}},
        },
        function(result, error_code, error_message, userdata) {
           //print("error ", error_code, " : ", error_message);
           //print("result", JSON.stringify(result));
        }
      );
             
      if (typeof SHELLY_ID !== "undefined" && MQTTpublish === true) 
      {         
        let value = energyConsumedKWh.toFixed(3);
        if (value !== lastPublishedMQTTConsumed)
        {
          MQTT.publish(
            SHELLY_ID + "/energy_counter/consumed",
            value,
            0,
            false
          );
          lastPublishedMQTTConsumed = value;
        }
        
        let value = energyReturnedKWh.toFixed(3);
        if (value !== lastPublishedMQTTReturned)
        {
          MQTT.publish(
            SHELLY_ID + "/energy_counter/returned",
            value,
            0,
            false
          );
          lastPublishedMQTTReturned = value;
        }           
      }
    }
  };
}

Timer.set(500, true, timerHandler, null);
