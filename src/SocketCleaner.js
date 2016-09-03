var ee = require('event-emitter');
var RollingVariance = require('./RollingVariance');
var InterruptableWait = require('./InterruptableWait');
var LimitedCaller = require('./LimitedCaller');

/**
 * Creates an interface for tracking timestamps of recieved packets and
 * triggering socket control events.
 *
 * Usage:
 *
 * Set up like so:
 *
 * var sc = new SocketCleaner();
 * sc.setExtrapolator(function (time) {
 *   ammoBinding.step(time);
 * });
 * sc.on('slowDown', function() {
 *   syncer.updateInterval = Math.round(syncer.updateInterval * 1.1);
 * });
 * sc.on('speedUp', function() {
 *   syncer.updateInterval = Math.round(syncer.updateInterval / 1.1);
 * });
 *
 * Then call sc.logTime(record.timestamp) every time you receive a packet from the server
 *
 * Flushes the queue on request.
 */
function SocketCleaner (options) {
  var appliedOptions = Object.assign({
    rollingVarianceSampleSize: 10,
    slowDownThreshold: 50,
  }, options);



  var extrapolator = null;
  var timeDiff = null;

  var self = this;
  ee(this);

  // Keep trakc
  var rollingStats = new RollingVariance(appliedOptions.rollingVarianceSampleSize);

  // Speed up if there have been no slow down calls for 30s
  var speedUpTrigger = new InterruptableWait(function() {
    self.emit('speedUp');
  }, 30000);

  // Slow down a maximum of once every 5 seconds
  var slowDownTrigger = new LimitedCaller(function() {
    speedUpTrigger.interrupt();
    self.emit('slowDown');
  }, 5000);

  /**
   * Provide an extrapolator to call when delayed packets are received
   */
  this.setExtrapolator = function (newExtrapolator) {
    extrapolator = newExtrapolator;
  }

  //movingAverage

  /**
   * Log the receipt of server time
   * clientTime is optional and defaults to (new Date()).getTime()
   */
  this.logTime = function (serverTime, clientTime) {
    if(!clientTime) clientTime = (new Date()).getTime();

    var nextTimeDiff = (clientTime - serverTime);

    // Look for slowDown calls
    rollingStats.push(nextTimeDiff);
    var varianceThreshold = appliedOptions.slowDownThreshold * appliedOptions.slowDownThreshold;
    if(rollingStats.getVariance() > varianceThreshold) {
      slowDownTrigger.trigger();
    }

    // If we have an extrapolator, let's use it to reduce jitter
    if(extrapolator) {
      // If we've gotten ahead of the server by more than 10ms, due to server message delays
      if(timeDiff && (nextTimeDiff - timeDiff) > 20) {
        extrapolator(nextTimeDiff - timeDiff);

      } else {
        timeDiff = nextTimeDiff;
      }
    }
  }

  /**
   * Stop this SocketCleaner
   */
  this.stop = function() {
    speedUpTrigger.stop();
  }
}

module.exports = SocketCleaner;
