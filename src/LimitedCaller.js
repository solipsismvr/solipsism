/**
 * Allow the triggering of a callback with a minimum time between executions
 * Can be used to prevent message storms
 */
function LimitedCaller(callback, minWait) {
  var lastCall = null;

  this.trigger = function() {
    var now = (new Date()).getTime();
    if(now - lastCall >= minWait) {
      callback();
      lastCall = now;
    }
  }
}

module.exports = LimitedCaller;
