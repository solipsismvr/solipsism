var GameObject = require('./GameObject');
var ee = require('event-emitter');

/**
 * Manage a scene as both a Three.JS and Cannon.JS worlds.
 * Synchronise between a worker and/or other server.
 */
function GameWorld(identifier) {
  // A name for the world, used in debug message
  this.identifier = identifier + '-' + this.getNextId();

  // Identifier chain is used to identify all the game worlds in a chain of proxies
  this.identifierChain = [this.identifier];

  // Null object for the scene and world. They need to be populated by appropriate bindings
  this.scene = {};
  this.world = {};
  this.emitter = ee({});
  this.bindings = [];
  this.objects = {};
  this.changeQueue = {};
}

/**
 * Add a binding to this GameWorld.
 * A binding will give the GameWorld form, e.g. a ThreeJS or CannonJS binding.
 */
GameWorld.prototype.addBinding = function (binding, identifier) {
  if(identifier) {
    binding.identifier = identifier;
  }
  binding.bindTo(this);
  this.bindings.push(binding);
}

/**
 * Add an object.
 * Allow keys of properties:
 *  - geometry: geometry payload
 *  - material: material payload
 *  - mass: float, passed to CannonJS
 *  - position: a 3-element array [x, y, z]
 * @param id The UID of the object
 */
GameWorld.prototype.add = function(properties, id, owner, options) {
  if(id && this.objects[id]) {
    console.log(this.identifier, 'ignoring repeat add of object', id);
    return;
  }

  var object = new GameObject(this, properties, id, owner);

  this.bindings.forEach(function (binding) {
    binding.addToGameObject(object, properties);
  });

  this.objects[object.id] = object;

  if(this.changeRecordFilter(object)) {
    //console.log('Adding object', object.id, 'to world', this.identifier);

    var emitWorldChange = (options && options.emitWorldChange) ? options.emitWorldChange : this.emitWorldChange.bind(this);
    emitWorldChange({ type: 'add', id: object.id, owner: object.owner, properties: properties });

  } else {
    //console.log('Syncing object', object.id, 'to world', this.identifier);
  }

  return object;
};

/**
 * Update the game object - trigger bindings
 *
 * @param gameObject The object being updated
 * @param properties The properties being modified
 * @param updateHints a map of options:
 *  skipBindings: an array of binding identifiers to skip
 */
GameWorld.prototype.updateGameObject = function (gameObject, properties, updateHints) {
  updateHints = Object.assign({}, updateHints);
  this.bindings.forEach(function (binding) {
    if(!updateHints.skipBindings || updateHints.skipBindings.indexOf(binding.identifier) === -1) {
      binding.updateGameObject(gameObject, properties);
    }
  });
}


/**
 * Remove the game object - trigger bindings
 *
 * @param gameObject The object being updated
 * @param properties The properties being modified
 * @param updateHints a map of options:
 *  skipBindings: an array of binding identifiers to skip
 */
GameWorld.prototype.removeGameObject = function (gameObject) {
  this.bindings.forEach(function (binding) {
    binding.removeGameObject(gameObject);
  });

  delete this.objects[gameObject.id];
}

GameWorld.prototype.sendBatchedWorldChanges = function (worldChanges) {
  filteredChanges = worldChanges.filter(function (item) { return item; });
  if(filteredChanges.length) {
    this.emitter.emit('worldChange', worldChanges);
  }
}

/**
 * Bind to an event
 * The following events will work
 *  - 'worldChange': Return an array of change items.
 */
GameWorld.prototype.on = function(event, callback) {
  this.emitter.on(event, callback);
}

/**
 * Unbind an event
 * The following events will work
 *  - 'worldChange': Return an array of change items.
 */
GameWorld.prototype.off = function(event, callback) {
  this.emitter.off(event, callback);
}

/**
 * Return the next ID to use on a game object
 */
GameWorld.prototype.getNextId = function() {
  function makeid (length) {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for( var i=0; i < length; i++ )
          text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
  }

  return makeid(8) + '-' + makeid(8);
}

/**
 * Return game objects matching the given filter based on their properites
 */
GameWorld.prototype.filterObjects = function(callback) {
  var result = [];
  var i;
  for(i in this.objects) {
    if(this.objects[i].batchCreate && callback(this.objects[i].properties)) {
      result.push(this.objects[i]);
    }
  }
  return result;
}

/**
 * Return true if the an object with the given identifier exists
 */
GameWorld.prototype.hasObject = function(identifier) {
  return !!this.objects[identifier];
}

/**
 * Provide a new change record filter.
 * This controls which changes will be included in worldChange events
 * By default only objects owned by the attached game-world will be sent.
 * For servers and routers, more sophisiticated settings wil be needed
 */
GameWorld.prototype.setChangeRecordFilter = function (changeRecordFilter) {
  this.changeRecordFilter = changeRecordFilter;
}

/**
 * The default changeRecordFilter
 */
GameWorld.prototype.changeRecordFilter = function (record) {
  return record.owner && (record.owner === this.identifier);
}

/**
 * Return metadata about this GameWorld
 * Currently just identifier
 */
GameWorld.prototype.getMetadata = function () {
  return {
    identifier: this.identifier,
    identifierChain: this.identifierChain,
  };
}

/**
 * Queue an update event, to be executed via flushQueue()
 */
GameWorld.prototype.queueUpdate = function (identifier, properties, options) {
  if(!this.changeQueue[identifier]) {
    this.changeQueue[identifier] = { properties: {}, options: {} };
  }

  Object.assign(this.changeQueue[identifier].options, options);
  Object.assign(this.changeQueue[identifier].properties, properties);
}

/**
 * Queue an add event, to be executed via flushQueue()
 */
GameWorld.prototype.queueAdd = function (identifier, properties, owner) {
  if(!identifier) identifier = this.getNextId();

  if(!this.changeQueue[identifier]) {
    this.changeQueue[identifier] = { properties: {}, options: {} };
  }

  this.changeQueue[identifier].add = true;
  this.changeQueue[identifier].owner = owner;
  Object.assign(this.changeQueue[identifier].properties, properties);
}

/**
 * Restart the sending of change events, flushing the queue in a single worldChange
 */
GameWorld.prototype.flushQueue = function () {
  var identifier;
  var change;

  var worldChanges = [];
  function emitWorldChange(change) {
    worldChanges.push(change);
  }

  changeCount = 0 ;

  // Apply the changes
  for(identifier in this.changeQueue) {
    changeCount++;
    change = this.changeQueue[identifier];
    Object.assign(change.options, { emitWorldChange: emitWorldChange });

    if(this.objects[identifier]) {
      this.objects[identifier].update(
        change.properties,
        change.options
      );
    } else if(change.add) {
      this.add(
        change.properties,
        identifier,
        change.owner,
        change.options
      );
    } else {
      throw new Error("Could not update " + identifier + " as it did not exist");
    }
  }

  // Send 1 worldChange event
  if (worldChanges.length > 0) {
    this.emitter.emit('worldChange', worldChanges);
  }

  // Clear the queue
  this.changeQueue = {};
}

/**
 * Default emitter of world changes
 */
GameWorld.prototype.emitWorldChange = function (change) {
  this.emitter.emit('worldChange', [change]);
}



module.exports = GameWorld;
