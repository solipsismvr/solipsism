function Queue() {
  var store = [];
  this.enqueue = function (x) { store.push(x); };
  this.dequeue = function () { return store.splice(0,1)[0]; };
}

function RollingVariance(sampleSize) {
  var mean = 0;
  var accVar = 0;
  var n = 0;
  var queue = new Queue(sampleSize);

  this.push = function(observation) {
    queue.enqueue(observation);
    if (n < sampleSize) {
      // Calculating first variance
      n++;
      var delta = observation - mean;
      mean += delta / n;
      accVar += delta * (observation - mean);
    } else {
      // Adjusting variance
      var then = queue.dequeue();
      var prevMean = mean;
      mean += (observation - then) / sampleSize;
      accVar += (observation - prevMean) * (observation - mean) - (then - prevMean) * (then - mean);
    }
  };

  this.getVariance = function() {
    if (n == sampleSize) {
      return accVar / (sampleSize - 1);
    }
    return null;
  };

  this.getMean = function() {
    return mean;
  };
}

module.exports = RollingVariance;
