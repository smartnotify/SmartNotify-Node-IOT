/********* SMARTNOTIFY API INTERACTION *************************** 
* VERSION:  0.8.201603
* This code has been tested with the example published on GitHUb and
* can be used as an example on how to interact with the SmartNotify API
* Please note that to use the API yourself you will need to create a specific
* account and have the right access keys.
*
*
* IMPLEMENTATION NOTES
* GPS Reporting :  To use a GPS Position you can either hardcode the value if you have
*                  a static device or use the data returned by the device.  We don't recommend
*                  sending a location point each time a GPS update is done because of frequency.
*
* Device "login":  You need to assign a name + login (pwd) to your devices so they can interact
*                  with SmartNotify.  Whichever method you use is your decision obviously.  In our
*                  example we are using the approach of adding an IOT_ prefix and then using the 
*                  mac address.  You can use whichever scheme for the pwd as well (we use SSL on production by the way)
*
* Device Group:    In SmartNotify you can group your devices.  If you are going to assign the device to a group (we will auto-register it
*                  the first time the device connects), make sure you first create the group in SmartNotify via the group management interface
******************************************************/

/** Variables you can change! ******/

var mySmartNotifyID = "no";
var AuthorizationHeader = “XXXXXXXXXXXXXXXX”;  //You will get this info for us. You should use the key sent at Login time, much cleaner
var DeviceName="";  // See Device Login info in the notes
var DevicePassword="";
var DeviceMacAddress = "";
var email="";
var DeviceGroup=XXXXXX;  // See Device Group info
var CreateAccountifNoCredentials = true; //Should we create an account for the device if no credentials were found?

var DeviceGPS = [];  // See GPS info in the notes
        
        DeviceGPS.push(6.0361916); //Latitdude FIRST
        DeviceGPS.push(45.1299526); //Longitude SECOND
var DeviceIsMovable=true;
   

//API connection Data

var defaultPort=80; //443
var currentHTTP='smartapi.azurewebsites.net';
var intervalActionCheck = 15000;
var httpOut = require('http');

var lastMessageID = 0; 
var hasSentAlert = false;
var ShowDebug = true;





/********* DEBUG HELPER ***************************/
function ShowConsoleLog (message){
 if (ShowDebug)
     console.log(message);
}

 
var qs = require('querystring');

/********* END DEBUG HELPER ***********************/



/********* EXPORTS METHODS ************************/

exports.smartNotifyCheckIn = function smartNotifyCheckIn (dataStream) {
    checkinLogic(dataStream);
}

function checkinLogic(dataStream) {
    ShowConsoleLog("Will check the ID in 1 minute");
            if (DeviceName.length<1){
                try{
                    require('getmac').getMac(function(err,macAddress){

                        if (err) {
                            DeviceName=“XXXXXXXXXXXXXXXXXXXXX”;
                            DevicePassword =“XXXXXXXXXXXXXXXX”;
                            email = DeviceName+"@smartnotify.us";
                            goLogin();
                            ShowConsoleLog ("Error Getting the MacAddress: " + err.message);
                        } 
                            
                        else
                        {
                           DeviceName = “XXXXXXXXXXXXX”;
                        DevicePassword = macAddress.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g,'a');
                        DevicePassword = DevicePassword.substring(0, 12);
                        DeviceMacAddress= macAddress;
                        email = DeviceName+"@smartnotify.us";
                        goLogin();
                        }
                    });
                }
                catch (errGetMac) {
                    DeviceName="IOT_090909090";
                    DevicePassword ="thispassword";
                    email = DeviceName+"@smartnotify.us";
                    goLogin()
                }
            }
            function goLogin() {
                if (mySmartNotifyID.length<5){
                 //user does not have a key, we log them in  
                    ShowConsoleLog("Attempting Login");
                    smartNotifyLogin();
                    //smartNotifyRegistration();
                }
                else {
                   ShowConsoleLog("You have an ID: " + mySmartNotifyID);
                }
            }
}

exports.smartNotifyRecordEvent = function smartNotifyRecordEvent(dataStream) {
  recordEvent(dataStream) ;
}

function recordEvent(dataStream) {
    var Events=[];
     
    if (mySmartNotifyID.length<5){
        checkinLogic(dataStream);
        //SmartNotify.smartNotifyCheckIn (dataStream);
    }
    
    else {
         
        var SpecificEvent ={
            "Location": {
            "DeviceCaptureDate": new Date().toISOString(),
            "locs": DeviceGPS,
            "DeviceName": "SNIOT", //leave it this way for proper reporting.
            "DeviceInfo": dataStream.Msg
            },
        "EventID": dataStream.Status,
        "Message": JSON.stringify(dataStream),
        "Date": new Date().toISOString()
        };
        
        Events.push (SpecificEvent);
        Events = JSON.stringify(Events);
       
        //NOTE, WE could iterate over a series of events in case the device is disconnected at that time.
         
        var postheaders = {
        'Content-Type' : 'application/json',
        'Content-Length' : Buffer.byteLength(Events, 'utf8'),
        'Authorization': AuthorizationHeader
    };

        // the post options
        var optionspost = {
        host : currentHTTP,
        port : defaultPort,   
        path : '/api/Events/AddEvents',
        method : 'POST',
        agent: false,
        headers : postheaders
    };

    // do the POST call
    var reqPost = httpOut.request(optionspost, function(res) {  

        res.on('data', function(d) {
            var thed = JSON.parse(d);

            if (res.statusCode==200){

                 ShowConsoleLog("Event added");

            }
            else{
                var errorMessage =("***************** AddEvents  statusCode: ", res.statusCode);
                ShowConsoleLog(errorMessage);
            }
        });
        res.on('error', function(d) {
            ShowConsoleLog(d);
           //Handle Error specific if you would like
        }); 
    });

    // write the json data
    reqPost.write(Events);
    reqPost.end();
    reqPost.on('error', function(e) {
        ShowConsoleLog(e);
        
    });

    }
}

exports.getMyActions = function getMyActions (callback) {
    
    if (mySmartNotifyID.length>5){
         // ShowConsoleLog("Get the action");   
     try{
        var Package={"Key": mySmartNotifyID}  
        var httpOut = require('http');
         Package = JSON.stringify(Package);

        // prepare the header
    var postheaders = {
        'Content-Type' : 'application/json',
        'Content-Length' : Buffer.byteLength(Package, 'utf8'),
        'Authorization': AuthorizationHeader
    };

    // the post options
    var optionspost = {
        host : currentHTTP,
        port : defaultPort,
        path : '/api/Broadcasts/GetLatestBroadcast?UserID=abc',
        method : 'GET',
        agent: false,
        headers : postheaders
    };

    // do the POST call
    var reqPost = httpOut.request(optionspost, function(res) {  

        res.on('data', function(d) {
            var  thed = JSON.parse(d);
            
            
            if (res.statusCode==200){
               
                if (parseFloat(thed.ID)  === parseFloat(lastMessageID) ) {
                 //Don't do anything it's the same message   
                    ShowConsoleLog ("Sending Existing: " + thed.Content);
                }
                else {
                     
                    lastMessageID = thed.ID ;
                    //playSpeaker2();
                    //Let's confirm we've received (i.e. viewed) this action
                    dataStream ={
                        "Status" : 13,
                        "Msg":"Received at: " + new Date().toISOString(),
                        "ReferencePoint": thed.ID
                       }
                    recordEvent(dataStream) ;
                    ShowConsoleLog ("Sending: " + thed.Content);
                    callback( thed.Content);
                } 
            }
            else{  
                ShowConsoleLog("***************** GetLatestBroadcast  statusCode: ", res.statusCode);
            }
        });
        res.on('error', function(d) {
            ShowConsoleLog("Error: " + d);
             
        }); 
    });

    // write the json data
    reqPost.write(Package);
    reqPost.end();
    reqPost.on('error', function(e) {
        ShowConsoleLog(e);
    });
            }
     catch (errActionCheck) {
             ShowConsoleLog("getMyActions: " + errActionCheck.message);   
     }
    }
    else {
            ShowConsoleLog("Let's wait to check the messages");
        }
        
    
}

/********* END EXPORTS METHODS ********************/



/********* SMARTNOTIFY CHECK IN LOGIC *************/

function EncodeRequest (obj) {
                var str = [];
                for(var p in obj)
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            }

function smartNotifyLogin() {
      ShowConsoleLog("In Login Logic DN: " + email + " DP: " + DevicePassword);
    var LoginInfo={
          "UserName": email,
          "Password": DevicePassword
    }
    
     LoginInfo = JSON.stringify(LoginInfo);
 
var postheaders = {
    'Content-Type' : 'application/json',
    'Content-Length' : Buffer.byteLength(LoginInfo, 'utf8')
}; 
    
// the post options
var optionspost = {
    host : currentHTTP,
    port : defaultPort,
    path : '/api/Account/Login',
    method : 'POST',
    agent: false,
    headers : postheaders
};
  
// do the POST call
var reqPost = httpOut.request(optionspost, function(res) {  
     
    res.on('data', function(d) {
        var thed = JSON.parse(d);
        
        if (res.statusCode==200){
            ShowConsoleLog("ok: "  + thed.Token);
            AuthorizationHeader = thed.Token;
            mySmartNotifyID = thed.LoginID;
            
            //Let's check if the login is part of a specific group.  Note we only run this part when a group is specified in the variables on top of the page.
            if (DeviceGroup >0) {
                smartNotifyGroupRegistration();
            }
            
        }
        else{
            //ShowConsoleLog("res.statusCode: "  + res.statusCode);
            //ShowConsoleLog("Not ok: "  + thed.ErrorText);
            if(res.statusCode==401) {
                 
                if (CreateAccountifNoCredentials) {
                    
                    smartNotifyRegistration();
                }
            }
        }
    });
    res.on('error', function(d) {
        ShowConsoleLog("d: "  + d);
        //Handle error
    }); 
});
  
// write the json data
reqPost.write(LoginInfo);
reqPost.end();
reqPost.on('error', function(e) {
    ShowConsoleLog(e);
});
}
  


function smartNotifyGroupRegistration(){
 console.log("smartNotifyGroupRegistration");
 
    // prepare the header
var postheaders = {
    'Content-Type' : 'application/json',
    //'Content-Length' : Buffer.byteLength(package, 'utf8'),
    'Authorization': AuthorizationHeader
};

// the post options
var optionspost = {
    host : currentHTTP,
    port : defaultPort,
    path : '/api/Groups/Groups_CheckGroupParticipation',
    method : 'GET',
    agent: false,
    headers : postheaders,
    qs:  { GroupID:DeviceGroup, UserID:mySmartNotifyID }
};


// do the  call
var reqPost = httpOut.get(optionspost, function(res) {  
     
    res.on('data', function(d) {
        res.setEncoding('utf8');
         
        if (res.statusCode==200){
            ShowConsoleLog("account is in group: " + DeviceGroup);
        } 
        else  if (res.statusCode==404){
            ShowConsoleLog("Need to add to group: " + DeviceGroup);
            smartNotifyAddToGroup();
        }
        else{
            ShowConsoleLog("Not super nice to get this error message back!");
        }
    });

}).end();
 

}


function smartNotifyAddToGroup(){
    
    var Groups=[];
    
   // console.log("Registering in group "+ DeviceGroup+ " the following UserID: " + mySmartNotifyID);
    var specificGroup={
    "Group_ID": DeviceGroup,
    "Group_Contact_User_ID": mySmartNotifyID
    }
    
    Groups.push (specificGroup);
    Groups = JSON.stringify(Groups);
       
    //NOTE, WE could iterate over a series of Groups.
 
    // prepare the header
var postheaders = {
    'Content-Type' : 'application/json',
    'Content-Length' : Buffer.byteLength(Groups, 'utf8'),
    'Authorization': AuthorizationHeader
};

// the post options
var optionspost = {
    host : currentHTTP,
    port : defaultPort,
    path : '/api/Groups/Groups_BatchAddGroups',
    method : 'POST',
    agent: false,
    headers : postheaders 
};
    
// do the POST call
var reqPost = httpOut.request(optionspost, function(res) {  
     
    res.on('data', function(d) {
        var thed = JSON.parse(d);
         //console.dir(thed);
        
        if (res.statusCode==200){
            ShowConsoleLog("User added to group");
        } 
         
        else{
            ShowConsoleLog(res.statusCode + "  - Could not add user to group");
        }
    });
    res.on('error', function(d) {
        ShowConsoleLog(d);
    }); 
});
 
// write the json data
reqPost.write(Groups);
reqPost.end();
reqPost.on('error', function(e) {
    ShowConsoleLog(e);
});
}

function smartNotifyRegistration() {
    ShowConsoleLog("Let's create the account: " + email); 
    
    var Person={
  "First_Name": "IOT",
  "Last_Name": DeviceName,
  "Email": email,
  "Password":DevicePassword,
  "CanLogin": true,
  "FavoriteLanguage": "en-US",
  "External_ID": DeviceMacAddress,
  "UserType":2,
  "RegularPreferences": "{ \"preferred\":  { \"1\": \"SmartCast\", \"2\": \"Email\", \"3\": \"Phone\"  , \"4\": \"SMS\" }}",
  "EmergencyPreferences": "{ \"preferred\":  { \"1\": \"SmartCast\", \"2\": \"Email\", \"3\": \"Phone\"  , \"4\": \"SMS\" }}",
  "ChannelPref": "{ \"preferred\":  { \"1\": \"SmartCast\", \"2\": \"Email\", \"3\": \"Phone\"  , \"4\": \"SMS\" }}"
    };
    Person = JSON.stringify(Person);
 
    // prepare the header
var postheaders = {
    'Content-Type' : 'application/json',
    'Content-Length' : Buffer.byteLength(Person, 'utf8'),
    'Authorization': AuthorizationHeader
};

// the post options
var optionspost = {
    host : currentHTTP,
    port : defaultPort,
    path : '/api/Persons/AddPerson',
    method : 'POST',
    agent: false,
    headers : postheaders
};
 
// do the POST call
var reqPost = httpOut.request(optionspost, function(res) {  

    res.on('data', function(d) {
         
        //process.stdout.write(d);
        var thed = JSON.parse(d); 
        if (res.statusCode==200){
            if (thed.User_ID.length>5){
                //registration went ok
                mySmartNotifyID = thed.User_ID;
                ShowConsoleLog("UserID: " + mySmartNotifyID);
                //smartNotifyGroupRegistration();
                smartNotifyLogin();
            }
        }
        else{
            
            ShowConsoleLog("***************** REGISTRATION  statusCode: ", res.statusCode);
            //console.log(exReturn.message);
            //console.log (thed.Message);
             
            
        }
    });
    res.on('error', function(d) {
        console.log("Error: " + d);
        //console.dir(d);
    }); 
});
 
// write the json data
reqPost.write(Person);
reqPost.end();
reqPost.on('error', function(e) {
    console.error(e);
});
     
}





