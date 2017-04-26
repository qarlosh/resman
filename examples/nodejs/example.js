//  ejemplo de uso desde nodejs

var resman = require("../../src/resman");

var resourceManager = new resman.ResourceManager();
if (resourceManager) {
	console.log("Se ha instanciado resman.ResourceManager() correctamente!");
} else {
	console.log("Ha ocurrido algún error instanciando resman.ResourceManager()");
}
