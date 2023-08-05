let energyReturnedWs = 0.0;
let energyConsumedWs = 0.0;

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
  SetKVS("EnergyConsumed", energyConsumedWs );
  SetKVS("EnergyReturned", energyReturnedWs );
}
Shelly.call(
   "KVS.Get", {
     "key": "EnergyReturned",
   },
  function callback(result, error_code, error_message, userdata) {
     if (error_code === 0) 
     {
       energyReturnedWs = Number(result.value);
       print("Loaded returned energy: ", energyReturnedWs / 3600000, " KWh");
     }       
   }
 );
 
 Shelly.call(
   "KVS.Get", {
     "key": "EnergyConsumed",
   },
  function callback(result, error_code, error_message, userdata) {
     if (error_code === 0) 
     {
       energyConsumedWs = Number(result.value);
       print("Loaded consumed energy: ", energyConsumedWs / 3600000, " KWh");
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
           config: {device:{name:(energyConsumedWs / 3600000).toFixed(3)+" KWh ; "+(energyReturnedWs / 3600000).toFixed(3)+" KWh"}},
        },
        function(result, error_code, error_message, userdata) {
           //print("error ", error_code, " : ", error_message);
           //print("result", JSON.stringify(result));
        }
      );
             
      if (typeof SHELLY_ID !== "undefined" && MQTTpublish === true) 
      {         
        let value = (energyConsumedWs / 3600000).toFixed(3);
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
        
        let value = (energyReturnedWs / 3600000).toFixed(3);
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
