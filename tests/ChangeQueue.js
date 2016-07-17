var test = require('tape');

test("ChangeQueue", function (t) {
  var ChangeQueue = require('../src/ChangeQueue');
  c = new ChangeQueue();

  c.push({ type: 'add', id: 'a', owner: 'A', properties: { position: [1,2,3], orientation: [1,2,3,4] }});
  c.push({ type: 'update', id: 'a', properties: { position: [4,5,6] }});
  c.push({ type: 'update', id: 'b', properties: { position: [7,8,9] }});
  c.pushList([
    { type: 'update', id: 'c', properties: { position: [2,3,4], orientation: [5,6,7,8] }},
    { type: 'update', id: 'c', properties: { orientation: [4,5,6,7] }},
  ]);

  t.deepEquals(c.flushQueue(), [
    // add + update combines to a single add
    { type: 'add', id: 'a', owner: 'A', properties: { position: [4,5,6], orientation: [1,2,3,4] }},
    // single update preserved
    { type: 'update', id: 'b', properties: { position: [7,8,9] }},
    // multiple updates combined to a single update
    { type: 'update', id: 'c', properties: { position: [2,3,4], orientation: [4,5,6,7] }},
  ]);

  // Next flushQueue() is empty
  t.deepEquals(c.flushQueue(), []);

  // Can re-use it for further updates
  c.push({ type: 'update', id: 'c', properties: { orientation: [3,4,5,6] }});
  t.deepEquals(c.flushQueue(), [
    { type: 'update', id: 'c', properties: { orientation: [3,4,5,6] }},
  ]);

  t.end();
})
