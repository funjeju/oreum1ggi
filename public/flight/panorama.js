// Rectilinear view into a photographed equirectangular sphere. Yaw is relative to the
// photograph's centre because the source photographs carry no camera heading.
export async function photoViewer(host, url) {
  const image=new Image();image.src=url;await image.decode();
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'});
  if(!gl)return null;
  const vertex='attribute vec2 vertex; varying mediump vec2 at; void main(){at=vertex;gl_Position=vec4(vertex,0.,1.);}';
  const fragment=`
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying mediump vec2 at; uniform vec4 lens; uniform float turn; uniform sampler2D photo;
    void main(){
      vec3 ray=normalize(vec3(at.x*lens.x,at.y*lens.y,1.));
      vec2 yz=vec2(ray.y*lens.z+ray.z*lens.w, ray.z*lens.z-ray.y*lens.w);
      vec2 uv=vec2(fract(.5+(atan(ray.x,yz.y)+turn)/6.2831853),.5-asin(clamp(yz.x,-1.,1.))/3.14159265);
      gl_FragColor=vec4(texture2D(photo,uv).rgb,1.);
    }`;
  const shaders=[vertex,fragment].map((source,index)=>{
    const shader=gl.createShader(index?gl.FRAGMENT_SHADER:gl.VERTEX_SHADER);gl.shaderSource(shader,source);gl.compileShader(shader);return shader;
  });
  const program=gl.createProgram();shaders.forEach(s=>gl.attachShader(program,s));gl.linkProgram(program);
  function release(){gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.remove();}
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){release();return null;}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const v=gl.getAttribLocation(program,'vertex');gl.enableVertexAttribArray(v);gl.vertexAttribPointer(v,2,gl.FLOAT,false,0,0);
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
  for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
  let source=image;
  const limit=gl.getParameter(gl.MAX_TEXTURE_SIZE);
  if(image.width>limit){source=document.createElement('canvas');source.width=limit;source.height=Math.round(limit*image.height/image.width);source.getContext('2d').drawImage(image,0,0,source.width,source.height);}
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,source);
  const lens=gl.getUniformLocation(program,'lens'),turn=gl.getUniformLocation(program,'turn');
  canvas.setAttribute('aria-hidden','true');host.append(canvas);
  return {
    draw(w,h,yaw,pitch){
      const ratio=Math.min(devicePixelRatio||1,1.4,1600/w);
      const cw=Math.round(w*ratio),ch=Math.round(h*ratio);
      if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
      const tanV=Math.tan(Math.min(58,Math.max(37,44*Math.sqrt(h/w)))*Math.PI/180);
      gl.viewport(0,0,cw,ch);gl.uniform4f(lens,tanV*w/h,tanV,Math.cos(pitch),Math.sin(pitch));gl.uniform1f(turn,yaw);gl.drawArrays(gl.TRIANGLES,0,3);
    },
    dispose(){gl.deleteTexture(tex);gl.deleteBuffer(buffer);shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(program);release();},
  };
}
