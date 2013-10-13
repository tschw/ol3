vec3 decodeRGB(float v) {

    const float downshift16 = 1. / 65536.;
    const float downshift8  = 1. /   256.;

    return vec3(v * downshift16, fract(v * downshift8), fract(v));
}

vec4 rteDecode(vec4 highPrecCoord, vec4 highPrecOffset) {

    vec4 v = highPrecCoord + highPrecOffset;
    v.xy += v.zw;
    v.zw = vec2(0.0, 1.0);
    return v;
}

