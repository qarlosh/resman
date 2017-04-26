/*
Utilidades (Ajax...)
*/

//var Q = require("Q");

var resman_utils = {};


/*	XXX
	Estaría bien poder detectar la plataforma/entorno en que se está ejecutando, para
	asi decidir los métodos de serialización a usar, o si es posible por ejemplo guardar...
*/
resman_utils.getEnvironmentType = function() {
	/*
		Ejemplos de posibles valores a devolver:
		"browser http"	Si es en un navegador, conectado a un servidor web por HTTP
		"browser file"	Si es en un navegador, abriendo una página directamente (protocolo FILE)
		"mozilla http"	O incluso, detectar el tipo de navegador?
		"cordova"		Algo asi cuando es una App compilada con Cordova
		"nwjs"			O algo asi cuando corre en NW.js
	*/
}



/*
	resman_utils.ajax
	Llamada GET ajax asíncrona. Devuelve una promise, mediante Q
	
		url		URL a la que se hace la llamada
*/
resman_utils.ajax = function(url) {
	var deferred = Q.defer();
	var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
	xhr.open('GET', url);
	xhr.onreadystatechange = function() {
		if (xhr.readyState>3) {		//	DONE
			//	leyendo responseURL se puede saber si ha sido file o http.
			//	si es file, status siempre es 0.
			//	si una llamada usando protocolo file falla (normalmente porque no existe
			//	el archivo) responseURL es "".
			//	Así pues, esto es para ver si se trata de una llamada file exitosa.
			var isfileprotocol = (xhr.responseURL && (xhr.responseURL.substr(0, 4) == 'file'));
			if (xhr.status==200 || isfileprotocol)
				deferred.resolve(xhr.responseText);
			else
				deferred.reject(xhr.status);
		}
	};
	//xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest'); // xxx y esto para qué? (http://stackoverflow.com/questions/17478731/whats-the-point-of-the-x-requested-with-header)
	xhr.send();
	return deferred.promise;
}

resman_utils.ajaxpost = function(url, content, type) {
	/*
		url			a donde se envia el POST
		content		string que se envía
		type		el tipo (un mime type)
	*/
	var deferred = Q.defer();
	var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
	xhr.open('POST', url);
	xhr.onreadystatechange = function() {
		if (xhr.readyState==2) {	//	HEADERS_RECEIVED
			//	aqui ya se puede consultar el valor de responseURL. Y si se está usando protocolo
			//	file, abortarlo, porque no se permite.
			var isfileprotocol = (xhr.responseURL && (xhr.responseURL.substr(0, 4) == 'file'));
			if (isfileprotocol) {
				//	No estoy seguro de si es más correcto lanzar la excepción o rechazar la promise
				throw "FILE protocol not allowed on HTTP POST";
				//xhr.abort();
				//deferred.reject();
			}
		}
		if (xhr.readyState>3) {		//	DONE
			//	en el caso de un POST no tiene sentido el protocolo file, asi que no hago como en GET y lo ignoro
			if (xhr.status==200)
				deferred.resolve(xhr.responseText);
			else
				deferred.reject(xhr.status);
		}
	};
	//	Se tiene que indicar el mime type en el header
	xhr.setRequestHeader("Content-type", type);	//	p.ej. "application/x-www-form-urlencoded", "application/json"...
	//	parece ser que el length y connection:close lo gestiona el navegador y no se tiene que poner
	//xhr.setRequestHeader("Content-length", content.length);
	//xhr.setRequestHeader("Connection", "close");
	xhr.send(content);
	return deferred.promise;
}


/*
	Algunos "Serializers" útiles
*/
resman_utils.serialization = {};

/*
	Para la lista de objetos de un asObjList
	Usa la propiedad "constructorId" para averiguar el constructor y ejecutar su fromJSON (deberia tenerlo)
	El constructor se ha registrado previamente mediante initSerializable()
*/
resman_utils.serialization.objList = {
	
	read: function(o) {
		for (var i=0; i<o.length; i++) {
			if ("constructorId" in o[i]) {
				var creator = this._getConstructorById(o[i].constructorId);
				if (typeof creator == "function") {
					var obj = new creator();
					if (obj.fromJSON) obj.fromJSON(o[i]);
					this.add(obj);
				}
			}
		}		
	},
	
	write: function() {
		//	xxx pendiente!
	}
	
}

module.exports = resman_utils;