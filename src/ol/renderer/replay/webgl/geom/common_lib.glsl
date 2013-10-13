

vec3 applyGamma(vec3 color, float reciprocalGamma) {
    return pow(clamp(color, 0.0, 1.0), vec3(reciprocalGamma));
}

vec2 rotatedCw(vec2 p) {
    return vec2(p.y, -p.x);
}

vec2 rotatedCcw(vec2 p) {
    return vec2(-p.y, p.x);
}

vec2 safeNormalized(vec2 v) {
    float frob = dot(v, v);
    return v * (frob > 0.0 ? inversesqrt(frob) : 0.0);
}

vec3 projected(vec4 p) {
    return p.xyz / p.w;
}


