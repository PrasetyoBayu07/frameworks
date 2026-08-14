/**
 * Web Worker for compression in browser
 * Offloads compression to background thread
 */
/* eslint-disable no-restricted-globals */
const { compressData, decompressData } = require('../core/LxrnFunctions');

self.onmessage = function(e) {
  const { action, data, options = {} } = e.data;
  
  try {
    let result;
    const startTime = performance.now();
    
    if (action === 'compress') {
      result = compressData(data, options.level);
    } else if (action === 'decompress') {
      result = decompressData(data);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
    
    const endTime = performance.now();
    
    self.postMessage({
      success: true,
      result: result,
      time: endTime - startTime
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};
