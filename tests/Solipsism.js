var test = require('tape');

test("Solipsism", function (t) {
  var Solipsism = require('../src/Solipsism');
  new Solipsism();
  t.end();
})
