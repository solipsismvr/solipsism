module.exports = {
  GameWorld: require('./GameWorld'),
  GameObject: require('./GameObject'),
  WorldSyncer: require('./WorldSyncer'),

  WorkerSyncer: require('./WorldSyncer').Worker,
  WorkerParentSyncer: require('./WorldSyncer').WorkerParent,
  SocketSyncer:  require('./WorldSyncer').Socket
};
