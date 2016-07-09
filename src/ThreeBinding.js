var BaseBinding = require('./BaseBinding');
var util = require('util');

/**
 * Create a new GameWorld binding to a Three.JS scene.
 *
 * Objects will be created in the given scene, but no camera.
 * Add the camera and renderer to the scene yourself.
 *
 * @param THREE The THREE.JS global. Pull this dependency in from your parent project.
 * @param scene The THEE.Scene object to bind to. Three.Object3Ds will be created in this.
 */
function ThreeBinding (THREE, scene) {
  // BaseBinding is a handy base class to use for your bindings.
  BaseBinding.call(this, 'ThreeBinding');

  // Start by defining the default object type. This will be used when the type property
  // isn't specificed. Here, we create a THREE.Mesh. Geometry and material will be applied with
  // a property handler

  this.addObjectType('default', function (properties) {
    mesh = new THREE.Mesh();
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    return mesh;
  });

  // Define properties with addPropertyHandler(). The callback will be passed
  // Your linked object and the value of the property.

  this.addPropertyHandler('position', function (mesh, position) {
    mesh.position.set(position[0], position[1], position[2]);
  });

  this.addPropertyHandler('quaternion', function (mesh, quaternion) {
    mesh.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
  });

  this.addPropertyHandler('scale', function (mesh, scale) {
    mesh.scale.set(scale, scale, scale);
  });

  // Propoerty renderers let us handle sub-sections of the property payload
  // In this example, geometry should set to a JSON object with a 'type' property

  this.addPropertyRenderer('geometry', function (mesh, renderedGeometry) {
    mesh.geometry = renderedGeometry;
  });

  // The add<PropName> method will be created when you call addPropertyRenderer()
  // In this first call, we will allow handling of geometry: { type: 'box', size: [x,y,z] }

  this.addGeometry('box', function (properties) {
    return new THREE.BoxGeometry(properties.size[0], properties.size[1], properties.size[2]);
  })

  this.addGeometry('sphere', function (properties) {
    return new THREE.SphereGeometry(properties.radius, properties.widthSegments, properties.heightSegments);
  })

  // We handle materials in the same way

  this.addPropertyRenderer('material', function (mesh, renderedMaterial) {
    mesh.material = renderedMaterial;
  });

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

  // Lights are implemented as other object types.

  this.addObjectType('pointlight', function (properties) {
    return new THREE.PointLight(properties.color, properties.intensity, properties.distance, properties.decay);
  });

  this.addObjectType('ambientlight', function (properties) {
    return new THREE.AmbientLight(properties.color);
  });

  this.addObjectType('spotlight', function (properties) {
    var light = new THREE.SpotLight(properties.color);

    // To do: pass these parameters from properties
    light.castShadow = true;
    light.angle = Math.PI/10;
    light.penumbra = 1;

    scene.add(light.target);

    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    light.shadow.camera.near = 1;
    light.shadow.camera.far = 100;
    light.shadow.camera.fov = 10;

    return light;
  });

  // Handle attachment of this binding to a gameworld

  this.on('bind', function (gameWorld) {
    gameWorld.scene = scene;
  });

  // Handle adding/removing of linked objects to/from the scene

  this.on('addLinkedObject', function (mesh) {
    scene.add(mesh);
  });

  this.on('removeLinkedObject', function (mesh) {
    scene.remove(mesh);
  });
}

util.inherits(ThreeBinding, BaseBinding);

module.exports = ThreeBinding;
