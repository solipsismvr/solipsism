var test = require('tape');

test("BaseBinding", function (t) {
  var BaseBinding = require('../src/BaseBinding');
  var GameWorld = require('../src/GameWorld');

  b = new BaseBinding('BaseBinding');

  // Object types can be added, default will be used if type isn't specified
  b.addObjectType('default', function (properties) {
    return { baseBinding: true };
  });

  // addPropertyHandler is used to define property setters
  b.addPropertyHandler('foo', function (mesh, foo) {
    mesh.thisFoo = foo;
  });

  // addPropertyRenderer is used to define renderers for sub-segments of config.
  b.addPropertyRenderer('bar', function (mesh, rendered) {
    mesh.thisBar = rendered;
  });

  // Those sub-segements have their own types
  b.addBar('yes', function (properties) {
    return 'thisYes';
  });
  b.addBar('no', function (properties) {
    return 'thisNo';
  });

  // Linking to a global state
  var allObjects = {};
  b.onAddObject = function (gameObject, linkedObject) {
    allObjects[gameObject.properties.name] = linkedObject;
  }
  b.onRemoveObject = function (gameObject, linkedObject) {
    delete allObjects[gameObject.properties.name];
  }

  // Scaffold a gameworld to test things
  var w = new GameWorld('');
  w.addBinding(b);

  var g1;
  var g2;

  t.test("adding objects", function (t) {

    g1 = w.add({
      name: 'hello',
      foo: 'test',
      bar: { type: 'yes' }
    });

    var related = g1.getLinkedObject('BaseBinding');

    t.equals(related.baseBinding, true);
    t.equals(related.thisFoo, 'test');
    t.equals(related.thisBar, 'thisYes');
    t.equals(related.gameObject, g1);

    t.end();
  });

  t.test("updating objects", function (t) {

    g1.update({
      foo: 'another',
      bar: { type: 'no' }
    });

    var related = g1.getLinkedObject('BaseBinding');

    t.equals(related.baseBinding, true);
    t.equals(related.thisFoo, 'another');
    t.equals(related.thisBar, 'thisNo');

    t.end();
  });

  t.test("removing objects", function (t) {
    g2 = w.add({
      name: 'another',
    });

    t.deepEquals(allObjects, {
      hello: g1.getLinkedObject('BaseBinding'),
      another: g2.getLinkedObject('BaseBinding'),
    });

    g1.delete();
    t.deepEquals(allObjects, {
      another: g2.getLinkedObject('BaseBinding'),
    });

    g2.delete();
    t.deepEquals(allObjects, {});

    t.end();
  });


  t.end();
})
