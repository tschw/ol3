// This file is automatically generated, do not edit
goog.provide('ol.renderer.webgl.vectorlayer2.shader.LineStringCollection');
goog.require('ol.webgl.shader');
/**
 * @constructor
 * @extends {ol.webgl.shader.Fragment}
 */
ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionFragment = function() {
  goog.base(this, ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionFragment.SOURCE);
};
goog.inherits(ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionFragment, ol.webgl.shader.Fragment);
goog.addSingletonGetter(ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionFragment);
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionFragment.DEBUG_SOURCE = 'precision mediump float;\n//! NAMESPACE=ol.renderer.webgl.vectorlayer2.shader.LineStringCollection\n//! CLASS=ol.renderer.webgl.vectorlayer2.shader.LineStringCollection\n\n\n//! COMMON\n//#version 100 // FIXME we should be able to uncomment this\n#define PREMULTIPLY_BY_ALPHA true\n\n\n//! FRAGMENT\n// ---- Configuration\n\nprecision mediump float;\n\n// ---- Interface\n\nvarying vec2 Surface;\nvarying float Invalidator;\n\nvarying vec2 v_Style;\nfloat lineWidth = v_Style.x;\nfloat outlineWidth = v_Style.y;\n\nvec4 FillColor = vec4(1.,0.,0.,1.);\nvec4 StrokeColor = vec4(1.,1.,0.,1.);\n\n//uniform vec3 RenderParams;\n//float antiAliasing = RenderParams.x;\n//float gamma = RenderParams.y;\n//float rcpGamma = RenderParams.z;\nconst float antiAliasing = 1.5;\nconst float gamma = 2.3;\nconst float rcpGamma = 1./gamma;\n\n\n// ---- Implementation\n\nfloat blendCoeff(vec2 edge0, vec2 edge1, vec2 x) {\n    vec2 weight = smoothstep(edge0, edge1, x);\n    return max(weight.x, weight.y);\n}\n\nvec3 gammaApply(vec3 color) {\n    return pow(abs(color), vec3(gamma));\n}\n\nvec3 gammaCorrect(vec3 color) {\n    return pow(abs(color), vec3(rcpGamma));\n}\n\nvoid main(void) {\n\n    if (Invalidator > 0.0) discard;\n\n    // Determine distance vector from centerpoint (1;1) surface coordinates\n    // the outer edge of the surface is located at 1\n    vec2 dist = min(abs(Surface - vec2(1.0)), 1.0);\n\n    // Determine surface scale from screen space derivatives\n#ifdef STANDARD_DERIVATIVES\n    vec2 dSurfPixX = dFdx(Surface), dSurfPixY = dFdy(Surface);\n    vec2 scale = vec2(length(vec2(dSurfPixX.x, dSurfPixY.x)),\n                      length(vec2(dSurfPixX.y, dSurfPixY.y)));\n#else\n    vec2 scale = vec2(1.0 / lineWidth);\n#endif\n\n    // Determine surface coordinate thresholds:\n    //\n    // 0.0                                     1.0\n    // ... inside.. - edge =#{ border }#= edge -|\n    //              |<---+-->|<-------+-------->|\n    //              :   \|/  :       \|/        :\n    //              :   /|\  :        |         :\n    vec2 edgeWidth = antiAliasing * scale;\n    //              :        :       /|\        :\n    vec2 outline = outlineWidth * scale;\n    //              :        :        :         :\n    //              :        :        ^<--------|\n    vec2 outerEdgeMin = vec2(1.0) - edgeWidth;\n    //              ^<-------:--------|\n    vec2 innerEdgeMin = outerEdgeMin - outline;\n    //              |--------^\n    vec2 innerEdgeMax = innerEdgeMin + edgeWidth;\n    // When these   ^^^^^^^^^^        ^^^^^^^^^^^ two regions\n    // overlap, the maximum intensity will be below 1.\n    //\n    // Both regions have the same width and provide the input to\n    // the same monotonic function (x=0 for region start).\n    //\n    // => The result will never be blow zero, and\n    // => there will be no jump discontinuities.\n    // => maximum luminance at min(1.0, LineWidth / AntiAliasing)\n\n    // Determine foreground color\n    vec4 color = mix(FillColor, StrokeColor, blendCoeff(innerEdgeMin, innerEdgeMax, dist));\n\n    // Adjust alpha for anti-aliasing on the outer edge\n    color.a = color.a * (1.0 - blendCoeff(outerEdgeMin, vec2(1.0), dist));\n\n    // Obviously - no implicit gamma correction happens on most platforms.\n    // See: http://stackoverflow.com/questions/10843321\n    //\n    // This is only half of it - acutually the proper way would require\n    // a finalizing rendering task, so that blending can be performed\n    // in linearized color space.\n    color.rgb = gammaCorrect(color.rgb);\n\n#ifdef PREMULTIPLY_BY_ALPHA\n    color.rgb *= color.a;\n#endif\n    gl_FragColor = color;\n}\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionFragment.OPTIMIZED_SOURCE = 'precision mediump float;#define PREMULTIPLY_BY_ALPHA true\nprecision mediump float;varying vec2 d,c;varying float e;float f=c.x;float g=c.y;vec4 h=vec4(1,0,0,1);vec4 i=vec4(1,1,0,1);const float j=1.5;const float k=2.3;const float l=1./k;float w(vec2 m,vec2 n,vec2 o){vec2 p=smoothstep(m,n,o);return max(p.x,p.y);}vec3 x(vec3 m){return pow(abs(m),vec3(l));}void main(){if(e>0.)discard;vec2 m,q,r,s,t,u;m=min(abs(d-vec2(1)),1.);\n#ifdef STANDARD_DERIVATIVES\nvec2 n,o,p;n=dFdx(d);o=dFdy(d);p=vec2(length(vec2(n.x,o.x)),length(vec2(n.y,o.y)));\n#else\nvec2 p=vec2(1./f);\n#endif\nq=j*p;r=g*p;s=vec2(1)-q;t=s-r;u=t+q;vec4 v=mix(h,i,w(t,u,m));v.a=v.a*(1.-w(s,vec2(1),m));v.rgb=x(v.rgb);\n#ifdef PREMULTIPLY_BY_ALPHA\nv.rgb*=v.a;\n#endif\ngl_FragColor=v;}';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionFragment.SOURCE = goog.DEBUG ?
    ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionFragment.DEBUG_SOURCE :
    ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionFragment.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @extends {ol.webgl.shader.Vertex}
 */
ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionVertex = function() {
  goog.base(this, ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionVertex.SOURCE);
};
goog.inherits(ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionVertex, ol.webgl.shader.Vertex);
goog.addSingletonGetter(ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionVertex);
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionVertex.DEBUG_SOURCE = '//! NAMESPACE=ol.renderer.webgl.vectorlayer2.shader.LineStringCollection\n//! CLASS=ol.renderer.webgl.vectorlayer2.shader.LineStringCollection\n\n\n//! COMMON\n//#version 100 // FIXME we should be able to uncomment this\n#define PREMULTIPLY_BY_ALPHA true\n\n\n//! VERTEX\n// ---- Configuration\n\nprecision mediump float;\n\n// ---- Interface\n\nattribute vec2 PositionP;\nattribute vec2 Position0;\nattribute vec2 PositionN;\nattribute float Control;\n\nattribute vec2 Style;\nfloat lineWidth = Style.x;\n\nuniform mat4 Transform;\nuniform vec2 PixelScale;\n\nvarying vec2 v_Style;\nvarying vec2 Surface;\nvarying float Invalidator;\n\n// ---- Implementation\n\nfloat removeHighbits(float x, float valueOfLowest) {\n    return x - floor(x / valueOfLowest) * valueOfLowest;\n}\nfloat extractHighbits(float x, float valueOfLowest) {\n    return floor(x / valueOfLowest);\n}\n\nfloat zeroToOne(float f) {\n    return f != 0.0 ? f : 1.0;\n}\n\nvec2 ccwNormal(vec2 p) {\n    return vec2(p.y, -p.x) / zeroToOne(length(p));\n}\n\nvec3 transform(vec2 p) {\n    vec4 tmp = Transform * vec4(p, 0.0, 1.0);\n    return tmp.xyz / tmp.w;\n}\n\n\nvoid main(void) {\n\n    // Apply transform\n    vec2 pP = transform(PositionP).xy;\n    vec2 p0 = transform(Position0).xy;\n    vec2 pN = transform(PositionN).xy;\n\n    // Look at two successive edges and determine direction / factor\n    vec2 eP = ccwNormal(p0 - pP);\n    vec2 eN = ccwNormal(pN - p0);\n    vec2 normal = normalize(eP + eN);\n\n    // Account for mitering\n    float width = lineWidth / zeroToOne(dot(eN, normal));\n\n    // Decode edge control value to surface coordinates\n    vec2 surface = vec2(extractHighbits(Control, 4.0),\n                        removeHighbits(Control, 4.0));\n\n    // ...where a special value invalidates the vertex\n    float invalidator = max(surface.y - 2.0, 0.0);\n\n    // Sign of the locally horizontal surface coordinate\n    // tells us whether to go left or right\n    width *= zeroToOne(surface.x - 1.0);\n\n    // Transform\n    vec4 vertex = Transform * vec4(Position0, 0.0, 1.0);\n    vertex.xy += width * normal * PixelScale;\n\n    // Store varyings\n    gl_Position = vertex;\n    Surface = surface;\n    Invalidator = invalidator;\n    v_Style = Style;\n}\n\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionVertex.OPTIMIZED_SOURCE = '#define PREMULTIPLY_BY_ALPHA true\nprecision mediump float;attribute vec2 f,g,h,j;attribute float i;float k=j.x;uniform mat4 a;uniform vec2 b;varying vec2 c,d;varying float e;float v(float l,float m){return l-floor(l/m)*m;}float w(float l,float m){return floor(l/m);}float x(float l){return l!=0.?l:1.;}vec2 y(vec2 l){return vec2(l.y,-l.x)/x(length(l));}vec3 z(vec2 l){vec4 m=a*vec4(l,0,1);return m.xyz/m.w;}void main(){vec2 l,m,n,o,p,q,s;l=z(f).xy;m=z(g).xy;n=z(h).xy;o=y(m-l);p=y(n-m);q=normalize(o+p);float r,t;r=k/x(dot(p,q));s=vec2(w(i,4.),v(i,4.));t=max(s.y-2.,0.);r*=x(s.x-1.);vec4 u=a*vec4(g,0,1);u.xy+=r*q*b;gl_Position=u;d=s;e=t;c=j;}';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionVertex.SOURCE = goog.DEBUG ?
    ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionVertex.DEBUG_SOURCE :
    ol.renderer.webgl.vectorlayer2.shader.LineStringCollectionVertex.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @param {WebGLRenderingContext} gl GL.
 * @param {WebGLProgram} program Program.
 */
ol.renderer.webgl.vectorlayer2.shader.LineStringCollection.Locations = function(gl, program) {
  /**
   * @type {WebGLUniformLocation}
   */
  this.Transform = gl.getUniformLocation(
      program, goog.DEBUG ? 'Transform' : 'a');
  /**
   * @type {WebGLUniformLocation}
   */
  this.PixelScale = gl.getUniformLocation(
      program, goog.DEBUG ? 'PixelScale' : 'b');
  /**
   * @type {number}
   */
  this.PositionP = gl.getAttribLocation(
      program, goog.DEBUG ? 'PositionP' : 'f');
  /**
   * @type {number}
   */
  this.Position0 = gl.getAttribLocation(
      program, goog.DEBUG ? 'Position0' : 'g');
  /**
   * @type {number}
   */
  this.PositionN = gl.getAttribLocation(
      program, goog.DEBUG ? 'PositionN' : 'h');
  /**
   * @type {number}
   */
  this.Control = gl.getAttribLocation(
      program, goog.DEBUG ? 'Control' : 'i');
  /**
   * @type {number}
   */
  this.Style = gl.getAttribLocation(
      program, goog.DEBUG ? 'Style' : 'j');
};
