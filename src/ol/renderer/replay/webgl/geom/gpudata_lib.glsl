vec3 decodeRGB(float v) {

    const float downshift16 = 1. / 65536.;
    const float downshift8  = 1. /   256.;

    return vec3(v * downshift16, fract(v * downshift8), fract(v));
}

vec2 decodeUV(float v) {
    const float downshift12 = 1. / 4096.;

    return vec2(floor(v) * downshift12, fract(v));
}

vec2 decodeVec2I12(float v) {
    const float upshift12 = 4096.;
    const float offset = -2048.;

    return vec2(floor(v) + offset, fract(v) * upshift12 + offset);
}

vec2 decodeVec2U12(float v) {
    const float upshift12 = 4096.;

    return vec2(floor(v), fract(v) * upshift12);
}

vec4 rteDecode(vec4 highPrecCoord, vec4 highPrecOffset) {

    vec4 v = highPrecCoord + highPrecOffset;
    v.xy += v.zw;
    v.zw = vec2(0.0, 1.0);
    return v;
}

