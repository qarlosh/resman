/*
ResourceManager:
Se encarga de gestionar los recursos, como texturas, fuentes, y archivos de datos.
Por ejemplo:
- Función que devuelva la lista de recursos: Así puede ser una función que lea
  la lista de disco, la obtenga por ajax, o devuelva una lista estática para algo más simple
- Concepto de "grupos" de recursos: Para agrupar recursos de forma lógica según el juego:
  interfaz, mivel 1, menu, etc... y asi cargarlos/descargarlos cuando haga falta.
  Una posibilidad es usando paths: cada ruta única es un grupo, asi se permite agrupar grupos...
- Carga de recursos. Integrado con Phaser
- Ha de permitir la carga asíncrona
- Serialización: Además de leer, que pueda escribir, para por ejemplo el editor.
  y que automáticamente detecte si se puede... por ejemplo en NWJS y Cordova se puede,
  aunque cada uno con sus propios métodos, en web "local" no se puede, en web "online"
  se podría pero por ajax, etc...
  
Los recursos se identifican con un nombre, un path y un tipo. Se podría usar la
misma sintaxis que un fichero: /path/to/resource/name.type
Por lo tanto, un resourceid es la ruta completa: path/name.type

El path SIEMPRE ha de empezar por /, es como si no admitiera rutas relativas.
Un solo / es la raiz.

El name no puede tener los caracteres / ni .

El type no puede tener el caracter /, aunque puede tener el .
*/

/* XXX Muevo arriba de todo la asignación a module.exports para resolver el
	problema causado por la referencia al requerir resman-storage, ya que a su
	vez requiere resman.
	ver: https://nodejs.org/api/modules.html#modules_cycles
*/
var resman = {};
module.exports = resman;
///////////////////////////////////

var resman_storage = require("./resman-storage");

//var resman = {};

//	No sé si usar directamente tipos de archivo, o algo más abstracto, como por
//	ejemplo "image", etc... o un sistema que permita las dos formas?
/*
resman.ResourceType = {
	ALL: '*',
	PNG: 'PNG',
	IMAGE: 'IMAGE'

}
*/


/*
ResourceManager
*/

resman.ResourceManager = function(config) {
	/*
	Inicializa un ResourceManager. el argumento opcional config puede tener:
	
		config.onGetResourceList	callback que se llamará para obtener la lista
									de recursos.
		config.staticResourceList	lista estática de recursos, usado por defaultGetResourceList
		config.defaultStorageName	Nombre del Storage que usarán por defecto los ResourceTypes si no
									tienen uno concreto
	*/
	config = config || {};
	this.onGetResourceList =	config.onGetResourceList || this.defaultGetResourceList;
	this.staticResourceList =	config.staticResourceList || [];
	this.defaultStorageName =	config.defaultStorageName;
	
	this.resourceTypes = {};
	
	//	Crear Storages por defecto
	this.storages = {};
	this.addStorage("BrowserLocal",		resman_storage.BrowserLocalStorage);
	this.addStorage("BrowserRemote",	resman_storage.BrowserRemoteStorage);
}

resman.ResourceManager.prototype.addStorage = function(name, storageClass) {
	/*
		Añade otro Storage adicional a los que ya se crean por defecto
	*/
	this.storages[name] = new storageClass(this);
}

resman.ResourceManager.prototype.newResourceType = function(restypeConfig) {
	/*
	Crear y registrar un nuevo ResourceType
	*/
	var restype = new resman.ResourceType(this, restypeConfig);
	for (var i=0; i<restype.types.length; i++) {
		this.resourceTypes[restype.types[i]] = restype;
	}
}


resman.ResourceManager.prototype.defaultGetResourceList = function(path, type) {
	/*
	Implementación por defecto.
	Por defecto usa una lista estática (staticResourceList) que se puede
	inicializar en el config.
	
	nota: lo ideal sería que una vez parsea cada recurso, que cree una estructura
	de objects que represente el path, para que sea más eficiente recorrerla
	*/
	// xxx esto parece que está a medias...
	for (var i=0; i < this.staticResourceList.length; i++) {
		var res = resman.ResourceManager.parseResourceId(this.staticResourceList[i]);
		res
	}
}

resman.ResourceManager.prototype.getResourceList = function(path, type) {
	/*
	Devuelve la lista de recursos en un path. Opcionalmente se puede filtrar por un tipo.
	Lo que devuelve es un array de resourceids
	*/
	///type = type || "*";
	return this.onGetResourceList(path, type);
}


resman.ResourceManager.prototype.loadResource = function(resourceid) {
	/*
	Carga un recurso en memoria, delegándolo al resourcetype
	*/
	var res = resman.ResourceManager.parseResourceId(resourceid);
	var restype = this.resourceTypes[res.type];
	if (!restype) throw "UnknownResourceType";
	return restype.loadResource(resourceid);	
}

resman.ResourceManager.prototype.loadResources = function(path, type) {
	/*
	Carga todos los recursos de un path. Puede filtrar por un tipo.
	*/
	var resourceList = this.getResourceList(path, type);
	for (var i=0; i < resourceList.length; i++) {
		this.loadResource(resourceList[i]);
	}
}

resman.ResourceManager.prototype.saveResource = function(resourceid, obj) {
	/*
	Guarda un recurso que está cargado en memoria y se ha modificado,
	delegándolo al resourcetype.
	*/
	var res = resman.ResourceManager.parseResourceId(resourceid);
	var restype = this.resourceTypes[res.type];
	if (!restype) throw "UnknownResourceType";
	return restype.saveResource(resourceid, obj);	
}

resman.ResourceManager.prototype.saveResources = function(path, type) {
	/*
	Guarda todos los recursos de un path. Puede filtrar por un tipo.
	*/
	var resourceList = this.getResourceList(path, type);
	for (var i=0; i < resourceList.length; i++) {
		this.saveResource(resourceList[i]);
	}
}


resman.ResourceManager.prototype.canSaveResources = function() {
	/*
	Devuelve si es posible guardar recursos o no.
	xxx	esto tiene más sentido en el ResourceType, no aqui
	*/
	return (this.onSaveResource != null);
}

resman.ResourceManager.prototype.get = function(resourceid) {
	/*
	Devuelve el recurso si está cargado
	*/
	//	xxx a medias... cuando se cargan resources se deberían guardar en una lista, por ejemplo
	//	los Room, RoomMap, etc... y que cada tipo de resource tenga su lista... o mejor un objeto global
	//	key/value por resourceid... no se
	var res = resman.ResourceManager.parseResourceId(resourceid);
	var restype = this.resourceTypes[res.type];
	if (!restype) throw "UnknownResourceType";
	
	return null;
}


resman.ResourceManager.parseResourceId = function(resourceid) {
	/*
	[static]
	Devuelve un object con tres miembros: path, name y type
	
	NOTA: Permite recibir un resource ya "parseado", y lo devuelve directamente.
	Puede ser útil para encadenar llamadas.
	*/
	if (typeof resourceid == "object"/* && 'path' in resourceid && 'name' in resourceid && 'type' in resourceid*/) {
		return resourceid;
	}

	var parts = resourceid.split("/");
	//	parts[0]					siempre es ""
	//	parts[1..parts.length-2]	es el path. Cada elemento sería un grupo.
	//								Puede no haber path, es decir, un recurso en la raiz
	//	parts[parts.length-1]		es name.type
	var name_and_type = parts[parts.length-1].split(".");
	return {
		path: parts.slice(0, -1).join("/") || "/",
		name: name_and_type[0],
		type: name_and_type.slice(1).join(".")
	};
}


/*
ResourceType
*/

resman.ResourceType = function(resourceManager, config) {
	/*
	Crear un nuevo tipo de recurso.
	
		config.type				El type, por ejemplo "phaser.image.png"
		config.types			también se puede indicar un array de types. Todos
								usarán este ResourceType, que tendrá que gestionar
								si hace algo distinto con cada uno o si son exactamente lo mismo
		config.onLoadResource	Función a ejecutar cuando se tenga que cargar
								el recurso. Debe devolver un Q Promise
		config.onSaveResource	Función a ejecutar cuando se tenga que guardar
								el recurso. Debe devolver un Q Promise
		config.storageName		El nombre del Storage a utilizar con este ResourceType
		config.resourceClass	Una clase a utilizar para la creación de instancias del recurso
		(otras...)
	*/
	this.resourceManager = resourceManager;
	
	for (var key in config) {
		this[key] = config[key];
	}
	
	if (config.type && config.types) {
		throw "Only config.type o config.types, not both"
	}
	delete this.type;
	this.types = config.type ? [config.type] : config.types;
	//this.onLoadResource = config.onLoadResource;
	//this.onSaveResource = config.onSaveResource;
}

resman.ResourceType.prototype.getStorage = function() {
	/*
		Devuelve el storage a usar
	*/
	var storage = this.resourceManager.storages[this.storageName];
	if (!storage) storage = this.resourceManager.storages[this.resourceManager.defaultstorageName];
	if (!storage) throw "No Storage specified"
	return storage;
}

resman.ResourceType.prototype.defaultLoadResource = function(resourceid) {
	/*
		Por defecto utiliza el Storage configurado, y si se ha indicado un resourceClass
		instancia un recurso y lo trata como un asSerializable
	*/
	var resourcetype = this;
	return this.getStorage().retrieve(resourceid).then(function(data) {
		//var instance = new resourcetype.resourceClass(data);
		if (resourcetype.resourceClass) {
			var instance = new resourcetype.resourceClass();
			return instance.fromJSON(data);
		} else {
			return data;
		}
	});
}

resman.ResourceType.prototype.defaultSaveResource = function(resourceid, obj) {
	/*
		Por defecto utiliza el Storage configurado, tratando al recurso como un asSerializable
	*/
	if (!obj.toJSON) throw "El objeto no es asSerializable";
	return this.getStorage().store(resourceid, obj.toJSON());
}

resman.ResourceType.prototype.loadResource = function(resourceid) {
	/*
		Devuelve promise Q
	*/
	return (this.onLoadResource ? this.onLoadResource : this.defaultLoadResource).call(this, resourceid);
}

resman.ResourceType.prototype.saveResource = function(resourceid, obj) {
	/*
		Devuelve promise Q
	*/
	return (this.onSaveResource ? this.onSaveResource : this.defaultSaveResource).call(this, resourceid, obj);
}

//module.exports = resman;