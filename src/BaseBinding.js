var ee = require('event-emitter');

function BaseBinding (identifier) {
  this.identifier = identifier;

  ee(this);

  this.objectTypeHandlers = {}
  this.propertyHandlers = {};
  this.propertyRenderers = {};
}

BaseBinding.prototype.bindTo = function () {

}

/**
 * Add an object type handler
 * If type is 'default' this will be used when no type is specified
 */
BaseBinding.prototype.addObjectType = function (name, handler) {
  this.objectTypeHandlers[name] = function (properties, callback) {
    var mesh = (handler.bind(this))(properties);
    callback(mesh);
  }
}

BaseBinding.prototype.addObjectTypeLoader = function (name, handler) {
  this.objectTypeHandlers[name] = handler;
}

/**
 * Add a handler for a property
 */
BaseBinding.prototype.addPropertyHandler = function (name, handler) {
  this.propertyHandlers[name] = handler;
}

/**
 * Add a property rendered
 */
BaseBinding.prototype.addPropertyRenderer = function (name, handler) {
  var self = this;
  self.propertyRenderers[name] = {}

  this.propertyHandlers[name] = function (mesh, properties) {
    var propertiesWithoutType = Object.assign({}, properties);
    delete propertiesWithoutType.type;

    return handler(mesh, self.propertyRenderers[properties.type](propertiesWithoutType));
  };

  // Create add<PropertyName>() to load in new renderers
  var adderFunction = 'add' + name[0].toUpperCase() + name.substring(1);
  this[adderFunction] = function(name, handler) {
    self.propertyRenderers[name] = handler;
  };
}

/**
 * Add a ThreeJS mesh to the bound gameworld, based on the properties payload
 * Links the mesh to the given gameObject
 */
BaseBinding.prototype.addToGameObject = function (gameObject, properties) {
  var mesh;

  var type = properties.type || 'default';
  var propertiesWithoutType = Object.assign({}, properties);
  delete propertiesWithoutType.type;
  if (!this.objectTypeHandlers[type]) {
    throw new Error('Bad GameObject type: ' + type);
  }

  if (!gameObject.linkedObjects) {
    gameObject.linkedObjects = {};
  }

  var self = this;

  // Call the handler passing a callback method to complete the rest
  (this.objectTypeHandlers[type].bind(this))(propertiesWithoutType, function (mesh) {
    mesh.gameObject = gameObject;
    gameObject.linkedObjects[self.identifier] = mesh;

    self.updateGameObject(gameObject, properties);

    self.emit('addLinkedObject', mesh);

    gameObject.emit('linkToBinding:' + self.identifier, mesh);
  });
}

/**
 * Processes the updates of a given game object
 * @param properties the altered properties
 */
BaseBinding.prototype.updateGameObject = function (gameObject, properties) {
  var mesh = gameObject.linkedObjects[this.identifier];

  var handler;
  for(name in this.propertyHandlers) {
    handler = this.propertyHandlers[name];
    if (properties[name]) {
      (handler.bind(this))(mesh, properties[name]);
    }
  }
}

/**
 * Processes the removal of a given game object
 * @param properties the altered properties
 */
BaseBinding.prototype.removeGameObject = function (gameObject) {
  this.emit('removeLinkedObject', gameObject.linkedObjects[this.identifier]);
}

BaseBinding.prototype.bindTo = function (gameWorld) {
  this.emit('bind', gameWorld);
}


module.exports = BaseBinding;
