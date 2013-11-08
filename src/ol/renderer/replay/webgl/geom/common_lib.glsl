

vec3 applyGamma(vec3 color, float reciprocalGamma) {
    return pow(clamp(color, 0.0, 1.0), vec3(reciprocalGamma));
}

vec2 rotatedCw(vec2 p) {
    return vec2(p.y, -p.x);
}

vec2 rotatedCcw(vec2 p) {
    return vec2(-p.y, p.x);
}

// Machine epsilon is at ~0.6*10^-8 for a typical 32 bit ALU.
// Usually we don't need the precision of the entire mantissa
// but at some point the vector becomes rather useless.
// Also, sometimes just error dirt creep up the low bits for
// values that should yield zero.
const float NORM_EPS = 0.000000001;

vec2 safeNormalized(vec2 v) {

    float frob = dot(v, v);
    return v * (frob > NORM_EPS ? inversesqrt(frob) : 0.0);
}

vec2 safeNormalized(vec2 v, vec2 fallback) {

    float frob = dot(v, v);
    return frob > NORM_EPS ? v * inversesqrt(frob) : fallback;
}

vec3 projected(vec4 p) {
    return p.xyz / p.w;
}
