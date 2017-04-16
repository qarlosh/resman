/*
De momento serializa en formato JSON.

Si vale la pena tener otros formatos ya se miraría de haver con classes descendientes, etc...

IMPORTANTE: Llamar a initSerializable() después de hacer asSerializable un prototype!
*/

if (!window.resman) resman = {};

resman.asSerializable = function() {
	/*
		Lee y escribe la información necesaria del objeto en formato JSON,
		para serializarlo.
		
		Requiere estas propiedades:		
			serializeKeys			Lista de propiedades a serializar (puede ser del prototype, no tiene
									porqué ser de la instancia)
			customSerialization		Propiedades a las que se aplican callbacks personalizados para leeras
									y escribirlas. Debe ser un object donde cada key es el nombre de la propiedad,
									y el value ha de ser otro object con dos propiedades, "read" y "write",
									con los callbacks a usar en cada operación. En resman.utils.serialization hay
									algunos predeterminados.
		
		Se requiere llamar a initSerializable()
	*/

	this.initSerializable = function(id) {
		/*
			(Usar sólo si se está aplicando el mixin al prototype de un constructor, que es lo habitual,
			llamándola desde el prototype, no desde una instancia)
			
			Esto registra el constructor (la clase) con un nombre único (id), para luego poder
			identificar el tipo de objeto a crear en fromJSON().
			
			xxx: se podría hacer que el nombre (id) sea automatico? tiene que ser el mismo
			cada vez que se ejecuta, una función determinista, y único... podría ser un hash del código del constructor? con MD5?
		*/
		
		//	si no se indica id, se usa un hash del cuerpo de la función
		//	NOTA: Creo que esto no es muy recomendable, porque si se modifica un constructor
		//		  dejará de ser compatible con objetos serializados...
		if (!id) {
			var shaObj = new jsSHA("SHA-256", "TEXT");
			shaObj.update(this.constructor.toString());
			id = shaObj.getHash("HEX");
		}

		if (!resman.asSerializable._constructors)
			resman.asSerializable._constructors = {};
		resman.asSerializable._constructors[id] = this.constructor;
	}
	
	this._getConstructorById = function(id) {
		/*
			Devuelve un constructor registrado por su id, o undefined
		*/
		if (resman.asSerializable._constructors)
			return resman.asSerializable._constructors[id];
		return undefined;
	}

	this._getIdByConstructor = function(creator) {
		/*
			Devuelve el id de un constructor registrado, o undefined
		*/
		if (resman.asSerializable._constructors) {
			for (var id in resman.asSerializable._constructors)
				if (resman.asSerializable._constructors[id] == creator) return id;
		}
		return undefined;
	}
	
	
	this.fromJSON = function(data) {
		/*
			Carga las propiedades del objeto desde un JSON
		*/
		if (typeof data == 'string') data = JSON.parse(data);

		//	Asignar las propiedades indicadas en serializeKeys.
		for (var i=0; i<this.serializeKeys.length; i++) {
			var key = this.serializeKeys[i];
			if (key in data) {
				if (this.customSerialization && key in this.customSerialization) {
					//	serialización personalizada
					this.customSerialization[key].read.call(this, data[key]);
				} else {
					//	serialización normal... tal cual
					this[key] = data[key];
				}
			}
		}
		
		return this; // chaining
	}
	
	this.toJSON = function(dontStringify) {
		/*
			(Probada, funciona ok)

			Retorna las propiedades del objeto en formato JSON
			
				dontStringify		Indica que no se llamará a JSON.stringify.
									En principio se usa para las llamadas recursivas,
									por defecto es false,y por lo tanto, se llama a stringify.
		*/
		var data = {};
		var constructorId = this._getIdByConstructor(this.constructor);
		if (constructorId) {
			data.constructorId = constructorId;
		}

		for (var i=0; i<this.serializeKeys.length; i++) {
			if (this.serializeKeys[i] in this) {
				data[this.serializeKeys[i]] = this[this.serializeKeys[i]];
			}
		}
		
		//	xxx pasar también aqui esto al customSerialization write! igual que se ha hecho ya en fromJSON
		if (this.objs) {
			data.objs = [];
			for (var i=0; i<this.objs.length; i++) {
				if (this.objs[i].toJSON) {	//	test para ver si es asSerializable
					data.objs.push( this.objs[i].toJSON(true) );
				}
			}
		}

		return dontStringify ? data : JSON.stringify(data);
	}

}