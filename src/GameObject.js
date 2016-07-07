/**
 * Single shape in a GameWorld
 */
function GameObject(world, properties, id, owner) {
  this.world = world;
  this.properties = properties;
  this.id = id ? id : world.getNextId();
  this.owner = owner ? owner : world.identifier;

  if(!this.owner) {
    throw new Error("GameObject created without owner");
  }
}

/**
 * Make changes to this object, but batch up the notifications to send in 1 message
 */
GameObject.prototype.update = function(properties, options) {
  // Update internal properites
  Object.assign(this.properties, properties);

  // Trigger updates on the various bindings
  this.world.updateGameObject(this, properties, options);

  // Return a change message to emit later
  if (this.world.changeRecordFilter(this)) {
    var emitWorldChange = (options && options.emitWorldChange) ? options.emitWorldChange : this.world.emitWorldChange.bind(this.world);
    emitWorldChange({ type: 'update', id: this.id,  owner: this.owner, properties: properties });
  }
}

/**
 * Return a new creation message for this object, if it is owned
 */
GameObject.prototype.batchCreate = function(properties, options) {
  // Return a change message to emit later
  if(this.world.changeRecordFilter(this)) {
    return { type: 'add', id: this.id,  owner: this.owner, properties: this.properties };
  }
}

/**
 * Return the linked object related to a given binding
 */
GameObject.prototype.getLinkedObject = function (bindingIdentfier) {
  return this.linkedObjects[bindingIdentfier];
}

/**
 * Remove this object from the game world
 */
GameObject.prototype.delete = function(options) {
  //console.log('Removing object', this.id, 'from world', this.world.identifier);

  // Trigger updates on the various bindings
  this.world.removeGameObject(this);

  // Push changes to connected GameWorlds
  if(this.world.changeRecordFilter(this)) {
    var emitWorldChange = (options && options.emitWorldChange) ? options.emitWorldChange : this.world.emitWorldChange.bind(this.world);
    emitWorldChange({ type: 'remove', id: this.id, owner: this.owner });
  }
}

module.exports = GameObject;
