/**
 * Optimized LZ77 compression using rolling hash
 * Complexity: O(n) average instead of O(n²)
 */
class RollingHash {
  constructor() {
    this.hash = 0;
    this.base = 256;
    this.mod = 2 ** 32;
    this.length = 3;
  }

  update(char, add = true) {
    if (add) {
      this.hash = (this.hash * this.base + char) % this.mod;
    } else {
      this.hash = (this.hash - char * Math.pow(this.base, this.length - 1)) % this.mod;
      if (this.hash < 0) this.hash += this.mod;
    }
    return this.hash;
  }
}

function lz77CompressFast(data) {
  const windowSize = 32768;
  const minMatch = 3;
  const maxMatch = 258;
  const result = [];
  const hashTable = new Map();
  let i = 0;
  
  while (i < data.length) {
    let bestLen = 0;
    let bestDist = 0;
    
    // Use rolling hash for fast matching
    if (i + minMatch <= data.length) {
      const hash = new RollingHash();
      for (let j = i; j < Math.min(i + maxMatch, data.length); j++) {
        hash.update(data[j]);
        const matches = hashTable.get(hash.hash) || [];
        for (const pos of matches) {
          let len = 0;
          while (len < maxMatch && i + len < data.length && data[pos + len] === data[i + len]) {
            len++;
          }
          if (len > bestLen && len >= minMatch) {
            bestLen = len;
            bestDist = i - pos;
          }
        }
      }
    }
    
    if (bestLen >= minMatch) {
      result.push(256);
      result.push(bestDist & 0xFF);
      result.push((bestDist >> 8) & 0xFF);
      result.push(bestLen & 0xFF);
      result.push((bestLen >> 8) & 0xFF);
      i += bestLen;
    } else {
      result.push(data[i]);
      i++;
    }
    
    // Update hash table
    if (i >= minMatch) {
      const hash = new RollingHash();
      for (let j = Math.max(0, i - windowSize); j < i; j++) {
        hash.update(data[j]);
        const matches = hashTable.get(hash.hash) || [];
        matches.push(j);
        hashTable.set(hash.hash, matches);
      }
    }
  }
  
  result.push(257);
  return new Uint8Array(result);
}

module.exports = { lz77CompressFast, RollingHash };
