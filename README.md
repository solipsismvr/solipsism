Solipsism
=========

[![Build Status](https://travis-ci.org/sminnee/solipsism.svg?branch=master)](https://travis-ci.org/sminnee/solipsism)

Solipsism is a game-world database for bringing real-time multi-user support to your VR metaverse. It has integrations
with Three.js, Cannon.js, and Ammo.js, but it does not put constraints how you model your world: it is designed so that
you can write bindings between the Solipsism GameWorld and any representation you wish.

For example, you could bind to different representations of voxel objects, a limited number of pre-suppored 3D shapes,
or arbitrary meshes for CSG editing.

How it works
------------

Solopsism is built around 4 key concepts:

 * **GameWorld:** The GameWorld contains all the objects that make up your simulation. Each GameWorld has a unique
   identifier.
 * **GameObject:** The content of the GameWorld is made up entirely of GameObjects. Each object has a unique identififer,
   and owner (one of the GameWorlds), and a payload of properties. At this stage, objects can't be nested.
 * **WorldSyncer:** This will keep two GameWorlds in sync. It can do so over a web-socket or between a webworker and the
    main browser thread. Client-server communcation is handled by the WorldSyncer.
 * **Bindings:** Without bindings, your world may be kept in sync, but would be invisible. The bindings are used to connect
   your GameWorld and GameObjects to other systems, such as Three.js and Ammo.js.

Getting started
---------------

### A simple world

To start with, you can run single GameWorld in your browser's main thread. Create a new GameWorld object and call `add()` 
to create projects in it.

```js
var Sol = require('solipsism');

var world = new Sol.GameWorld('Client');

world.add({
  type: 'light',
  light: 'spotlight',
  color: 0xFFFFFF,
  position: [1,10,5],
});

world.add({
  geometry: { type: 'box', size: [ 2, 0.2, 2 ] },
  material: { type: 'lambert', color: 0x007700 },
  mass: 0,
  position: [0, -0.1, 0],
});

world.add({
  geometry: { type: 'sphere', radius: 0.5, widthSegments: 16, heightSegments: 16 },
  material: { type: 'phong',  color: 0xCC0000, shininess: 60 },
  mass: 5,
  position: [0, 1, 0],
}));
```

We can see that the representation of objects is quite simple: we don't have specialised vector objects, etc, we just
use 3-element arrays. GameObject properties are designed to be easily serialised as JSON.

The meaning of the GameObject's properties depends entirely on the bindings you use. However, some of the common
properties are as follows:

 * type: What kind of entitiy are we adding. This is optional and defaults to a body or mesh.
 * geometry: Specifies the shape of a body.
 * material: The visible material of a body.
 * position: A 3-element array (`[x, y, z]`) of the object's position.
 * quaternion: A 4-element array (`[x, y, z, w]`) of a quaternion representing the object's orientation.
 * velocity: A 3-element array of the object's velocity.
 * angularVelocity: A 3-element array of the object's angular velocity.
 * mass: The mass of an object for physics simulations

### Binding to Three.js

Next you will want to see the game world. Solipsism works nicely with Three.js but makes minimal assumptions about how
you will use Three.js. A ThreeBinding object can connect your GameWorld to a THREE.Scene. The GameWorld's objects will
be synchronised into your scene, and from there, the rest is up to you.

```js
var Sol = require('solipsism');
var scene = new THREE.Scene();
var world = new Sol.GameWorld('Client');
world.addBinding(new Sol.ThreeBinding(scene))
```

We assume you are familiar with THREE.js (if not, google for some tutorials), but here's a simple script to add a
camera and a full-window renderer to get you started. In general, you're encouraged to use whatever rendering approach
makes the most sense for your application.

```js
// Add a camera
var camera = new THREE.PerspectiveCamera( 70, 1, 0.01, 100 );
camera.position.z = 3;
camera.position.y = 1;
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
scene.add(camera);

// Add a renderer
var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild(renderer.domElement);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

At this point you should be able to see a red ball hovering above a green box.

### Customising the binding

The default ThreeBinding is not supposed to be an exhaustive system out of the box. It has a few basic objects to get 
you started, but to build your own unique metaverse you will probably want to customise the bindings to suit your world
model.

For example, you can use `addGeometry()` to support a new kind of geometry in the THREE.js binding.

```js
threeBinding.addGeometry('cylinder', function (props) {
  props = Object.assign({ segments: 16 }, props)
  return new THREE.CylinderGeometry(props.radius, props.radius, props.height, props.segments, 1);
})

world.add({
  geometry: { type: 'cylinder', radius: 0.25, height: 0.5 },
  material: { type: 'phong',  color: 0x0000CC, shininess: 60 },
  mass: 5,
  position: [0.5, 1, 0],
}));
```

Similar functions exist for `addMaterial()`, `addLight()` and `addType()`. You may want to use this to add support for
voxels, heightfields, or CSG-generated meshes.

If you wish to use a callback to handle loading, you cna use `addGeometryLoader()`, `addTypeLoader()`, etc. For example,
here is how you might add support for using .obj files to define geometry.

```js
// OBJLoader can be copied from Three.JS examples
threeBinding.addGeometryLoader('obj', function (props, callback) {
  var loader = new OBJLoader();
  loader.load('models/' + props.filename, function (object) {
    callback(object.children[0]);
  }
});

world.add({
  geometry: { type: 'obj', filename: 'vr_controller_vive_1_5.obj' },
  material: { type: 'phong',  color: 0x777777, shininess: 60 },
  mass: 5,
  position: [0.5, 1, 0],
}));
```

Adding physics
--------------

As well as rendering scenes, bindings can also be used to incorporate physics. A separate package, `silverstripe-ammo`,
provdies integration with the Ammo.js physics engine.

To add physics to your scene, first set up the binding:

```
var Sol = require('solipsism');
var AmmoBinding = require('solipsism-ammo');

var world = new Sol.GameWorld('Client');
var physics = new AmmoBinding();
world.add(physics);
```

Then you will need to call the binding's `step()` function at a reasonable framerate:

```
// Run the physics engine at 50 FPS
var lastTime = (new Date()).getTime();
function step() {
  setTimeout(step, 20);

  var thisTime = (new Date()).getTime();
  physics.step(thisTime - lastTime);
  lastTime = thisTime;
}

```

Client-server operation
-----------------------

Running a GameWorld on a single client is of limited usefulness. Solipsism is designed to be used to keep a server
and many clients in sync.

This simple server is a good place to start.

```js
var express = require('express');
var socket = require('socket.io');
var Sol = require('solipsism');

var world = new Sol.GameWorld('Server');

// Create your gameworld
world.add(...);

// Set up a server and websocket on port 3001
var app = express();
var server = require('http').Server(app);
var io = socket(server);
server.listen(3001);

// Set up a game server
var gameServer = new Sol.GameServer(world);
io.on('connection', gameServer.addSocketClient.bind(gameServer));
```

Your client can be updated by replacing the `world.add()` commands with a Socket.io connection.

```js
var Sol = require('solipsism');
var io = require('socket.io');

var world = new Sol.GameWorld('Client');

var socket = io.connect('http://' + window.location.hostname + ':3001');
var sync = new Sol.WorldSyncer(world);
sync.connect(new WorldSyncer.Socket(socket));
```

### How does it work?

The key to Solipsism's client-server operation is the WorldSyncer class. It will propagate any changes made to the 
GameWorld between a local copy and a remote copy on the far side of a connection such as a websocket.

In this example, each client creates a WorldSyncer, and a separate WorldSyncer is created on the server for each client
that connects.

Bidirectional synchronisation can easily lead to infinite loops and conflicts, and so to manage this, every GameObject
has an owner. When a new object is created, its owner will be set to the identifier of the GameWorld that it is created
within. Changes for a GameObject should originate from its owner; although other GameWorlds may make changes to objects
that they don't own (e.g. for extrapolating the results of physics), in the case of any conflicts, the owner's values
take precedence.

A good rule of thumb is that a client should own any objects that the player has direct control of. For example, the
objects representing a player's camera or controllers should be owned by the client.

By default, both the GameWorld and the WorldSyncer will only broadcast changes to objects that it owns. This is fine
when you have 2 GameWorlds connect, but once you have multiple clients, the server's behaviour 

 * Client: send the server all objects that it owns
 * Server: server the client all objects except those that the client owns

The GameServer class provides the implementation of this logic, setting the GameWorld to broadcast all changes, and
then providing the approprirate client-specific filter when creating a new WorldSyncer.


Web Workers
-----------

coming soon...
