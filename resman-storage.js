if (!window.resman) resman = {};

/*
Storage

Es una clase base que indica cómo se almacena y obtiene un recurso. P. ej.
guardar/cargar archivo, enviar a/descargar de webserver, insert/select de bbdd, etc...
*/

resman.Storage = function(resourceManager, config) {
	this.resourceManager = resourceManager;
	this.requiredResourceTypeAttrs = config && config.requiredResourceTypeAttrs || [];
}

resman.Storage.prototype._checkRequiredResourceTypeAttrs = function(resourceType) {
	/*
	comprobar que el ResourceType contenga los attrs requeridos
	*/
	for (var i=0; i < this.requiredResourceTypeAttrs.length; i++) {
		if (!(this.requiredResourceTypeAttrs[i] in resourceType)) {
			throw "ResourceType has not required attribute " + this.requiredResourceTypeAttrs[i];
		}
	}
}

resman.Storage.prototype.retrieve = function(res) {
	/*
		Devuelve promise Q
	*/
	res = resman.ResourceManager.parseResourceId(res);
	var resourceType = this.resourceManager.resourceTypes[res.type];
	if (!resourceType) throw "UnknownResourceType";
	this._checkRequiredResourceTypeAttrs(resourceType);
	return this.doRetrieve(res, resourceType);
}

resman.Storage.prototype.store = function(res, data) {
	/*
		Devuelve promise Q
	*/
	res = resman.ResourceManager.parseResourceId(res);
	var resourceType = this.resourceManager.resourceTypes[res.type];
	if (!resourceType) throw "UnknownResourceType";
	this._checkRequiredResourceTypeAttrs(resourceType);
	return this.doStore(res, resourceType, data);
}

resman.Storage.prototype.doRetrieve = function(res, resourceType) {
	//	Reimplementar en descendientes. Éste no hace nada.
	throw "doRetrieve() not implemented"
}

resman.Storage.prototype.doStore = function(res, resourceType, data) {
	//	Reimplementar en descendientes. Éste no hace nada.
	throw "doStore() not implemented"
}


/*
BrowserLocalStorage

Carga por ajax un archivo local, y al guardar descarga el archivo.
*/

resman.BrowserLocalStorage = function(resourceManager, config) {
	resman.Storage.call(this, resourceManager, config);	// INHERITED
	this.requiredResourceTypeAttrs = ['fileExtension'];
}

//	HERENCIA (parece correcto hacerlo así, ver https://community.risingstack.com/javascript-prototype-chain-inheritance/)
resman.BrowserLocalStorage.prototype = Object.create(resman.Storage.prototype);
resman.BrowserLocalStorage.prototype.constructor = resman.BrowserLocalStorage;

resman.BrowserLocalStorage.prototype.doRetrieve = function(res, resourceType) {
	//	xxx	la carpeta base "res" debería ser configurable...
	return resman.utils.ajax("res" + res.path + "/" + res.name + "." + resourceType.fileExtension);
}

resman.BrowserLocalStorage.prototype.doStore = function(res, resourceType, data) {
	//	Al usar el navegador abriendo el index.html directamente (FILE:///),
	//	se usa FileSaver.js (html5), que permite generar archivos en cliente y descargarlos
	var blob = new Blob([data], {type: "application/" + resourceType.fileExtension});
	saveAs(blob, res.name + "." + resourceType.fileExtension);
	//	devolver promise ya resuelta, porque esto no es async
	return Q(); // es una forma rápida de devolver una promise resuelta
}


/*
BrowserRemoteStorage

Carga por ajax un archivo remoto, y al guardar lo sube al servidor por ajax.
*/

resman.BrowserRemoteStorage = function(resourceManager, config) {
	resman.Storage.call(this, resourceManager, config);	// INHERITED
	this.requiredResourceTypeAttrs = ['fileExtension'];
}

resman.BrowserRemoteStorage.prototype = Object.create(resman.Storage.prototype);
resman.BrowserRemoteStorage.prototype.constructor = resman.BrowserRemoteStorage;

resman.BrowserRemoteStorage.prototype.doRetrieve = function(res, resourceType) {
	//	xxx	la carpeta base "res" debería ser configurable...
	return resman.utils.ajax("res" + res.path + "/" + res.name + "." + resourceType.fileExtension);
}

resman.BrowserRemoteStorage.prototype.doStore = function(res, resourceType, data) {
	//	xxx	la carpeta base "res" debería ser configurable...
	return resman.utils.ajaxpost("res" + res.path + "/" + res.name + "." + resourceType.fileExtension,
				data,
				"application/" + resourceType.fileExtension);
}


/*
PhaserLoaderStorage

Carga recursos usando Phaser.Loader. No puede guardar.

xxx	lo quitaré de aqui... puede que esté bien que esté en la librería Resman porque
	no sería raro usarla con Phaser, pero al menos que esté en un módulo a parte opcional.

xxx de momento solo usando load.image con pngs... pero debería poder usarse con cualquier recurso soportado por Phaser.Loader
	también sirve con load.script, para los filters
*/

resman.PhaserLoaderStorage = function(resourceManager, config) {
	resman.Storage.call(this, resourceManager, config);	// INHERITED
	//this.requiredResourceTypeAttrs = ['fileExtension'];
	this.requiredResourceTypeAttrs = ['phaserGame', 'fileExtension'];
	this.deferreds = {};
}

resman.PhaserLoaderStorage.prototype = Object.create(resman.Storage.prototype);
resman.PhaserLoaderStorage.prototype.constructor = resman.PhaserLoaderStorage;

resman.PhaserLoaderStorage.prototype.doRetrieve = function(res, resourceType) {
	//	XXX	no funciona del todo bien... parece que aunque se estén cargando varios recursos (varias llamadas a doRetrieve),
	//		el onFileComplete solo se ejecuta una sola vez, y deben quedar deferreds sin resolver
	//	xxx	la carpeta base "res" debería ser configurable...
	var key = res.path + "/" + res.name; // xxx Como nombre casi mejor usar resourceid, no? menos complicaciones...
	this.deferreds[key] = Q.defer();
	resourceType.phaserGame.load.onFileComplete.addOnce(function(progress, key, success, total_loaded_files, total_files) {
		if (this.deferreds[key]) {
			if (success) {
				this.deferreds[key].resolve(key);
			} else {
				this.deferreds[key].reject(key);
			}
		}
	}, this);
	//	decidir el método de load a usar en función de la extensión
	if (resourceType.fileExtension == "png") {
		resourceType.phaserGame.load.image(key, "res" + res.path + "/" + res.name + "." + resourceType.fileExtension);
	} else if (resourceType.fileExtension == "js") {
		resourceType.phaserGame.load.script(key, "res" + res.path + "/" + res.name + "." + resourceType.fileExtension);
	} else {
		throw "Extension not implemented in PhaserLoaderStorage";
	}
	return this.deferreds[key].promise;
}

/*resman.PhaserLoaderStorage.prototype.doStore = function(res, resourceType, data) {
}*/