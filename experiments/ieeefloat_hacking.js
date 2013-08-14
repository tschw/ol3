
function encode888(r,g,b) { return Math.floor(r) * 65536 + Math.floor(g) * 256 + Math.floor(b); } 

function decode888(v) { var r = Math.floor(v / 65536); var g = Math.floor(v / 256) - r * 256; var b = Math.floor(v) - r * 65536 - g * 256; return [r,g,b]; }
// (clumsy implementation, here)



function force32(v) { var b = Float32Array([v]); return b[0]; }
function ld32(v) { return Math.log(force32(v)) / Math.log(2); }

// can encode 0x800000 in exponent range -138..100 (experimentally determined)
// some of it will be denormalized already (there are just 32 bits)


// a: 0..127  b: 0..255  c: 0..255  d: 0..231 
function encodeABCD(a,b,c,d) { return (0x800000 | (Math.floor(a) * 65536 + Math.floor(b) * 256 + Math.floor(c))) * Math.pow(2, d-127); } 

function deexp(v) { var expAdj = 23 - Math.floor(ld32(v)); return [ expAdj, force32(v * force32(Math.pow(2,expAdj))) ]; }
function decodeABCD(v) { var x = deexp(v); var result = decode888(x[1] &~ 0x800000); result.push(127-x[0]); return result; }


