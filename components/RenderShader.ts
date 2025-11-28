export const renderVertexShader = `
uniform sampler2D uPositions;
attribute vec2 reference; // The UV coordinate to read from the texture
uniform float uTime;
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Read position from the FBO
  vec3 pos = texture2D(uPositions, reference).rgb;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size attenuation based on depth
  gl_PointSize = 4.0 * (10.0 / -mvPosition.z);

  // Visuals
  // Color shifts based on Z depth
  // Deep = Blue, Close/High Z = Cyan/White
  float depth = smoothstep(0.0, 4.0, pos.z);
  vColor = mix(vec3(0.1, 0.3, 0.8), vec3(0.5, 0.9, 1.0), depth);
  
  // Opacity fade based on distance
  vAlpha = 0.6 + depth * 0.4;
}
`;

export const renderFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Circular particle shape with soft edge
  vec2 xy = gl_PointCoord.xy - vec2(0.5);
  float dist = length(xy);
  if (dist > 0.5) discard;

  // Soft glow
  float strength = 1.0 - (dist * 2.0);
  strength = pow(strength, 2.0);

  gl_FragColor = vec4(vColor, vAlpha * strength);
}
`;
