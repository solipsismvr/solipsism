/**
 * Queues up WorldSyncer change records, combining/overwriting changes where appropriate.
 * Flushes the queue on request.
 */
function ChangeQueue() {

  var changes = {};

  /**
   * Push a change record onto the queue
   */
  this.push = function(changeRecord) {
    // New record
    if(!changes[changeRecord.id] || changeRecord.type === 'add') {
      changes[changeRecord.id] = changeRecord;

    // Overwritten record
    } else if(changeRecord.type === 'remove') {
      changes[changeRecord.id] = changeRecord;

    // Merged record
    } else if(changeRecord.type === 'update') {
      Object.assign(changes[changeRecord.id].properties, changeRecord.properties);
    }
  };

  /**
   * Push a list of changes onto the queue
   */
  this.pushList = function(changeList) {
    var self = this;
    changeList.forEach(function (changeRecord) {
      self.push(changeRecord);
    });
  };

  /**
   * Return the queued chagnes and clear the queue
   */
  this.flushQueue = function() {
    var changeList = [];
    for(id in changes) {
      changeList.push(changes[id]);
    }
    changes = {};
    return changeList;
  };
}

module.exports = ChangeQueue;
