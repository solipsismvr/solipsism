var THREE = require('three');
var OBJLoader = require('../loader/OBJLoader');

/**
 * Create a new GameWorld binding to a TreeJS scnee
 * Meshes and point lights can be created
 */
function ThreeBinding (scene) {
  var self = this;

  this.scene = scene;

  // Generator callbacks for different shapes and materials
  this.objectTypes = {}
  this.materials = {};
  this.geometries = {};
  this.lights = {};

  this.objectTypes.light = function (properties) {
    var light = properties.light || 'point';
    delete properties.light;
    return self.lights[light](properties);
  };

  this.lights.point = function (properties) {
    return new THREE.PointLight(properties.color, properties.intensity, properties.distance, properties.decay);
  };
  this.lights.spotlight = function (properties) {
    var light = new THREE.SpotLight(properties.color);

    // To do: pass these parameters from properties
    light.castShadow = true;
    light.angle = Math.PI/10;
    light.penumbra = 1;

    self.scene.add(light.target);

    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    light.shadow.camera.near = 1;
    light.shadow.camera.far = 100;
    light.shadow.camera.fov = 10;

    return light;
  };
  this.lights.directional = function (properties) {
    return new THREE.MeshPhongMaterial(properties);
  };
  this.lights.ambient = function (properties) {
    return new THREE.AmbientLight(properties.color);
  };


  this.objectTypes.viveController = function (properties) {
    var mesh = new THREE.Object3D();
    addDefaultControllerMesh(mesh);
    return mesh;
  };



  this.materials.lambert = function (properties) {
    return new THREE.MeshLambertMaterial(properties);
  };
  this.materials.basic = function (properties) {
    return new THREE.MeshBasicMaterial(properties);
  };
  this.materials.phong = function (properties) {
    return new THREE.MeshPhongMaterial(properties);
  };
  this.materials.standard = function (properties) {
    return new THREE.MeshStandardMaterial(properties);
  };

  this.geometries.box = function (properties) {
    return new THREE.BoxGeometry(properties.size[0], properties.size[1], properties.size[2]);
  };
  this.geometries.sphere = function (properties) {
    return new THREE.SphereGeometry(properties.radius, properties.widthSegments, properties.heightSegments);
  };
}

/**
 * Bind this scene to the given gameWorld
 * Called by GameWorld.addBinding(). Don't call directly
 */
ThreeBinding.prototype.bindTo = function (gameWorld) {
  gameWorld.scene = this.scene;
}

/**
 * Add a ThreeJS mesh to the bound gameworld, based on the properties payload
 * Links the mesh to the given gameObject
 */
ThreeBinding.prototype.addToGameObject = function (gameObject, properties) {
  var mesh;

  if (properties.type) {
      var propertiesWithoutType = Object.assign({}, properties);
      delete propertiesWithoutType.type;
      mesh = this.objectTypes[properties.type](propertiesWithoutType);

  } else {
    mesh = new THREE.Mesh();
    mesh.receiveShadow = true;
    mesh.castShadow = true;
  }

  mesh.gameObject = gameObject;
  gameObject.mesh = mesh;

  this.updateGameObject(gameObject, properties);

  this.scene.add(mesh);
}

/**
 * Processes the updates of a given game object
 * @param properties the altered properties
 */
ThreeBinding.prototype.updateGameObject = function (gameObject, properties) {
  if(properties.position) {
    //console.log('Updating position', properties.position[0], properties.position[1], properties.position[2]);
    gameObject.mesh.position.set(properties.position[0], properties.position[1], properties.position[2]);
  }

  if(properties.quaternion) {
    gameObject.mesh.quaternion.set(properties.quaternion[0], properties.quaternion[1], properties.quaternion[2], properties.quaternion[3]);
  }

  if(properties.scale) {
    gameObject.mesh.scale.set(properties.scale, properties.scale, properties.scale);
  }

  if(properties.material) {
    gameObject.mesh.material = this.renderMaterial(properties.material);
  }

  if(properties.geometry) {
    gameObject.mesh.geometry = this.renderGeometry(properties.geometry);
  }
}

/**
 * Turn a geometry payload into a THREE geometry object
 */
ThreeBinding.prototype.renderGeometry = function (properties) {
  var propertiesWithoutType = Object.assign({}, properties);
  delete propertiesWithoutType.type;
  return this.geometries[properties.type](propertiesWithoutType);
}

/**
 * Turn a material payload into a THREE material object
 */
ThreeBinding.prototype.renderMaterial = function (properties) {
  var propertiesWithoutType = Object.assign({}, properties);
  delete propertiesWithoutType.type;
  return this.materials[properties.type](propertiesWithoutType);
}

/**
 * Processes the removal of a given game object
 * @param properties the altered properties
 */
ThreeBinding.prototype.removeGameObject = function (gameObject) {
  this.scene.remove(gameObject.mesh);
}


/**
 * Assign the default mesh - a representation of the vive controller - to a parent object
 */
function addDefaultControllerMesh(controller) {
  // Add a model of a vive contorller
  var vivePath = 'models/';
  var loader = new OBJLoader();
  var self = this;
  loader.load(vivePath + '/vr_controller_vive_1_5.obj', function (object) {
    var loader = new THREE.TextureLoader();

    var mesh = object.children[0];
    mesh.material.map = loader.load( vivePath + 'onepointfive_texture.png' );
    mesh.material.specularMap = loader.load( vivePath + 'onepointfive_spec.png' );

    controller.add(object.clone());
  });
}

module.exports = ThreeBinding;
