var BaseBinding = require('./BaseBinding');

var util = require('util');

/**
 * Create a new GameWorld binding to a TreeJS scnee
 * Meshes and point lights can be created
 */
function ThreeBinding (THREE, scene) {
  BaseBinding.call(this, 'ThreeBinding');

  this.scene = scene;

  var self = this;

  // Define properties

  this.addPropertyHandler('position', function (mesh, position) {
    mesh.position.set(position[0], position[1], position[2]);
  });

  this.addPropertyHandler('quaternion', function (mesh, quaternion) {
    mesh.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
  });

  this.addPropertyHandler('scale', function (mesh, scale) {
    mesh.scale.set(scale, scale, scale);
  });

  this.addPropertyRenderer('material', function (mesh, renderedMaterial) {
    mesh.material = renderedMaterial;
  });

  this.addPropertyRenderer('geometry', function (mesh, renderedGeometry) {
    mesh.geometry = renderedGeometry;
  });

  // Built-in object types
  this.addObjectType('default', function (properties) {
    mesh = new THREE.Mesh();
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    return mesh;
  });

  this.addObjectType('pointlight', function (properties) {
    return new THREE.PointLight(properties.color, properties.intensity, properties.distance, properties.decay);
  });

  this.addObjectType('spotlight', function (properties) {
    var light = new THREE.SpotLight(properties.color);

    // To do: pass these parameters from properties
    light.castShadow = true;
    light.angle = Math.PI/10;
    light.penumbra = 1;

    this.scene.add(light.target);

    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    light.shadow.camera.near = 1;
    light.shadow.camera.far = 100;
    light.shadow.camera.fov = 10;

    return light;
  });

  this.addObjectType('ambientlight', function (properties) {
    return new THREE.AmbientLight(properties.color);
  });

  // Built-in geometries

  this.addGeometry('box', function (properties) {
    return new THREE.BoxGeometry(properties.size[0], properties.size[1], properties.size[2]);
  })

  this.addGeometry('sphere', function (properties) {
    return new THREE.SphereGeometry(properties.radius, properties.widthSegments, properties.heightSegments);
  })

  // Built-in materials

  this.addMaterial('lambert', function (properties) {
    return new THREE.MeshLambertMaterial(properties);
  });

  this.addMaterial('basic', function (properties) {
    return new THREE.MeshBasicMaterial(properties);
  });

  this.addMaterial('phong', function (properties) {
    return new THREE.MeshPhongMaterial(properties);
  });

  this.addMaterial('standard', function (properties) {
    return new THREE.MeshStandardMaterial(properties);
  });

}

util.inherits(ThreeBinding, BaseBinding);

/**
 * Handle adding an object's mesh to the game
 */
ThreeBinding.prototype.onAddObject = function (gameObject, mesh) {
  this.scene.add(mesh);
}

/**
 * Handle removing an object's mesh from the game
 */
ThreeBinding.prototype.onRemoveObject = function (gameObject, mesh) {
  this.scene.remove(mesh);
}

/**
 * Bind this scene to the given gameWorld
 * Called by GameWorld.addBinding(). Don't call directly
 */
ThreeBinding.prototype.bindTo = function (gameWorld) {
  gameWorld.scene = this.scene;
}

module.exports = ThreeBinding;
