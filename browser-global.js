/*
	usado solo para hacer un bundle de la libreria con browserify,
	asignando a una variable global.
	
	TODO: no lo dejaré asi... de momento estas "cosas raras" son por arrastrar
	el diseño anterior de la libreria, antes de modularizarla. Esto sería como
	un resman "full"...
*/
window.resman = require("./src/resman");

window.resman.utils = require("./src/resman-utils");

window.resman.asSerializable = require("./src/resman-serializable").asSerializable;


(function() {
	var resman_storage = require("./src/resman-storage");
	window.resman.Storage = resman_storage.Storage;
	window.resman.BrowserLocalStorage = resman_storage.BrowserLocalStorage;
	window.resman.BrowserRemoteStorage = resman_storage.BrowserRemoteStorage;
	window.resman.PhaserLoaderStorage = resman_storage.PhaserLoaderStorage;
})();
