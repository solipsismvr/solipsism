var ChangeQueue = require('./ChangeQueue');

/**
 * Synchronise two worlds via message passing
 */
function WorldSyncer(world) {
  this.world = world;

  this.changeRecordFilter = function (record) {
    return record && record.owner && record.owner === world.identifier;
  };
}

/**
 * WorldSyncer.workerParent is an interface for connecting to the main thread that spawned the current
 * web worker. Pass it to connectToWorker within your webworker
 */
WorldSyncer.WorkerParent = function() {
  this.addMessageHandler = function(handler) {
    addEventListener("message", this.messageListener = function (event) {
      handler(event.data);
    });
  };

  this.removeMessageHandler = function(handler) {
    if(this.messageListener) {
      removeEventListener("message", this.messageListener);
    }
  };

  this.postMessage = function(message) {
    postMessage(message);
  };
};

/**
 * Sync interface via a websocket
 */
WorldSyncer.Socket = function(socket) {

  this.addMessageHandler = function(handler) {
    socket.on('message', this.worldSyncListener = function(message) {
      handler(message);
    });
  };

  this.removeMessageHandler = function() {
    if (this.worldChangeListener) {
      handler.off('message', this.worldSyncListener);
      delete this.worldChangeListener;
    }
  }

  this.postMessage = function(message) {
    socket.send(message);
  };

}

/**
 * Sync interface via a web worker
 */
WorldSyncer.Worker = function(worker) {

  this.addMessageHandler = function(handler) {
    worker.addEventListener("message", this.messageListener = function (event) {
      handler(event.data);
    });
  }

  this.removeMessageHandler = function(handler) {
    if(this.messageListener) {
      worker.removeEventListener("message", this.messageListener);
    }
  };

  this.postMessage = worker.postMessage.bind(worker);

}

/**
 * Connect to the given interface. The interface should have two callback properties:
 *  - addMessageHandler(handler). handler will be a callback that expects a data payload
 *  - postMessage(message). message will be a data payload
 */
WorldSyncer.prototype.connect = function (syncInterface, options) {
  var appliedOptions = Object.assign({
    updateInterval: null
  }, options || {});

  if (this.syncInterface) {
    console.err('Cannot make a 2nd connect() call on a WorldSyncer. Use a 2nd WorldSyncer object');
    return;
  }

  this.syncInterface = syncInterface;

  var self = this;

  // Listen for change events
  syncInterface.addMessageHandler(self.handleMessage.bind(self));

  // Send a list of changes
  function sendChanges(data) {
    if(data.length) {
      syncInterface.postMessage(['worldChange', { changes: data, timestamp: (new Date()).getTime() } ]);
    }
  }

  // Map of queued changes by object id
  if(appliedOptions.updateInterval) {
    var queuedChanges = new ChangeQueue();
    this.interval = setInterval(function() {
      var changes = queuedChanges.flushQueue();
      sendChanges(changes);
    }, appliedOptions.updateInterval);
  }

  // Send change events
  this.world.on('worldChange', this.worldChangeListener = function (data) {
    data = data.filter(self.changeRecordFilter);

    if(data.length) {
      // Queued operation
      if(appliedOptions.updateInterval) {
        queuedChanges.pushList(data);

      // Direct operation
      } else {
        sendChanges(data);
      }
    }
  });
}

/**
 * Disconnect this WorldSyncer
 */
WorldSyncer.prototype.disconnect = function () {
  if (this.worldChangeListener) {
    this.world.off('worldChange', this.worldChangeListener);
    delete this.worldChangeListener;
  }

  this.syncInterface.removeMessageHandler();

  if(this.interval) {
    clearInterval(this.interval);
    this.interval = null;
  }

  delete this.syncInterface;
}

WorldSyncer.prototype.handleMessage = function (message) {
  var self = this;
  var timeDiff;

  switch (message[0]) {
    case 'worldChange':
      // Process changes
      message[1].changes.forEach(function (changeItem) {
        switch(changeItem.type) {
          case 'add':
            self.world.queueAdd(changeItem.id, changeItem.properties, changeItem.owner);
            break;

          case 'update':
            if(self.world.hasObject(changeItem.id)) {
              self.world.queueUpdate(changeItem.id, changeItem.properties);
            }
            break;

          case 'remove':
            self.world.objects[changeItem.id].delete();
            break;

          default:
            throw new Error('Can\'t handle update type: ' + changeItem.type);
        }
      });

      // If we have an extrapolator, let's use it to reduce jitter
      if(this.extrapolator) {
        timeDiff = (new Date().getTime() - message[1].timestamp);

        // If we've gotten ahead of the server by more than 10ms, due to server message delays
        if(this.timeDiff && (timeDiff - this.timeDiff) > 20) {
          this.extrapolator(timeDiff - this.timeDiff);

        } else {
          this.timeDiff = timeDiff;
        }
      }

      self.world.flushQueue();
      break;

    // When the other client requests a refresh, send all the applicable objects
    case 'requestRefresh':
      this.sendRefresh();
      break;

    case 'requestMetadata':
      console.log('sending metadata');
      this.syncInterface.postMessage(['metadata', this.world.getMetadata()]);
      break;

    case 'metadata':
      console.log('received metadata');
      this.setMetadata(message[1]);
      break;

    default:
      throw new Error('Can\'t handle message type: ' + message[0]);
  }
}

/**
 * Provide a new change record filter.
 * This defines which owners will have their changes sent.
 * By default only objects owned by the attached game-world will be sent.
 * For servers and routers, more sophisiticated settings wil be needed
 */
WorldSyncer.prototype.setChangeRecordFilter = function (changeRecordFilter) {
  this.changeRecordFilter = changeRecordFilter;
}

/**
 * Provide an extrapolator callback
 * This defines a function that will be called in order to fast-forward a gameworld
 * by a particular number of milliseconds. It will be used when out-of-date content
 * has been received from another gameworld
 */
WorldSyncer.prototype.setExtrapolator = function (extrapolator) {
  this.extrapolator = extrapolator;
}

WorldSyncer.prototype.getMetadata = function (callback) {
  if(this.metadata) {
    callback(this.metadata);
    return;
  }

  if (!this.onSetMetadata) this.onSetMetadata = [];
  this.onSetMetadata.push(callback);

  console.log('requesting metadata');
  this.syncInterface.postMessage(['requestMetadata'])
}

WorldSyncer.prototype.setMetadata = function (metadata) {
  this.metadata = metadata;

  // Resolve all the post-set-metadata callbacks
  if(this.onSetMetadata) {
    this.onSetMetadata.forEach(function (callback) { callback(metadata); });
    delete this.onSetMetadata;
  }
}

WorldSyncer.prototype.requestRefresh = function () {
  //console.log(this.identifier,'requesting refresh');

  // Ask for a refresh
  this.syncInterface.postMessage(['requestRefresh']);
}

WorldSyncer.prototype.sendRefresh = function () {
  //console.log(this.identifier,'sending refresh');

  var batch = [];
  var i;
  for(i in this.world.objects) {
    if(this.world.objects[i].batchCreate) {
      batch.push(this.world.objects[i].batchCreate());
    }
  }
  //console.log(this.world.identifier,'sending batch. num items',batch.length);
  this.world.sendBatchedWorldChanges(batch);

}

module.exports = WorldSyncer;
