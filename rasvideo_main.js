/********************************************************************************************************************
RAS video SDK
********************************************************************************************************************/
var RASVideo = 
{    
    host        : '',
    service     : '',
    callback    : '',
    adResponse  : '',
    partnerName : '',
    MSOId       : ''
};

RASVideo.init = function(server, partnerName, MSOId) {
    this.host = 'https://prod.adgwy.tivo.com/';
    this.service = 'advertising/g-adn/v1.0';
    this.callback = '';
    this.adResponse = '';
    this.partnerName = '';
    this.MSOId = '';
    
    switch (server) {
		case 'dev': this.host = 'https://dev.adgwy.tivo.com/'; break;
        case 'qa': this.host = 'https://test.adgwy.tivo.com/'; break;
        case 'stg': this.host = 'https://stage.adgwy.tivo.com/'; break;
        case 'prod': this.host = 'https://prod.adgwy.tivo.com/'; break;
    }
				
    this.partnerName = partnerName;
    this.MSOId = MSOId;

    RASVideo.service = RASVideo.host + RASVideo.service;
    document.write(RASVideo.service);
}

RASVideo.sendReq = function(request) {
    try {
        var page_request = null;
        if (window.XMLHttpRequest) // if Mozilla, Safari etc
            page_request = new XMLHttpRequest()
        else if (window.ActiveXObject) { // if IE
            try {
                page_request = new ActiveXObject("Msxml2.XMLHTTP")
            }
            catch (e) {
                try {
                    page_request = new ActiveXObject("Microsoft.XMLHTTP")
                }
                catch (e) { }
            }
        } else
            return false;

       
        page_request.onreadystatechange = function() {
            RASVideo.readyState(page_request, request);
        }

        page_request.open('GET', request.url);                                         
        page_request.send(null);
    }
    catch (e) {
    }
}

RASVideo.readyState = function(page_request, request) {
    try {
        if (page_request.readyState == 4 && page_request.status == 200) {

            if (request) {
                document.write('complete');
                request.success(page_request.responseXML);
            }
        } else {
            request.error(page_request, page_request.status, page_request.statusText);
        }
    }
    catch (e) {
    }
}

/******************************************************************************************************************************
* Request Ad
*******************************************************************************************************************************/
RASVideo.buildRequest = function(adRequest) {

    var url = new StringBuilder();
    _this = this;

    try {
        var _this = this;

        //url.append(getClientProtocallType());
        url.append(RASVideo.service);

        // Ad Request URL format:
        // http://integration-adnetwork.rovicorp.com/advertising/g-adn/v1.0/{partnerName}/{devModel}/{appName}/{screen}/{adFamily}/{adSubFamily}

        // Sample: Generic client URL as per RAS on-boarding document
        // http://integration-adnetwork.rovicorp.com/advertising/g-adn/v1.0/rovi/all/anyapp/default/display/customsize
        if (!validateVariable(this.partnerName)) {
            //throw ("Partnername is a mandatory parameter");
        }

        // append partner name
        url.append("/" + encodeURIComponent(this.partnerName));
        url.append("?format=xml");

        // build query parameter object
        var qParms = {
		
			'adunittype': adRequest.adunittype,
            'videotype': adRequest.videotype,
            'appname': adRequest.appname,
            'apptype': adRequest.apptype,
            'appver': adRequest.appver,
            'devid': adRequest.devid,
            'devlat': adRequest.devlat,
            'devtype': adRequest.devtype,
            'uxloc': adRequest.uxloc,
            'mvpd': adRequest.mvpd,
            'sz': adRequest.sz,
            'callsign': adRequest.callsign

        };
		
		//TODO add required parameter validation
		/*if (!validateVariable(this.partnerName)
				|| !validateVariable(adRequest.devmodel)
				|| !validateVariable(adRequest.appname)
				|| !validateVariable(adRequest.screen)) {
            throw ("One or more of mandatory parameters partnername, devmodel, appname and screen are missing");
        }*/

        // build query parameter string
        for (i in qParms) {
            if (qParms.hasOwnProperty(i) && validateVariable(qParms[i])) {
                url.append("&" + i + "="
						+ encodeURIComponent(qParms[i]));
            }
        }
		
		var date = new Date();
            url.append("&correlator=" + date.getTime());
			
    } catch (err) {
        /*if (validateVariable(adSlotConfig.errcallback)) {
        if (typeof adSlotConfig.errcallback == "string") {
        window[adSlotConfig.errcallback](2, err);
        }
        if (typeof adSlotConfig.errcallback == "function") {
        adSlotConfig.errcallback(2, err);
        }
        }*/
        throw ("AD_BANNER_ERROR_CREATING_URL >>>> " + err);
    }
    return "http://stage.adgwy.tivo.com/advertising/ads/v1/TiVo?format=xml&adunittype=test_ad_unit&videotype=pre-roll&appname=TivoMAX&apptype=Entertainment&appver=HYDRA1.1&devid=b7578947-8789-4e21-b24f-dfd80b43b84b&devlat=0&devtype=stb&uxloc=VOD&mvpd=tivo&sz=1280x720&callsign=KTVIDT&VPI=mp4&correlator="+date.getTime();
    //return url.toString();
}

RASVideo.getAd = function(adRequest) {
    console.log("getAd");
    //var rurl = this.service + adType +"?msoid="+this.MSOId;
    var requestParams = JSON.parse(adRequest.toLowerCase());
    var rurl = RASVideo.buildRequest(requestParams);
  

    var request = {
        method: "GET",
        url: rurl,
        dataType: "xml",
        error: function(XHR, textStatus, errorThrown) {
        if (window.JSInterface) {
                window.JSInterface.onError(textStatus,errorThrown);                                
            } 
        },
        success: function(response) {
            document.write(response);
            RASVideo.adResponse = response;

            var mediaURL = RASVideo.parseMediaFiles();
            if (window.JSInterface) {
                window.JSInterface.setAdVideoPath(mediaURL);                              
            }
			else {
				OBJCBridge.setUrl(mediaURL);
			}
        }
    }

    document.write('getAd ' + rurl + '<BR>');
    RASVideo.sendReq(request);
}

/********************************************************************************************************************************
* Parse VAST response
*********************************************************************************************************************************/

RASVideo.parseMediaFiles = function() {

    // parse MediaFiles element. This has list of MediaFile elements.
    try {
        var linear = RASVideo.adResponse.getElementsByTagName("Linear")[0];
        var mediaFiles = linear.getElementsByTagName("MediaFiles")[0];
        var mediaFile = mediaFiles.getElementsByTagName("MediaFile");

        mediaFound: for (var k = 0, kl = mediaFile.length; k < kl; ++k) {
            try {
                var type = mediaFile[k].getAttribute('type').toLowerCase();

                // TODO: Why only x-mp4 OR x-flv? Need research on this!
                if (type == 'video/x-mp4') {
                    type = "video/mp4";
                }
                // For IE browser 
                if (type == 'video/mp4') {
                    type = "video/mp4";
                }
                if (type == 'video/x-flv') {
                    type = "video/flv";
                }

                /*if (navigator.appName !== 'Microsoft Internet Explorer') {
                console.log(
                "navigator.appName >>>> " + navigator.appName +
                " | Media Type >>>> " + type +
                " | !video.canPlayType >>>> " + !video.canPlayType +
                " | !video.canPlayType(type).replace(/no/, '') >>>> " + !video.canPlayType(type).replace(/no/, ''));
                // TODO: What's this for?
                if (!video.canPlayType
                // || !video.canPlayType(type).replace(/no/, '')
                ) {
                continue;
                }
                }*/

                for (var l = 0, ll = mediaFile[k].childNodes.length; l < ll; ++l) {
                    var data = null;
                    if (mediaFile[k].childNodes[l].data && mediaFile[k].childNodes[l].data.replace(/^\s+/, '').replace(/\s+$/, '').length > 0) {
                        data = mediaFile[k].childNodes[l].data.replace(/^\s+/, '').replace(/\s+$/, '');
                    } else if (mediaFile[k].childNodes[l].childNodes[0]) {
                        data = mediaFile[k].childNodes[l].childNodes[0].data.replace(/^\s+/, '').replace(/\s+$/, '');
                    }
                    if (!data || data.length == 0) {
                        continue;
                    }
					var date = new Date();
                    data = data + "?rcb=" + date.getTime();
                    
                    //adspot.source = data;
                    //adspot.mime = type;
                    break mediaFound;

                }
            } catch (e) {
                throw ("Exception (inner) MediaFile >>>> " + e);
            }
        }
    } catch (e) {
        throw ("Exception (outer) MediaFiles >>>> " + e);
    }

    return data;

}

/********************************************************************************************************************************
* Fire tracking events
*********************************************************************************************************************************/

RASVideo.onImpression = function() {
    try {
        var impression = RASVideo.adResponse.getElementsByTagName("Impression")
        var rurl;
		
        for (var imp = 0, impl = impression.length; imp < impl; ++imp) {
            rurl = impression[imp].childNodes[0].data;

            var request = {
                method: "GET",
                url: rurl,
                dataType: "xml",
                error: function(XHR, textStatus, errorThrown) { /*alert('error')*/; },
                success: function(response) {
					
                }
            }            

            document.write('onImpression ' + rurl + '<BR>');
            RASVideo.sendReq(request);
        }

        if (window.JSInterface) {
            window.JSInterface.trackingEvent("IMPRESSION");
        }
    } catch (e) {
        throw ("Exception while firing impression beacon >>>> " + e);
    }
}

RASVideo.trackingEvent = function(eventName) {
try {
   
        var linear = RASVideo.adResponse.getElementsByTagName("Linear")[0];
        var trackingEvents = linear.getElementsByTagName("TrackingEvents")[0];
        var tracking = trackingEvents.getElementsByTagName("Tracking");

        for (var k = 0, kl = tracking.length; k < kl; ++k) {
            var event = tracking[k].getAttribute('event');
            if (!event || event != eventName)
                continue;
            for (var l = 0, ll = tracking[k].childNodes.length; l < ll; ++l) {
                var data = null;
                if (tracking[k].childNodes[l].data && tracking[k].childNodes[l].data.replace(/^\s+/, '').replace(/\s+$/, '').length > 0) {
                    data = tracking[k].childNodes[l].data.replace(/^\s+/, '').replace(/\s+$/, '');
                } else if (tracking[k].childNodes[l] && tracking[k].childNodes[l].childNodes[0] && tracking[k].childNodes[l].childNodes[0].data && tracking[k].childNodes[l].childNodes[0].data.replace(/^\s+/, '').replace(/\s+$/, '')) {
                    data = tracking[k].childNodes[l].childNodes[0].data.replace(/^\s+/, '').replace(/\s+$/, '');
                }

                rurl = data;
               
                var request = {
                    method: "GET",
                    url: rurl,
                    dataType: "xml",
                    error: function(XHR, textStatus, errorThrown) {
							// Errors occur for x-domain and other issues - commenting alert so it doesn't
							// show up on iOS device. SCD
							//alert('error');
						},
                    success: function(response) {                       
                    }
                }

                document.write('trackingEvent ' + rurl + '<BR>');
                RASVideo.sendReq(request);
            }
        }
        
        //Notify app tracking event was requested
        if (window.JSInterface) {
            window.JSInterface.trackingEvent(eventName.toUpperCase());
        }
    } catch (e) {
        throw ("Exception parsing TrackingEvents (Linear Ad) element >>>> " + e);
    }
}

/*****************************************************************************************************************************
* Utility functions
*****************************************************************************************************************************/
function StringBuilder() {
    var strings = [];

    /**
    * 
    */
    this.append = function(string) {
        string = verify(string);
        if (string.length > 0)
            strings[strings.length] = string;
    };

    /**
    * 
    */
    this.appendLine = function(string) {
        string = verify(string);
        if (this.isEmpty()) {
            if (string.length > 0)
                strings[strings.length] = string;
            else
                return;
        } else
            strings[strings.length] = string.length > 0 ? "\r\n" + string
					: "\r\n";
    };

    /**
    * 
    */
    this.clear = function() {
        strings = [];
    };

    /**
    * 
    */
    this.isEmpty = function() {
        return strings.length == 0;
    };

    /**
    * 
    */
    this.toString = function() {
        return strings.join("");
    };

    /**
    * 
    */
    var verify = function(string) {
        if (!defined(string))
            return "";
        if (getType(string) != getType(new String()))
            return String(string);
        return string;
    };

    /**
    * 
    */
    var defined = function(el) {
        // Changed per Ryan O'Hara's comment:
        return el != null && typeof (el) != "undefined";
    };

    /**
    * 
    */
    var getType = function(instance) {
        if (!defined(instance.constructor))
            throw Error("Unexpected object type");
        var type = String(instance.constructor).match(/function\s+(\w+)/);

        return defined(type) ? type[1] : "undefined";
    };
}

/**
* validate Js variable
* 
* @param myVar
*            the variable to be validated
* @returns Boolean returns true if value exists else false
*/
function validateVariable(myVar) {

    if (typeof myVar !== 'undefined') { // check if its undefined
        if (myVar !== '') { // check if its not empty
            return true;
        }
    }
    return false;
}