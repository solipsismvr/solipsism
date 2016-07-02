var WorldSyncer = require('./WorldSyncer');

/**
 * Implements a simple websocket-based game server
 */
function GameServer (world) {

  // This world will broadcast all changes, client-specific filtering added later
  world.setChangeRecordFilter(function() { return true; });

  this.world = world;
}

/**
 * Add a websocket-connected client to the game server
 */
GameServer.prototype.addSocketClient = function (socket) {
  var sync = new WorldSyncer(this.world);
  sync.connect(new WorldSyncer.Socket(socket));

  // Load the meta-data and initialise the client's filter
  sync.getMetadata(function (metadata) {
    var blockedIdentifiers = metadata.identifierChain;

    // Since the world is a broadcast filter, the server should broadcast
    // everything except the client's own changes back to it
    sync.setChangeRecordFilter(function (record) {
      return record && record.owner && blockedIdentifiers.indexOf(record.owner) === -1;
    });

    // Send and receive any pre-existing objects
    sync.requestRefresh();
    sync.sendRefresh();
  });

  // Set up the disconnection handler
  socket.on('disconnect', function(){
    sync.disconnect();
  });

}


module.exports = GameServer;
