const base = new URL('.', import.meta.url);
let dataset;
const toRadians = Math.PI / 180;
export const elevationScale = 111120;
export const radians = toRadians;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function imageFile(name) {
  const image = new Image();
  image.src = new URL(name, base).href;
  return image.decode().then(() => image);
}

function pixels(image, width = image.width, height = image.height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}

export function loadTerrain() {
  if (dataset) return dataset;
  dataset = Promise.all([
    fetch(new URL('extent.json', base)).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }),
    imageFile('height.png'),
    imageFile('landcover.webp'),
  ]).then(([extent, dem, texture]) => {
    const packed = pixels(dem);
    const heights = new Uint16Array(dem.width * dem.height);
    for (let i = 0; i < heights.length; i++) heights[i] = packed[i * 4] * 256 + packed[i * 4 + 1];
    return { ...extent, heights, texture };
  }).catch(error => { dataset = undefined; throw error; });
  return dataset;
}

export function makeWorld(data, origin) {
  const eastScale = elevationScale * Math.cos(origin.lat * radians);
  const west = (data.west - origin.lon) * eastScale;
  const north = (data.north - origin.lat) * elevationScale;
  const spanX = (data.east - data.west) * eastScale;
  const spanZ = (data.north - data.south) * elevationScale;
  function altitude(x, z) {
    const px = (x - west) / spanX * (data.width - 1);
    const py = (north - z) / spanZ * (data.height - 1);
    if (px < 0 || py < 0 || px >= data.width - 1 || py >= data.height - 1) return 0;
    const x0 = Math.floor(px), y0 = Math.floor(py);
    const ax = px - x0, ay = py - y0, offset = y0 * data.width + x0;
    const h = data.heights;
    return (h[offset] * (1 - ax) + h[offset + 1] * ax) * (1 - ay) +
      (h[offset + data.width] * (1 - ax) + h[offset + data.width + 1] * ax) * ay;
  }
  const loc = (lat, lon) => ({ x: (lon - origin.lon) * eastScale, z: (lat - origin.lat) * elevationScale });
  return { altitude, loc, west, north, spanX, spanZ, data, origin };
}

const detailTiles = [
  ['pilot', [126.68,33.34,126.79,33.43]],
  ['seongsan', [126.89,33.425,126.976,33.525]],
  ['ttarabi-aerial', [126.7457,33.3816,126.7606,33.3933]],
];
const tileCache=new Map();

export async function localTextures(world) {
  const { data,origin } = world;
  const selected=detailTiles.filter(([,b])=>origin.lon>=b[0]-.035 && origin.lon<=b[2]+.035 && origin.lat>=b[1]-.025 && origin.lat<=b[3]+.025);
  return (await Promise.all(selected.map(async ([id,bounds])=>{
    if(!tileCache.has(id))tileCache.set(id,imageFile(id+'-detail.webp').catch(()=>{tileCache.delete(id);return null;}));
    const map=await tileCache.get(id);
    if(!map)return null;
    const u=(bounds[0]-data.west)/(data.east-data.west),v=(data.north-bounds[3])/(data.north-data.south);
    return {map, u,v,scaleU:(data.east-data.west)/(bounds[2]-bounds[0]),scaleV:(data.north-data.south)/(bounds[3]-bounds[1])};
  }))).filter(Boolean);
}

export function viewCamera(camera, width, height) {
  const { yaw, pitch } = camera;
  const tanH = Math.tan(clamp(44 * Math.sqrt(width / Math.max(height, 1)), 30, 64) * radians);
  return { cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch), tanH, tanV: tanH * height / width };
}

export function project(camera, view, point) {
  const dx = point.x - camera.x, dz = point.z - camera.z, dy = point.y - camera.y;
  const forward = dx * view.sy + dz * view.cy;
  const depth = forward * view.cp + dy * view.sp;
  if (depth < 2) return null;
  return {
    x: 0.5 + (dx * view.cy - dz * view.sy) / (2 * depth * view.tanH),
    y: 0.5 - (dy * view.cp - forward * view.sp) / (2 * depth * view.tanV),
  };
}

function mesh(world) {
  const distances = [0];
  for (let d = 45; d <= 75000; d += Math.max(54, (d - 2400) * 0.105)) distances.push(d);
  const axis = [...distances.slice(1).reverse().map(n => -n), ...distances];
  const size = axis.length;
  const vertices = new Float32Array(size * size * 6);
  const indices = new Uint16Array((size - 1) * (size - 1) * 6);
  let v = 0, k = 0;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = axis[i], z = axis[j], y = world.altitude(x, z);
    const dx = (world.altitude(x + 36, z) - world.altitude(x - 36, z)) / 72;
    const dz = (world.altitude(x, z + 36) - world.altitude(x, z - 36)) / 72;
    vertices[v++] = x; vertices[v++] = y; vertices[v++] = z;
    vertices[v++] = (x - world.west) / world.spanX;
    vertices[v++] = (world.north - z) / world.spanZ;
    vertices[v++] = clamp(1 + dx * 0.24 - dz * 0.4, 0.65, 1.3);
    if (i === size - 1 || j === size - 1) continue;
    const p = j * size + i;
    indices.set([p, p + size, p + 1, p + 1, p + size, p + size + 1], k);
    k += 6;
  }
  return { vertices, indices };
}

function glTerrain(gl, world, tiles) {
  const vert = `
    attribute vec3 pos; attribute vec2 uv; attribute float shade;
    uniform vec3 eye; uniform vec4 axes; uniform vec2 fov;
    varying vec2 vUv; varying float light; varying float distanceToEye; varying float elevation;
    void main(){
      vec3 r=pos-eye; float forward=r.x*axes.y+r.z*axes.x;
      float depth=forward*axes.z+r.y*axes.w;
      gl_Position=vec4((r.x*axes.x-r.z*axes.y)/fov.x,(r.y*axes.z-forward*axes.w)/fov.y,depth*1.000029-2.0,depth);
      vUv=uv; light=shade; distanceToEye=length(r); elevation=pos.y;
    }`;
  const frag = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform sampler2D cover, detail0, detail1;
    uniform vec4 bounds0, bounds1;
    varying vec2 vUv; varying float light; varying float distanceToEye; varying float elevation;
    vec3 detailColor(vec3 base, sampler2D tile, vec4 bounds){
      vec2 local=(vUv-bounds.xy)*bounds.zw;
      float weight=clamp(min(min(local.x,local.y),min(1.-local.x,1.-local.y))*60.,0.,1.);
      return mix(base,texture2D(tile,clamp(local,0.,1.)).rgb,weight);
    }
    void main(){
      vec3 sea=vec3(.28,.56,.62);
      vec3 ground=texture2D(cover,clamp(vUv,0.,1.)).rgb;
      ground=detailColor(detailColor(ground,detail0,bounds0),detail1,bounds1);
      float inside=step(0.,vUv.x)*step(0.,vUv.y)*step(vUv.x,1.)*step(vUv.y,1.);
      vec3 color=mix(sea,ground*light,inside);
      float mist=clamp(1.-exp(-distanceToEye/32000.),0.,.88);
      gl_FragColor=vec4(mix(color,vec3(.80,.85,.82),mist),1.);
    }`;
  const shaders = [vert, frag].map((source, i) => {
    const shader = gl.createShader(i ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    return shader;
  });
  const program = gl.createProgram();
  shaders.forEach(shader => gl.attachShader(program, shader));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const { vertices, indices } = mesh(world);
  const geometry = gl.createBuffer(), elements = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, geometry); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  for (const [name, dims, offset] of [['pos', 3, 0], ['uv', 2, 12], ['shade', 1, 20]]) {
    const pos = gl.getAttribLocation(program, name);
    if (pos < 0) continue;
    gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, dims, gl.FLOAT, false, 24, offset);
  }
  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  function upload(image,unit){
    const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
    for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
    for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
    if(image.width>max||image.height>max){
      const resized=document.createElement('canvas'),ratio=Math.min(max/image.width,max/image.height);
      resized.width=Math.floor(image.width*ratio);resized.height=Math.floor(image.height*ratio);
      resized.getContext('2d').drawImage(image,0,0,resized.width,resized.height);image=resized;
    }
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);return texture;
  }
  const textures=[upload(world.data.texture,0)];
  for(let i=0;i<2;i++){
    const tile=tiles[i];
    if(tile)textures.push(upload(tile.map,i+1));
    gl.uniform1i(gl.getUniformLocation(program,'detail'+i),tile?i+1:0);
    gl.uniform4f(gl.getUniformLocation(program,'bounds'+i),tile?.u??8,tile?.v??8,tile?.scaleU??1,tile?.scaleV??1);
  }
  const eye = gl.getUniformLocation(program, 'eye'), axes = gl.getUniformLocation(program, 'axes'), fov = gl.getUniformLocation(program, 'fov');
  gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);
  return {
    draw(camera, view, width, height) {
      const ratio = Math.min(1.5, window.devicePixelRatio || 1, 1600 / width);
      const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
      if (gl.canvas.width !== w || gl.canvas.height !== h) { gl.canvas.width = w; gl.canvas.height = h; }
      gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform3f(eye, camera.x, camera.y, camera.z); gl.uniform4f(axes, view.cy, view.sy, view.cp, view.sp);
      gl.uniform2f(fov, view.tanH, view.tanV); gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    },
    dispose() {
      textures.forEach(texture=>gl.deleteTexture(texture)); gl.deleteProgram(program); shaders.forEach(shader => gl.deleteShader(shader));
      gl.deleteBuffer(geometry); gl.deleteBuffer(elements);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// Depth-ordered heightfield rendering also works on devices without a WebGL context.
function softwareTerrain(canvas, world) {
  const ctx = canvas.getContext('2d');
  const { width, height } = world.data;
  const colors = pixels(world.data.texture, width, height);
  return {
    draw(camera, view, cssW, cssH) {
      const w = Math.round(clamp(cssW / 3, 110, 310)), h = Math.round(cssH * w / cssW);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const image = ctx.createImageData(w, h), out = image.data;
      for (let i = 0; i < w; i++) {
        const across = ((i + .5) / w * 2 - 1) * view.tanH;
        const sx = view.sy + view.cy * across, sz = view.cy - view.sy * across;
        let bottom = h;
        for (let d = 9; d < 61000 && bottom > 0; d += Math.max(15, d * .046)) {
          const x = camera.x + sx * d, z = camera.z + sz * d;
          const u = Math.round((x - world.west) / world.spanX * (width - 1));
          const v = Math.round((world.north - z) / world.spanZ * (height - 1));
          const inside = u >= 0 && v >= 0 && u < width && v < height;
          const p = v * width + u, alt = inside ? world.data.heights[p] : 0;
          const dy = alt - camera.y, depth = d * view.cp + dy * view.sp;
          if (depth < 2) continue;
          const top = Math.max(0, Math.floor(h * (.5 - (dy * view.cp - d * view.sp) / (2 * view.tanV * depth))));
          if (top >= bottom) continue;
          const fog = 1 - Math.exp(-d / 32000), c = p * 4;
          const r = (inside ? colors[c] : 71) * (1-fog) + 204*fog;
          const g = (inside ? colors[c+1] : 143) * (1-fog) + 217*fog;
          const b = (inside ? colors[c+2] : 158) * (1-fog) + 209*fog;
          for (let j = top; j < bottom; j++) {
            const n = (j*w+i)*4; out[n]=r; out[n+1]=g; out[n+2]=b; out[n+3]=255;
          }
          bottom = top;
        }
      }
      ctx.putImageData(image, 0, 0);
    },
    dispose() {},
  };
}

export function terrainRenderer(canvas, world, tiles = [], software = false) {
  const gl = !software && canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (gl) {
    try { return glTerrain(gl, world, tiles); } catch { /* Replace GL canvas before requesting a different context. */ }
    const alternate = document.createElement('canvas'); alternate.className = canvas.className;
    canvas.replaceWith(alternate); canvas = alternate;
  }
  return softwareTerrain(canvas, world);
}
