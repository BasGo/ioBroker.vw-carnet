'use strict';
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
const adapter = new utils.Adapter('vw-carnet');

const my_key = 'Zgfr56gFe87jJOM'

var VWCarNet_CredentialsAreValid = false;
var VWCarNet_VINIsValid = false;
var VWCarNet_Connected = false;
var myLastCarNetAnswer = '';
var VWCarNet_GetLocation = true;
var VWCarNet_GetEManager = true;
var VWCarNet_GetClimater = true;
var myToken = '';
var myVIN = '';
var myTmp;

var request = require('request');

// Fake the VW CarNet mobile app headers
var myHeaders = { 'Accept': 'application/json',
    'X-App-Name': 'eRemote',
    'X-App-Version': '4.6.1',
    'User-Agent': 'okhttp/2.3.0' };
var myAuthHeaders = myHeaders;

var myGoogleMapsAPIKey = '';
var myGoogleDefaulHeader = {
    'Accept': 'application/json, ' + 'text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0.1; D5803 Build/23.5.A.1.291; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/63.0.3239.111 Mobile Safari/537.36'};

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        VWCarNet_Connected = false
        adapter.setState('connection', {val: VWCarNet_Connected, ack: true}); //connection to Threema gateway not established
        adapter.log.info('VW CarNet adater stopped - cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// Some message was sent to adapter instance over message box.
adapter.on('message', function (obj) {
    if (typeof obj === 'object' && obj.message) {
        adapter.log.info('Received message in VW CarNet adapter :' + obj.command)
        if (obj.command === 'update') {
            VWCarNetReadData() // sendto command 'update' received
        }
    }
});

adapter.on('ready', function () {
    //adapter.setState('connection', {val: false, ack: true});
    myGoogleMapsAPIKey = adapter.config.GoogleAPIKey;
    VWCarNetCheckConnect()
    //main()
});

//##############################################################################################################
// declaring names for states for Vehicle data
const channel_v = "Vehicle";
const state_v_name = "Vehicle.name";
const state_v_VIN = "Vehicle.VIN";
// creating channel/states for Vehicle Data
adapter.setObject(channel_v, {
    type: 'object',
    common: {name: 'Fahrzeug'},
    native: {}
});
adapter.setObject(state_v_name, {
    type: 'state',
    common: {name: 'Name des Fahrzeugs in VW Car-Net', type: 'string', read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_v_VIN, {
    type: 'state',
    common: {name: 'Fahrgestellnummer des Fahrzeugs', type: 'string', read: true, write: false, role: 'value'},
    native: {}
});

//##############################################################################################################
// declaring names for states for selectedVehicle data
const channel_vc = "Vehicle.selectedVehicle";
const state_vc_lastConnectionTimeStamp   = "Vehicle.selectedVehicle.lastConnectionTimeStamp";
const state_vc_distanceCovered     = "Vehicle.selectedVehicle.distanceCovered";
const state_vc_range  = "Vehicle.selectedVehicle.range";
const state_vc_serviceInspectionDistance= "Vehicle.selectedVehicle.serviceInspectionDistance";
const state_vc_serviceInspectionTime= "Vehicle.selectedVehicle.serviceInspectionTime";
const state_vc_oilInspectionDistance= "Vehicle.selectedVehicle.oilInspectionDistance";
const state_vc_oilInspectionTime= "Vehicle.selectedVehicle.oilInspectionTime";
// creating channel/states for selectedVehicle Data
adapter.setObject(channel_vc, {
    type: 'channel',
    common: {name: 'ausgewähltes Fahrzeug'},
    native: {}
});
adapter.setObject(state_vc_lastConnectionTimeStamp, {
    type: 'state',
    common: {name: 'Zeitpunkt der letzten Verbindung zum Fahrzeug', type: 'string', read: true, write: false, role: 'datetime'},
    native: {}
});
adapter.setObject(state_vc_distanceCovered, {
    type: 'state',
    common: {name: 'Kilometerstand', type: 'number', unit: 'km', read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_vc_range, {
    type: 'state',
    common: {name: 'Gesamtreichweite des Fahrzeugs', type: 'number', unit: 'km', read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_vc_serviceInspectionDistance, {
    type: 'state',
    common: {name: 'Km bis zur nächsten Inspektion', type: 'string', unit: 'km', read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_vc_serviceInspectionTime, {
    type: 'state',
    common: {name: 'Zeit bis zur nächsten Inspektion', type: 'string', unit: 'Tag(e)', read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_vc_oilInspectionDistance, {
    type: 'state',
    common: {name: 'Km bis zum nächsten Ölwechsel-Service', type: 'string', unit: 'km', read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_vc_oilInspectionTime, {
    type: 'state',
    common: {name: 'Km bis zum nächsten Ölwechsel-Service', type: 'string', unit: 'Tag(e)', read: true, write: false, role: 'value'},
    native: {}
});


//##############################################################################################################
// declaring names for states for status data
const channel_s = "Vehicle.selectedVehicle.status";
const state_s_areDoorsAndWindowsClosed = "Vehicle.selectedVehicle.status.areDoorsAndWindowsClosed";
const state_s_areLightsOff = "Vehicle.selectedVehicle.status.areLightsOff";
const state_s_carCentralLock = "Vehicle.selectedVehicle.status.carCentralLock";
const state_s_fuelLevel = "Vehicle.selectedVehicle.status.fuelLevel";
const state_s_fuelRange = "Vehicle.selectedVehicle.status.fuelRange";
const state_s_batteryLevel = "Vehicle.selectedVehicle.status.batteryLevel";
const state_s_batteryRange = "Vehicle.selectedVehicle.status.batteryRange";
// creating channel/states for status Data
adapter.setObject(channel_s, {
    type: 'channel',
    common: {name: 'status'},
    native: {}
});
adapter.setObject(state_s_areDoorsAndWindowsClosed, {
    type: 'state',
    common: {name: "Türen/Fenster", type: "string", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_s_areLightsOff, {
    type: 'state',
    common: {name: "Lichter", type: "string", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_s_carCentralLock, {
    type: 'state',
    common: {name: "Zentralverriegelung", type: "string", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_s_fuelLevel, {
    type: 'state',
    common: {name: "Füllstand Kraftstoff", type: "string", unit: "%", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_s_fuelRange , {
    type: 'state',
    common: {name: "Reichweite Kraftstoff", type: "string", unit: "km", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_s_batteryLevel, {
    type: 'state',
    common: {name: "Füllstand Batterie", type: "string", unit: "%", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_s_batteryRange, {
    type: 'state',
    common: {name: "Reichweite Batterie", type: "string", unit: "km", read: true, write: false, role: 'value'},
    native: {}
});


//##############################################################################################################
// declaring names for states for eManager data
const channel_e = "Vehicle.selectedVehicle.eManager";
const state_e_batteryPercentage = "Vehicle.selectedVehicle.eManager.batteryPercentage";
const state_e_chargingState = "Vehicle.selectedVehicle.eManager.chargingState";
const state_e_chargingRemaining = "Vehicle.selectedVehicle.eManager.chargingRemaining";
const state_e_maxChargeCurrent = "Vehicle.selectedVehicle.eManager.maxChargeCurrent";
const state_e_pluginState = "Vehicle.selectedVehicle.eManager.pluginState"
const state_e_extPowerSupplyState = "Vehicle.selectedVehicle.eManager.extPowerSupplyState"
//const state_e_climatisationWithoutHVPower = "Vehicle.selectedVehicle.eManager.climatisationWithoutHVPower";
// creating channel/states for eManager Data
adapter.setObject(channel_e, {
    type: 'channel',
    common: {name: 'e-Manager'},
    native: {}
});
adapter.setObject(state_e_batteryPercentage, {
    type: 'state',
    common: {name: "Ladezustand der Hauptbatterie in 10%-Schritten", type: "number", unit: "%", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_e_chargingState, {
    type: 'state',
    common: {name: "Zustand des Ladevorgangs", type: "string", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_e_chargingRemaining, {
    type: 'state',
    common: {name: "Verbleibende Ladedauer bis 100% SoC", type: "string", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_e_maxChargeCurrent, {
    type: 'state',
    common: {name: "maximaler Ladestrom", type: "number", unit: "A", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_e_pluginState, {
    type: 'state',
    common: {name: "Ladestecker eingesteckt", type: "string", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_e_extPowerSupplyState, {
    type: 'state',
    common: {name: "Ext. Stromversorgung", type: "string", read: true, write: false, role: 'value'},
    native: {}
});

//##############################################################################################################
// declaring names for states for location data
const channel_l = "Vehicle.selectedVehicle.location";
const state_l_lat = "Vehicle.selectedVehicle.location.lat";
const state_l_lng = "Vehicle.selectedVehicle.location.lng";
const state_l_parkingTime = "Vehicle.selectedVehicle.location.parkingTime";
const state_l_address = "Vehicle.selectedVehicle.location.address";
// creating channel/states for location Data
adapter.setObject(channel_l, {
    type: 'channel',
    common: {name: 'Parkposition'},
    native: {}
});
adapter.setObject(state_l_lat, {
    type: 'state',
    common: {name: "Breitengrad der Position des Fahrzeugs", type: "number", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_l_lng, {
    type: 'state',
    common: {name: "Längengrad der Position des Fahrzeugs", type: "number", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_l_parkingTime, {
    type: 'state',
    common: {name: "Zeitpunkt parken des Fahrzeugs", type: "string", read: true, write: false, role: 'datetime'},
    native: {}
});
adapter.setObject(state_l_address, {
    type: 'state',
    common: {name: "Anschrift der Position des Fahrzeugs", type: "string", read: true, write: false, role: 'value'},
    native: {}
});


//##############################################################################################################
// declaring names for states for climater data
const channel_c = "Vehicle.selectedVehicle.climater";
const state_c_climatisationWithoutHVPower = "Vehicle.selectedVehicle.climater.climatisationWithoutHVPower";
const state_c_targetTemperature = "Vehicle.selectedVehicle.climater.targetTemperature";
const state_c_outdoorTemperature = "Vehicle.selectedVehicle.climater.outdoorTemperature";
const state_c_address = "Vehicle.selectedVehicle.climater.address";
// creating channel/states for climater Data
adapter.setObject(channel_c, {
    type: 'channel',
    common: {name: 'Parkposition'},
    native: {}
});
adapter.setObject(state_c_climatisationWithoutHVPower, {
    type: 'state',
    common: {name: "Klimatisierung/Scheibenheizung über Batterie zulassen", type: "boolean", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_c_targetTemperature, {
    type: 'state',
    common: {name: "Zieltemperatur", type: "number", unit: "°C", read: true, write: false, role: 'value'},
    native: {}
});
adapter.setObject(state_c_outdoorTemperature, {
    type: 'state',
    common: {name: "Außentemperatur", type: "number", unit: "°C", read: true, write: false, role: 'value'},
    native: {}
});

// ############################################# start here! ###################################################


function main() {
    //standard Function
}

function decrypt(key, value) {
    var result = '';
    for(var i = 0; i < value.length; i++) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
}

function VWCarNetReadData(){
    var mySuccefulUpdate = true
    CarNetLogon(function(myTmp){
        VWCarNet_CredentialsAreValid=myTmp;
        VWCarNet_Connected = VWCarNet_CredentialsAreValid && VWCarNet_VINIsValid;
        //adapter.log.info(VWCarNet_CredentialsAreValid);
        if (VWCarNet_Connected){
            RetrieveVehicleData_Status(function(myTmp){
                //adapter.log.info(myTmp);
                mySuccefulUpdate = mySuccefulUpdate && myTmp
            });
            RetrieveVehicleData_Location(function(myTmp){
                //adapter.log.info(myTmp);
                mySuccefulUpdate = mySuccefulUpdate && myTmp
            });

           RetrieveVehicleData_eManager(function(myTmp) {
               //adapter.log.info(myTmp);
               mySuccefulUpdate = mySuccefulUpdate && myTmp
           });
           RetrieveVehicleData_Climater(function(myTmp){
               //adapter.log.info(myTmp);
               mySuccefulUpdate = mySuccefulUpdate && myTmp
           });

            //adapter.log.info(myLastCarNetAnswer);
            if (mySuccefulUpdate){
                var myDate = Date.now();
                adapter.setState('lastUpdate', {val: myDate, ack: true});
            };
        }
    });
}

function VWCarNetCheckConnect() {
    CarNetLogon(function(myTmp){
        VWCarNet_CredentialsAreValid=myTmp;
        //adapter.log.info('Credentials valid?: ' +  VWCarNet_CredentialsAreValid);
        if (VWCarNet_CredentialsAreValid){
            RetrieveVehicles(function(myTmp){
                RetrieveVehicleData_VINValid(function(myTmp){
                    VWCarNet_VINIsValid=myTmp;
                    //adapter.log.info('VIN valid?: ' + VWCarNet_VINIsValid)
                    VWCarNet_Connected = VWCarNet_CredentialsAreValid && VWCarNet_VINIsValid;
                    adapter.setState('connection', {val: VWCarNet_Connected, ack: true});
                    if(VWCarNet_VINIsValid){
                        var mySuccefulUpdate = true
                        adapter.setState(state_v_VIN, {val: myVIN, ack: true});
                    } else {
                        adapter.setState(state_v_VIN, {val: '', ack: true});
                    }
                    if (VWCarNet_Connected){
                        RetrieveVehicleData_Status(function(myTmp){
                            //adapter.log.info(myTmp);
                            mySuccefulUpdate = mySuccefulUpdate && myTmp
                        });
                    }
                    //adapter.log.info('VW Car-Net connected?: ' + VWCarNet_Connected);
                    if (mySuccefulUpdate){
                        var myDate = Date.now();
                        adapter.setState('lastUpdate', {val: myDate, ack: true});
                    };
                });
            });
        }
    });
}

function CarNetLogon(callback) { //retrieve Token for the respective user
    var responseData;
    var myConnected=false;
    var myUrl = 'https://msg.volkswagen.de/fs-car/core/auth/v1/VW/DE/token';
    var myFormdata = {'grant_type': 'password',
        'username': adapter.config.email,
        'password': decrypt(my_key, adapter.config.password)};
    request.post({url: myUrl, form: myFormdata, headers: myHeaders}, function(error, response, result){
        //adapter.log.info(response.statusCode);
        switch(response.statusCode){
            case 200:
                //adapter.log.info("Answer fom Car-Net: 200 - connection successful");
                myConnected=true;  //connection to VW Car-Net successful established
                myLastCarNetAnswer='200 - connection successful';
                break;
            case 401:
                adapter.log.error("Answer fom Car-Net: 401 - Username or PW are incorrect");
                myConnected=false;  //connection to VW Car-Net not established
                myLastCarNetAnswer='401 - Username or PW are incorrect';
                break;
            default:
                //adapter.log.info("000 - undefined");
                myConnected=false;  //connection to VW Car-Net not established
                myLastCarNetAnswer='Answer fom Car-Net: ' + response.statusCode + ' undefined';
        }
        responseData = JSON.parse(result);
        myAuthHeaders.Authorization = 'AudiAuth 1 ' + responseData.access_token;
        myToken = responseData.access_token;
        return callback(myConnected);
    });
}
function RetrieveVehicles(callback){ //retrieve VIN of the first vehicle (Fahrgestellnummer)
    var responseData;
    var myVehicleID = 0;
    var myUrl = 'https://msg.volkswagen.de/fs-car/usermanagement/users/v1/VW/DE/vehicles';

    if (VWCarNet_CredentialsAreValid===false){
        return callback('not autenticated');
    }
    if (adapter.config.VIN === ''){
        request.get({url: myUrl, headers: myAuthHeaders}, function (error, response, result){
            //adapter.log.debug(result);
            responseData = JSON.parse(result);
            myVIN = responseData.userVehicles.vehicle[myVehicleID];
            //adapter.log.info(responseData.userVehicles.vehicle.length);
            return callback('Count: ' + responseData.userVehicles.vehicle.length);
        });
    } else {
        myVIN = adapter.config.VIN;
        return callback('default');
    }
}

function RetrieveVehicleData_VINValid(callback){
    var responseData;
    var myVINIsValid=false;
    var myUrl = 'https://msg.volkswagen.de/fs-car/bs/vsr/v1/VW/DE/vehicles/' + myVIN + '/status';
    request.get({url: myUrl, headers: myAuthHeaders}, function (error, response, result){
        //adapter.log.info(result);
        //adapter.log.info(response.statusCode);
        responseData = JSON.parse(result);
        try {
            //adapter.log.info(responseData.StoredVehicleDataResponse.vin);
            if(responseData.StoredVehicleDataResponse.vin===myVIN){
                return callback(true);
            }
        }
        catch (ex) {
            adapter.log.error(responseData.error.errorCode + ': ' + responseData.error.description);
            return callback(false);
        }

    });
}

function RetrieveVehicleData_Status(callback){
    var responseData;
    var myCarNet_vehicleStatus;
    var myData = 0;
    var myField = 0;
    var myReceivedDataKey;
    var myOilInspectionDays=0, myOilInspectionKm=0;
    var myServiceInspectionDays=0, myServiceInspectionKm=0;

    var myUrl = 'https://msg.volkswagen.de/fs-car/bs/vsr/v1/VW/DE/vehicles/' + myVIN + '/status';
    if (VWCarNet_Connected===false){return callback(false)};
    try{
        request.get({url: myUrl, headers: myAuthHeaders}, function (error, response, result){
            //adapter.log.info(result);
            try {
                responseData = JSON.parse(result);
            } catch (err) {
                adapter.log.error(responseData.error.errorCode + ': ' + responseData.error.description);
                return callback(false);
            }
            myCarNet_vehicleStatus = responseData.StoredVehicleDataResponse.vehicleData;
            //adapter.log.info(myCarNet_vehicleStatus.data[myData].field[myField].tsCarSentUtc);
            adapter.setState(state_vc_lastConnectionTimeStamp, {val: myCarNet_vehicleStatus.data[myData].field[myField].tsCarSentUtc, ack: true});

            for (myData in myCarNet_vehicleStatus.data) {
                for (myField in myCarNet_vehicleStatus.data[myData].field) {
                    myReceivedDataKey = myCarNet_vehicleStatus.data[myData].field[myField];
                    //adapter.log.info(myCarNet_vehicleStatus.data[myData].id + "." + myCarNet_vehicleStatus.data[myData].field[myField].id)
                    switch(myCarNet_vehicleStatus.data[myData].id + "." + myCarNet_vehicleStatus.data[myData].field[myField].id){
                        case '0x0101010002.0x0101010002': //distanceCovered
                            adapter.setState(state_vc_distanceCovered, {val: myReceivedDataKey.value, ack: true});
                            //adapter.log.info(myReceivedDataKey.value);
                            break;
                        case '0x0203FFFFFF.0x0203010001': //oilInspectionData_km
                            myOilInspectionKm = myReceivedDataKey.value *-1;
                            adapter.setState(state_vc_oilInspectionDistance, {val: myOilInspectionKm, ack: true});
                            //adapter.log.info(myOilInspectionKm + myReceivedDataKey.unit);
                            break;
                        case '0x0203FFFFFF.0x0203010002': //oilInspectionData_days
                            myOilInspectionDays = myReceivedDataKey.value *-1;
                            adapter.setState(state_vc_oilInspectionTime, {val: myOilInspectionDays, ack: true});
                            //adapter.log.info(myOilInspectionDays);
                            break;
                        case '0x0203FFFFFF.0x0203010003': //serciceInspectionData_km
                            myServiceInspectionKm = myReceivedDataKey.value * -1;
                            adapter.setState(state_vc_serviceInspectionDistance, {val: myServiceInspectionKm, ack: true});
                            //adapter.log.info(myServiceInspectionKm + myReceivedDataKey.unit);
                            break;
                        case '0x0203FFFFFF.0x0203010004': //serviceInspectionData_days
                            myServiceInspectionDays = myReceivedDataKey.value *-1;
                            adapter.setState(state_vc_serviceInspectionTime, {val: myServiceInspectionDays, ack: true});
                            //adapter.log.info(myServiceInspectionDays);
                            break;
                        case '0x030101FFFF.0x0301010001':  //status_parking_light_off
                            //adapter.log.info('ParkingLight: ' + myReceivedDataKey.value);
                            break;
                        case '0x030103FFFF.0x0301030001': //parking_brake_active
                            //adapter.log.info('ParkingBrake: ' + myReceivedDataKey.value);
                            break;
                        case '0x030103FFFF.0x030103000A': //fuel_level_ok
                            adapter.setState(state_s_fuelLevel, {val: myReceivedDataKey.value, ack: true});
                            //adapter.log.info('FuelLevel: ' + myReceivedDataKey.value + myReceivedDataKey.unit);
                            break;
                        case '0x030103FFFF.0x0301030002': //soc_ok
                            adapter.setState(state_s_batteryLevel, {val: myReceivedDataKey.value, ack: true});
                            //adapter.log.info('BatteryLevel: ' + myReceivedDataKey.value + myReceivedDataKey.unit);
                            break;
                        case '0x030103FFFF.0x0301030006': //fuel_range
                            adapter.setState(state_s_fuelRange, {val: myReceivedDataKey.value, ack: true});
                            //adapter.log.info('FuelRange: ' + myReceivedDataKey.value + myReceivedDataKey.unit);
                            break;
                        case '0x030103FFFF.0x0301030008': //electric_range
                            adapter.setState(state_s_batteryRange, {val: myReceivedDataKey.value, ack: true});
                            //adapter.log.info('BatteryRange: ' + myReceivedDataKey.value + myReceivedDataKey.unit);
                            break;
                        case '0x030103FFFF.0x0301030005': //total_range
                            adapter.setState(state_vc_range, {val: myReceivedDataKey.value, ack: true});
                            //adapter.log.info('TotalRange: ' + myReceivedDataKey.value + myReceivedDataKey.unit);
                            break;
                        case '1':

                            break;
                        case '2':

                            break;
                        default: //thish should not be possible
                    }
                }
            }
            return callback(true);
        });
    } catch (err) {
        adapter.log.error('Fehler bei der Auswertung im status Modul');
        return callback(false);
    }
}

function RetrieveVehicleData_Location(callback) {
    var responseData;
    var locationData;
    var myCarNet_locationStatus;
    var myUrl = 'https://msg.volkswagen.de/fs-car/bs/cf/v1/VW/DE/vehicles/' + myVIN + '/position';
    if (VWCarNet_Connected === false) {
        return callback(false)
    };
    if (VWCarNet_GetLocation === false) {
        adapter.setState(state_l_lat, {val: null, ack: true});
        adapter.setState(state_l_lng, {val: null, ack: true});
        adapter.setState(state_l_parkingTime, {val: null, ack: true});
        adapter.setState(state_l_address, {val: null, ack: true});
    };
    try {
        request.get({url: myUrl, headers: myAuthHeaders, json: true}, function (error, response, responseData){
            if (error !== null) {
                return callback(false)
            }
            if (responseData === undefined) {
                return callback(false)
            }
            if ('findCarResponse' in responseData){
                myCarNet_locationStatus = responseData.findCarResponse;
                if (myCarNet_locationStatus !== undefined && myCarNet_locationStatus !== null) {
                    adapter.setState(state_l_lat, {
                        val: myCarNet_locationStatus.Position.carCoordinate.latitude,
                        ack: true
                    });
                    adapter.setState(state_l_lng, {
                        val: myCarNet_locationStatus.Position.carCoordinate.longitude,
                        ack: true
                    });
                    adapter.setState(state_l_parkingTime, {val: myCarNet_locationStatus.parkingTimeUTC, ack: true});
                    requestGeocoding(myCarNet_locationStatus.Position.carCoordinate.latitude, myCarNet_locationStatus.Position.carCoordinate.longitude);
                } else {
                    adapter.setState(state_l_lat, {val: null, ack: true});
                    adapter.setState(state_l_lng, {val: null, ack: true});
                    adapter.setState(state_l_parkingTime, {val: null, ack: true});
                    adapter.setState(state_l_address, {val: 'MOVING', ack: true});
                }
            } else {
            adapter.setState(state_l_lat, {val: null, ack: true});
            adapter.setState(state_l_lng, {val: null, ack: true});
            adapter.setState(state_l_parkingTime, {val: null, ack: true});
            adapter.setState(state_l_address, {val: 'MOVING', ack: true});
            }
            return callback(true);
            });
    } catch (err) {
    adapter.log.error('Fehler bei der Auswertung im location Modul');
    return callback(false);
    }
}

function requestGeocoding(lat, lng) {
    var myUrl = 'https://maps.googleapis.com/maps/api/geocode/json?latlng='+lat/1000000+','+lng/1000000;
    var myAddress = '<UNKNOWN>';
    if (myGoogleMapsAPIKey !== ""){
        myUrl = myUrl + '&key=' + myGoogleMapsAPIKey;
        //adapter.log.info(myUrl);
        try{
            request.get({url:myUrl, headers: myGoogleDefaulHeader,json: true}, function (error, response, result) {
                //adapter.log.info(response.statusCode);
                //adapter.log.info(JSON.stringify(result));

                if ((result.results.length > 0) & result.results[0].formatted_address !== ""){
                    myAddress = result.results[0].formatted_address;
                }
                adapter.setState(state_l_address, {val: myAddress, ack: true});
                //adapter.log.info(myAddress);
            });
        } catch (err){
            adapter.setState(state_l_address, {val: null, ack: true});
            adapter.log.error(response.statusCode);
        }
    } else {
        adapter.setState(state_l_address, {val: null, ack: true});
    }
}

function RetrieveVehicleData_eManager(callback){
    var responseData;
    var myCarNet_eManager;
    if (VWCarNet_Connected===false){return callback(false)};
    if (VWCarNet_GetEManager===false){
        adapter.setState(state_e_batteryPercentage, {val: null, ack: true});
        adapter.setState(state_e_chargingState, {val: null, ack: true});
        adapter.setState(state_e_chargingRemaining, {val: null, ack: true});
        adapter.setState(state_e_pluginState, {val: null, ack: true});
        adapter.setState(state_e_extPowerSupplyState, {val: null, ack: true});
        return callback(true)
    };
    var myUrl = 'https://msg.volkswagen.de/fs-car/bs/batterycharge/v1/VW/DE/vehicles/' + myVIN + '/charger';
    try {
        request.get({url: myUrl, headers: myAuthHeaders}, function (error, response, result){
        //adapter.log.info(result);

            responseData = JSON.parse(result);

            myCarNet_eManager = responseData.charger.settings;
            adapter.setState(state_e_maxChargeCurrent, {val: myCarNet_eManager.maxChargeCurrent.content, ack: true});
            //adapter.log.info(myCarNet_eManager.maxChargeCurrent.content);

            myCarNet_eManager = responseData.charger.status.chargingStatusData;
            // adapter.log.info(myCarNet_eManager.chargingMode.content);
            // adapter.log.info(myCarNet_eManager.chargingStateErrorCode.content);
            // adapter.log.info(myCarNet_eManager.chargingReason.content);
            adapter.setState(state_e_extPowerSupplyState, {val: myCarNet_eManager.externalPowerSupplyState.content.toUpperCase(), ack: true});
            // adapter.log.info(myCarNet_eManager.energyFlow.content);
            adapter.setState(state_e_chargingState, {val: myCarNet_eManager.chargingState.content.toUpperCase(), ack: true});

            myCarNet_eManager = responseData.charger.status.cruisingRangeStatusData;
            // adapter.log.info(myCarNet_eManager.engineTypeFirstEngine.content);
            // adapter.log.info(myCarNet_eManager.primaryEngineRange.content);
            // adapter.log.info(myCarNet_eManager.hybridRange.content);
            // adapter.log.info(myCarNet_eManager.engineTypeSecondEngine.content);
            // adapter.log.info(myCarNet_eManager.secondaryEngineRange.content);

            myCarNet_eManager = responseData.charger.status.ledStatusData;
            //adapter.log.info(myCarNet_eManager.ledColor.content);
            //adapter.log.info(myCarNet_eManager.ledState.content);

            myCarNet_eManager = responseData.charger.status.batteryStatusData;

            adapter.setState(state_e_batteryPercentage, {val: myCarNet_eManager.stateOfCharge.content, ack: true});
            var myRemainingTime = myCarNet_eManager.remainingChargingTime.content;
            var myRemainingTimeStr = Math.floor( myRemainingTime / 60 ) + ':' + ('00' + Math.floor( myRemainingTime%60 )).substr(-2);
            if (myRemainingTime <0 ){myRemainingTimeStr = null}
            adapter.setState(state_e_chargingRemaining, {val: myRemainingTimeStr, ack: true});
            //adapter.log.info(myCarNet_eManager.remainingChargingTimeTargetSOC.content);

            myCarNet_eManager = responseData.charger.status.plugStatusData;
            adapter.setState(state_e_pluginState, {val: myCarNet_eManager.plugState.content.toUpperCase(), ack: true});
            //adapter.log.info(myCarNet_eManager.lockState.content);

        return callback(true);
    });
    } catch (err) {
        adapter.log.error('Fehler bei der Auswertung im eManager Modul');
        return callback(false);
    }
}

function RetrieveVehicleData_Climater(callback){
    var responseData;
    var myCarNet_Climater;
    if (VWCarNet_Connected===false){return callback(false)};
    if (VWCarNet_GetClimater===false){
        adapter.setState(state_c_climatisationWithoutHVPower, {val: null, ack: true});
        adapter.setState(state_c_targetTemperature, {val: null, ack: true});

        return callback(true)
    };
    var myUrl = 'https://msg.volkswagen.de/fs-car/bs/climatisation/v1/VW/DE/vehicles/' + myVIN + '/climater';
    request.get({url: myUrl, headers: myAuthHeaders, json: true}, function (error, response, responseData){
        //adapter.log.info(JSON.stringify(responseData));

        myCarNet_Climater = responseData.climater.settings;
        //adapter.log.info(myCarNet_Climater.targetTemperature.content);
        adapter.setState(state_c_targetTemperature, {val: myCarNet_Climater.targetTemperature.content, ack: true});
        adapter.setState(state_c_climatisationWithoutHVPower, {val: myCarNet_Climater.climatisationWithoutHVpower.content, ack: true});
        //adapter.log.info(myCarNet_Climater.heaterSource.content);

        var myCarNet_Climater = responseData.climater.status.climatisationStatusData;
        //adapter.log.info(myCarNet_Climater.climatisationState.content);
        //adapter.log.info(myCarNet_Climater.climatisationStateErrorCode.content);
        //adapter.log.info(myCarNet_Climater.remainingClimatisationTime.content);
        //adapter.log.info(myCarNet_Climater.climatisationReason.content);

        var myCarNet_Climater = responseData.climater.status.windowHeatingStatusData;
        //adapter.log.info(myCarNet_Climater.windowHeatingStateFront.content);
        //adapter.log.info(myCarNet_Climater.windowHeatingStateRear.content);
        //adapter.log.info(myCarNet_Climater.windowHeatingErrorCode.content);

        var myCarNet_Climater = responseData.climater.status;
        //state_c_outdoorTemperature
        adapter.setState(state_c_outdoorTemperature, {val: myCarNet_Climater.temperatureStatusData.outdoorTemperature.content, ack: true});
        //adapter.log.info(myCarNet_Climater.vehicleParkingClockStatusData.vehicleParkingClock.content);

        return callback(true);
    });
}
