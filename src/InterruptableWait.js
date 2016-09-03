/**
 * Trigger a callback if interrupt() is not called for a given quiet period
 */
function InterruptableWait(callback, quietTime) {

  var repeatedCallback = function() {
    callback();
    setTimeout(repeatedCallback, quietTime);
  }

  var timer = setTimeout(repeatedCallback, quietTime);

  this.interrupt = function() {
    clearTimeout(timer);
    timer = setTimeout(repeatedCallback, quietTime);
  }

  this.stop = function() {
    clearTimeout(timer);
  }
}

module.exports = InterruptableWait;
