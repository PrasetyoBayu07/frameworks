/**
 * Performance monitoring and metrics collector
 */
const os = require('os');

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalCompressed: 0,
      totalDecompressed: 0,
      averageCompressionTime: 0,
      averageDecompressionTime: 0,
      memoryUsage: []
    };
  }

  recordCompression(size, time) {
    this.metrics.totalCompressed += size;
    this.metrics.averageCompressionTime = 
      (this.metrics.averageCompressionTime * this.metrics.requests + time) / 
      (this.metrics.requests + 1);
    this.metrics.requests++;
  }

  recordDecompression(size, time) {
    this.metrics.totalDecompressed += size;
    this.metrics.averageDecompressionTime = 
      (this.metrics.averageDecompressionTime * this.metrics.requests + time) / 
      (this.metrics.requests + 1);
  }

  recordError() {
    this.metrics.errors++;
  }

  getSystemMetrics() {
    return {
      memory: process.memoryUsage(),
      cpu: typeof os.loadavg === 'function' ? os.loadavg() : [0, 0, 0],
      uptime: process.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      system: this.getSystemMetrics()
    };
  }

  reset() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalCompressed: 0,
      totalDecompressed: 0,
      averageCompressionTime: 0,
      averageDecompressionTime: 0,
      memoryUsage: []
    };
  }
}

module.exports = new MetricsCollector();
