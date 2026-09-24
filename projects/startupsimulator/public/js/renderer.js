import { OBJECTS, ROOM, TILE_SIZE, project, unproject } from './world.js';

/* ── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  floorA:'#c8b87a', floorB:'#b8a86a', floorGrid:'rgba(0,0,0,0.14)',
  wall:'#d4cba8', wallTop:'#afa880', skirting:'#8a7a58',
  wood:'#a07840', woodD:'#7a5828', woodL:'#c8a060', woodT:'#d8b870',
  deskTop:'#c0984a', monitor:'#1a1a28', monitorB:'#28283a', screen:'#1a3a5a',
  keyboard:'#3a3a4a', mug:'#c84040',
  shelf:'#8a6030', cork:'#c8a860', noteY:'#f8e040', noteB:'#5890e8', noteG:'#58c858',
  cab:'#7a8888', cabD:'#5a6868', cabL:'#aababa',
  sofa:'#8a5840', sofaD:'#5a3828', sofaL:'#aa7858',
  fabric:'#4a6898', fabricD:'#2a4878', fabricL:'#6a88b8',
  leaf:'#3a8a28', leafL:'#5aaa40', leafD:'#286018', stem:'#6a4820',
  pot:'#c87040', potD:'#985030',
  skin:'#e8b080', skinD:'#c88050',
  hair:'#281808', shirt:'#3868b8', shirtD:'#2a508a',
  pants:'#384050', pantsD:'#283040', shoe:'#181008',
  eye:'#181010', eyeW:'#f0e8e0',
  dest:'rgba(255,255,160,0.55)', destRing:'rgba(255,240,80,0.9)',
  hover:'rgba(255,255,200,0.22)', hoverBorder:'rgba(255,240,120,0.75)',
  shadow:'rgba(0,0,0,0.22)',
  bedFrame:'#7a5028', bedFrameD:'#5a3818', bedFrameL:'#a07040',
  mattress:'#d8cfc0', mattressD:'#b8a898',
  pillow:'#f0ece4', pillowD:'#d0c8bc',
  blanket:'#5878a8', blanketD:'#385888', blanketL:'#7898c8',
  pillBottle:'#e8e0d0', pillBottleD:'#c8c0b0', pillBottleCap:'#c84040', pillBottleCapD:'#983030',
  pillA:'#e85898', pillB:'#f8f0e8',
  peptideVial:'#c8f0d8', peptideVialD:'#88c8a0', peptideVialL:'#e8fff0',
  peptideLiq:'#40e870', peptideLiqD:'#28a850', peptideNeedle:'#d0d8e0', peptideNeedleD:'#9098a0',
  vaultTable:'#c8a848', vaultTableD:'#8a7030', vaultTableL:'#e8c860', vaultTableEdge:'#f0d060',
  switchPlate:'#d8d0c0', switchPlateD:'#a89880', switchPlateL:'#f0ece0',
  switchOn:'#f0e040', switchOnG:'#78e040', switchOff:'#484848', switchOffD:'#282828',
  lampBase:'#5a4020', lampBaseD:'#3a2810', lampBaseL:'#8a6030',
  lampPole:'#7a5828', lampPoleL:'#a87840',
  lampShade:'#c87828', lampShadeD:'#8a5018', lampShadeL:'#e8a040', lampShadeRim:'#6a3810',
  lampGlow:'rgba(255,180,60,',  // append alpha + ')'
  genBox:'#2a3a28', genBoxD:'#1a2818', genBoxL:'#3a5038',
  genVent:'#1a2818', genPanel:'#384838', genLed:'#40e840', genLedOff:'#182818',
  genCable:'#181818', genCableD:'#0a0a0a',
  bikeFrame:'#2a3060', bikeFrameD:'#181830', bikeFrameL:'#4a50a0',
  bikeWheel:'#181818', bikeWheelD:'#0a0a0a', bikeWheelL:'#303030',
  bikeSeat:'#1a1a1a', bikeSeatL:'#3a3a3a',
  bikeHandle:'#505050', bikeHandleL:'#787878',
  bikePedal:'#606060', bikePedalL:'#888888',
  // ── Treadmill ───────────────────────────────────────────────────────────
  tmFrame:'#1e2230', tmFrameD:'#0e1018', tmFrameL:'#3a4060',
  tmBelt:'#282828', tmBeltD:'#141414', tmBeltStripe:'#3a3a3a',
  tmDeck:'#303848', tmRail:'#5a6888', tmRailL:'#8090b8',
  tmDisplay:'#0a1420', tmDisplayL:'#1a2840', tmDisplayGreen:'#30e870',
  tmRoller:'#484858', tmRollerL:'#686878',
};

function px(ctx,color,x,y,w,h){
  ctx.fillStyle=color;
  ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
}
function ox(ctx,color,x,y,w,h,lw){
  ctx.strokeStyle=color; ctx.lineWidth=lw||1;
  ctx.strokeRect(Math.round(x)+0.5,Math.round(y)+0.5,Math.round(w)-1,Math.round(h)-1);
}

export class OfficeRenderer {
  constructor(canvas){
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.width=0; this.height=0; this.zoom=1; this.scale=1;
    this.offset={x:0,y:0}; this.hits=[]; this._time=0;
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
  }
  resize(){
    const b=this.canvas.getBoundingClientRect();
    this.width=b.width; this.height=b.height;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(b.width*dpr);
    this.canvas.height=Math.round(b.height*dpr);
    this.dpr=dpr; this.updateCamera();
  }
  updateCamera(){
    const rw=ROOM.width*TILE_SIZE, rh=ROOM.depth*TILE_SIZE;
    const raw=Math.min(this.width/rw,this.height/rh)*this.zoom;
    this.scale=Math.max(1,Math.floor(raw));
    this.offset={
      x:Math.round((this.width -rw*this.scale)/2),
      y:Math.round((this.height-rh*this.scale)/2),
    };
  }
  sp(tx,ty){
    const p=project(tx,ty);
    return{x:Math.round(p.x*this.scale+this.offset.x),
           y:Math.round(p.y*this.scale+this.offset.y)};
  }
  screenPoint(tx,ty,z=0){ return this.sp(tx,ty); }
  floorPoint(sx,sy){
    return unproject((sx-this.offset.x)/this.scale,(sy-this.offset.y)/this.scale);
  }

  /* ── Floor: single flat color, no grid ──────────────────────────────── */
  floor(){
    const ctx=this.ctx, S=this.scale, T=TILE_SIZE*S;
    const tl=this.sp(0,0), W=ROOM.width*T, H=ROOM.depth*T;
    px(ctx,C.wallTop, tl.x, tl.y-T*1.5, W, T*1.5);
    px(ctx,C.wall,    tl.x, tl.y-T*3,   W, T*1.5);
    px(ctx,C.floorA,  tl.x, tl.y, W, H);
    px(ctx,C.skirting, tl.x-S*3, tl.y, S*3, H);
    px(ctx,C.skirting, tl.x, tl.y-S*3, W, S*3);
    ctx.strokeStyle='#181208'; ctx.lineWidth=Math.max(2,S*1.5);
    ctx.strokeRect(tl.x,tl.y,W,H);
  }

  /* ── Object dispatcher ───────────────────────────────────────────────── */
  drawObject(obj,hovered){
    this.hits.push(obj);
    const hot=hovered===obj.id;
    const S=this.scale, T=TILE_SIZE*S;
    const p=this.sp(obj.x,obj.y), W=obj.w*T, H=obj.d*T, ctx=this.ctx;
    px(ctx,C.shadow, p.x+S*2, p.y+S*3, W, H);
    switch(obj.type){
      case 'plant':     this._plant(ctx,p,W,H,S,T,hot); break;
      case 'board':     this._board(ctx,p,W,H,S,T,hot); break;
      case 'cabinet':   this._cabinet(ctx,p,W,H,S,T,hot); break;
      case 'shelf':     this._shelf(ctx,p,W,H,S,T,hot); break;
      case 'desk':      this._desk(ctx,p,W,H,S,T,hot); break;
      case 'desk-small':this._deskSmall(ctx,p,W,H,S,T,hot); break;
      case 'chair':     this._chair(ctx,p,W,H,S,T,hot); break;
      case 'bed':       this._bed(ctx,p,W,H,S,T,hot); break;
      case 'sofa':      this._sofa(ctx,p,W,H,S,T,hot); break;
      case 'table':     this._table(ctx,p,W,H,S,T,hot); break;
      case 'table-vault':this._tableVault(ctx,p,W,H,S,T,hot); break;
      case 'pills':     this._pills(ctx,p,W,H,S,T,hot); break;
      case 'peptide':   this._peptide(ctx,p,W,H,S,T,hot); break;
      case 'light-switch': this._lightSwitch(ctx,p,W,H,S,T,hot); break;
      case 'lamp':         this._lamp(ctx,p,W,H,S,T,hot); break;
      case 'generator':    this._generator(ctx,p,W,H,S,T,hot); break;
      case 'cycling-machine': this._cyclingMachine(ctx,p,W,H,S,T,hot); break;
      case 'cereal':          this._cereal(ctx,p,W,H,S,T,hot); break;
      case 'treadmill':       this._treadmill(ctx,p,W,H,S,T,hot); break;
      case 'phone':           this._phone(ctx,p,W,H,S,T,hot); break;
      default: px(ctx,hot?'#9a8a6a':'#7a6a4a',p.x,p.y,W,H);
    }
    if(hot) ox(ctx,C.hoverBorder,p.x-S,p.y-S,W+S*2,H+S*2,Math.max(2,S*1.2));
  }


  /* ── Plant ───────────────────────────────────────────────────────────── */
  _plant(ctx,p,W,H,S,T,hot){
    const cx=Math.round(p.x+W/2);
    const potY=Math.round(p.y+H*0.56), pW=Math.round(W*0.54), pH=Math.round(H*0.42);
    /* pot shadow */
    px(ctx,C.potD, cx-Math.round(pW*0.5)+S, potY+Math.round(pH*0.38)+S, pW, Math.round(pH*0.65));
    /* pot body */
    px(ctx,C.potD, cx-Math.round(pW*0.5), potY+Math.round(pH*0.38), pW, Math.round(pH*0.65));
    px(ctx,C.pot,  cx-Math.round(pW*0.5), potY, pW, Math.round(pH*0.42));
    /* soil */
    px(ctx,'#2a1808', cx-Math.round(pW*0.42), potY+S, Math.round(pW*0.84), Math.round(S*2));
    /* pot rim highlight */
    px(ctx,'rgba(255,200,150,0.3)', cx-Math.round(pW*0.5), potY, pW, Math.round(S*1.5));
    /* leaves */
    const lc=hot?C.leafL:C.leaf;
    const leaves=[[-0.28,-0.55,0.38,0.38],[0.18,-0.62,0.32,0.35],[-0.42,-0.30,0.28,0.30],[0.08,-0.78,0.22,0.42],[-0.10,-0.88,0.20,0.50]];
    for(const[ox2,oy2,lw,lh] of leaves){
      px(ctx,C.leafD, cx+Math.round(W*ox2)+S, potY+Math.round(H*oy2)+S, Math.round(W*lw), Math.round(H*lh));
      px(ctx,lc,      cx+Math.round(W*ox2),   potY+Math.round(H*oy2),   Math.round(W*lw), Math.round(H*lh));
      /* midrib highlight strip */
      px(ctx,'rgba(255,255,255,0.18)', cx+Math.round(W*(ox2+lw*0.4)), potY+Math.round(H*oy2), Math.round(S*1.2), Math.round(H*lh));
    }
    /* stem */
    px(ctx,C.stem, cx-Math.round(S), potY-Math.round(H*0.35), Math.round(S*2), Math.round(H*0.38));
  }

  /* ── Cork board ──────────────────────────────────────────────────────── */
  _board(ctx,p,W,H,S,T,hot){
    px(ctx,'#4a3820', p.x, p.y, W, H);
    const pad=Math.round(S*3);
    px(ctx,hot?C.cork:'#b89848', p.x+pad, p.y+pad, W-pad*2, H-pad*2);
    /* cork texture dots */
    ctx.fillStyle=C.corkDark||'#a88840';
    for(let i=0;i<14;i++){
      const nx=Math.round(p.x+pad*1.5+((i*137)%(W-pad*3)));
      const ny=Math.round(p.y+pad*1.5+((i*97)%(H-pad*3)));
      px(ctx,'rgba(0,0,0,0.15)',nx,ny,Math.round(S*1.2),Math.round(S*1.2));
    }
    /* sticky notes */
    const notes=[[0.06,0.10,0.28,0.55,C.noteY],[0.38,0.08,0.26,0.50,C.noteB],[0.68,0.12,0.24,0.52,C.noteG],[0.20,0.62,0.22,0.30,C.noteY]];
    for(const[nx,ny,nw,nh,nc] of notes){
      const nX=Math.round(p.x+pad+(W-pad*2)*nx), nY=Math.round(p.y+pad+(H-pad*2)*ny);
      const nW=Math.round((W-pad*2)*nw), nH=Math.round((H-pad*2)*nh);
      /* note shadow */
      px(ctx,'rgba(0,0,0,0.2)', nX+S, nY+S, nW, nH);
      px(ctx,nc, nX, nY, nW, nH);
      px(ctx,'rgba(0,0,0,0.12)', nX, nY+nH-S, nW, S);
      /* lines on note */
      for(let li=1;li<3;li++) px(ctx,'rgba(0,0,0,0.2)',nX+Math.round(S),Math.round(nY+nH*(li/3.5)),nW-Math.round(S*2),Math.max(1,Math.round(S*0.8)));
      /* pin */
      px(ctx,'#e03030', nX+Math.round(nW/2-S), nY-Math.round(S*1.5), Math.round(S*2), Math.round(S*2));
    }
  }

  /* ── Cabinet / coffee machine ────────────────────────────────────────── */
  _cabinet(ctx,p,W,H,S,T,hot){
    px(ctx,C.cabD, p.x, p.y, W, H);
    px(ctx,hot?C.cabL:C.cab, p.x+S, p.y+S, W-S*2, H-S*2);
    const dH=Math.round((H-S*4)/2);
    for(let i=0;i<2;i++){
      const dY=Math.round(p.y+S*2+i*(dH+S));
      px(ctx,C.cabD, p.x+S*2, dY, W-S*4, dH);
      ox(ctx,C.cabL, p.x+S*2, dY, W-S*4, dH);
      /* handle */
      px(ctx,'#e0e8e8', Math.round(p.x+W/2-S*2), Math.round(dY+dH/2-S), Math.round(S*4), Math.round(S*2));
    }
    /* coffee machine detail */
    const mX=Math.round(p.x+S*3), mY=Math.round(p.y+S*2.5);
    px(ctx,'#181818', mX, mY, Math.round(W-S*6), Math.round(dH-S));
    px(ctx,'#c04030', mX+Math.round(S), mY+Math.round(S), Math.round(S*3), Math.round(S*3));
    px(ctx,'rgba(255,255,255,0.15)', mX+Math.round(S*4), mY+Math.round(S), Math.round(S*2), Math.round(S*2));
  }


  /* ── Bookshelf ───────────────────────────────────────────────────────── */
  _shelf(ctx,p,W,H,S,T,hot){
    px(ctx,C.woodD, p.x, p.y, W, H);
    px(ctx,C.shelf, p.x+S, p.y+S, W-S*2, H-S*2);
    const rows=3, rH=Math.round((H-S*4)/rows);
    const bookColors=['#c84040','#4080c8','#e8c030','#50b050','#9050c8','#c87030','#4098b8'];
    let bi=0;
    for(let r=0;r<rows;r++){
      const rY=Math.round(p.y+S*2+r*(rH+S));
      px(ctx,C.woodD, p.x+S, rY+rH-Math.round(S*1.5), W-S*2, Math.round(S*1.5));
      let bx=Math.round(p.x+S*2);
      while(bx<p.x+W-S*4){
        const bw=Math.round(S*(2.5+(bi%3)*0.8));
        const bh=Math.round(rH*(0.55+(bi%5)*0.07));
        const bc=bookColors[bi%bookColors.length];
        px(ctx,bc, bx, rY+rH-Math.round(S*1.5)-bh, bw, bh);
        px(ctx,'rgba(255,255,255,0.2)', bx, rY+rH-Math.round(S*1.5)-bh, Math.round(S*0.8), bh);
        bx+=bw+Math.round(S*0.5); bi++;
      }
    }
  }

  /* ── Main desk ───────────────────────────────────────────────────────── */
  _desk(ctx,p,W,H,S,T,hot){
    px(ctx,C.woodD, p.x, p.y, W, H);
    px(ctx,hot?C.woodL:C.deskTop, p.x+S, p.y+S, W-S*2, H-S*2);
    const mW=Math.round(W*0.52), mH=Math.round(H*0.46);
    const mX=Math.round(p.x+W*0.24), mY=Math.round(p.y+S*2);
    px(ctx,C.monitorB, mX, mY, mW, mH);
    px(ctx,C.screen,   mX+Math.round(S), mY+Math.round(S), mW-Math.round(S*2), mH-Math.round(S*2.5));
    const lc=['#4af8','#8f88','#fa88','#4af8','#fff4'];
    for(let li=0;li<5;li++){
      const lW=Math.round((mW-S*4)*(0.3+(li*37%10)*0.05));
      px(ctx,lc[li%lc.length], mX+Math.round(S*2), mY+Math.round(S*1.5+li*(S*1.8)), lW, Math.max(1,Math.round(S)));
    }
    px(ctx,C.monitorB, Math.round(mX+mW/2-S*1.5), mY+mH, Math.round(S*3), Math.round(S*2));
    px(ctx,C.monitorB, Math.round(mX+mW/2-S*3), mY+mH+Math.round(S*2), Math.round(S*6), Math.round(S*1.5));
    const kW=Math.round(W*0.45), kH=Math.round(S*3.5);
    const kX=Math.round(p.x+W*0.26), kY=Math.round(p.y+H-S*5.5);
    px(ctx,C.keyboard, kX, kY, kW, kH);
    for(let kr=0;kr<3;kr++) for(let kc=0;kc<8;kc++)
      px(ctx,'rgba(255,255,255,0.12)', kX+Math.round(S*(kc*1.1+0.5)), kY+Math.round(S*(kr*1.1+0.3)), Math.round(S*0.8), Math.round(S*0.8));
    const mgX=Math.round(p.x+W*0.08), mgY=Math.round(p.y+H*0.32);
    px(ctx,C.mug,     mgX, mgY, Math.round(S*4), Math.round(S*5));
    px(ctx,'#e8e0d0', mgX+Math.round(S), mgY+Math.round(S), Math.round(S*2), Math.round(S*1.5));
    ox(ctx,C.mug, mgX+Math.round(S*3.5), mgY+Math.round(S*1.5), Math.round(S*2.5), Math.round(S*2));
  }

  /* ── Small desk ──────────────────────────────────────────────────────── */
  _deskSmall(ctx,p,W,H,S,T,hot){
    px(ctx,C.woodD, p.x, p.y, W, H);
    px(ctx,hot?C.woodL:C.deskTop, p.x+S, p.y+S, W-S*2, H-S*2);
    const nW=Math.round(W*0.38), nH=Math.round(H*0.62);
    const nX=Math.round(p.x+W*0.14), nY=Math.round(p.y+S*2);
    px(ctx,'#e8e8f0', nX, nY, nW, nH);
    px(ctx,'#c8c8d8', nX, nY, Math.round(S*2), nH);
    for(let li=1;li<5;li++) px(ctx,'#b8b8c8', nX+Math.round(S*3), Math.round(nY+nH*(li/5.5)), nW-Math.round(S*4), Math.max(1,Math.round(S*0.7)));
    px(ctx,'#2848b8', Math.round(p.x+W*0.62), Math.round(p.y+S*2), Math.round(S*1.5), nH);
    px(ctx,'#c8c8c8', Math.round(p.x+W*0.62), Math.round(p.y+S*2), Math.round(S*1.5), Math.round(S*2));
  }


  /* ── Office chair ────────────────────────────────────────────────────── */
  _chair(ctx,p,W,H,S,T,hot){
    const cx=Math.round(p.x+W/2), cy=Math.round(p.y+H*0.72);
    ctx.strokeStyle='#282838'; ctx.lineWidth=Math.max(2,S*1.5);
    for(let i=0;i<5;i++){
      const a=(i/5)*Math.PI*2-Math.PI/2;
      const ex=Math.round(cx+Math.cos(a)*W*0.38), ey=Math.round(cy+Math.sin(a)*H*0.22);
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(ex,ey); ctx.stroke();
      px(ctx,'#383848', ex-Math.round(S*1.5), ey-Math.round(S), Math.round(S*3), Math.round(S*2));
    }
    px(ctx,'#484858', cx-Math.round(S*1.5), Math.round(p.y+H*0.42), Math.round(S*3), Math.round(H*0.32));
    const sW=Math.round(W*0.78), sH=Math.round(H*0.36);
    const sX=Math.round(cx-sW/2), sY=Math.round(p.y+H*0.38);
    px(ctx,hot?C.fabricL:C.fabricD, sX+S, sY+S, sW, sH);
    px(ctx,hot?C.fabricL:C.fabric,  sX, sY, sW, sH);
    px(ctx,'rgba(255,255,255,0.12)', sX+Math.round(S), sY+Math.round(S), sW-Math.round(S*2), Math.round(sH*0.3));
    ox(ctx,'rgba(0,0,0,0.25)', sX+Math.round(S*2), sY+Math.round(S*2), sW-Math.round(S*4), sH-Math.round(S*4));
    const bW=Math.round(W*0.62), bH=Math.round(H*0.36);
    const bX=Math.round(cx-bW/2), bY=Math.round(p.y+S*2);
    px(ctx,hot?C.fabricL:C.fabricD, bX+S, bY+S, bW, bH);
    px(ctx,hot?C.fabricL:C.fabric,  bX, bY, bW, bH);
    px(ctx,'rgba(255,255,255,0.10)', bX+Math.round(S), bY+Math.round(S), bW-Math.round(S*2), Math.round(bH*0.35));
    ox(ctx,'rgba(0,0,0,0.2)', bX+Math.round(S*2), bY+Math.round(S*2), bW-Math.round(S*4), bH-Math.round(S*4));
  }

  /* ── Sofa ────────────────────────────────────────────────────────────── */
  _sofa(ctx,p,W,H,S,T,hot){
    px(ctx,C.sofaD, p.x+S, p.y+S, W, H);
    px(ctx,hot?C.sofaL:C.sofa, p.x, p.y, W, H);
    const bkH=Math.round(H*0.30);
    px(ctx,hot?'#c09070':C.sofaL, p.x, p.y, W, bkH);
    ox(ctx,'rgba(0,0,0,0.18)', p.x+Math.round(S*2), p.y+Math.round(S*2), W-Math.round(S*4), bkH-Math.round(S*4));
    const cW=Math.round((W-S*5)/2), cH=Math.round(H*0.52), cY=Math.round(p.y+bkH);
    for(let i=0;i<2;i++){
      const cX=Math.round(p.x+S*2.5+i*(cW+S*1.5));
      px(ctx,hot?C.sofaL:'#9a7858', cX, cY, cW, cH);
      px(ctx,'rgba(255,255,255,0.09)', cX+Math.round(S), cY+Math.round(S), cW-Math.round(S*2), Math.round(cH*0.3));
      ox(ctx,'rgba(0,0,0,0.18)', cX+Math.round(S*1.5), cY+Math.round(S*1.5), cW-Math.round(S*3), cH-Math.round(S*3));
    }
    for(const side of[0,1])
      px(ctx,C.sofaL, side===0?p.x:Math.round(p.x+W-S*4), p.y, Math.round(S*4), H);
    px(ctx,'#e07030', Math.round(p.x+W*0.55), Math.round(cY+S*2), Math.round(W*0.2), Math.round(H*0.22));
  }

  /* ── Coffee table ────────────────────────────────────────────────────── */
  _table(ctx,p,W,H,S,T,hot){
    for(const[lx,ly] of[[0.1,0.1],[0.9,0.1],[0.1,0.9],[0.9,0.9]])
      px(ctx,C.woodD, Math.round(p.x+W*lx-S), Math.round(p.y+H*ly-S), Math.round(S*2), Math.round(S*2));
    px(ctx,C.woodD, p.x+Math.round(S), p.y+Math.round(H*0.08), W-Math.round(S*2), Math.round(H*0.76));
    px(ctx,hot?C.woodL:C.woodT, p.x+Math.round(S*2), p.y+Math.round(H*0.12), W-Math.round(S*4), Math.round(H*0.68));
    ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=1;
    for(let g=1;g<4;g++){
      const gX=Math.round(p.x+S*2+g*(W-S*4)/4);
      ctx.beginPath(); ctx.moveTo(gX,Math.round(p.y+H*0.15)); ctx.lineTo(gX,Math.round(p.y+H*0.78)); ctx.stroke();
    }
    for(const[gx,gc] of[[0.28,'#e84040'],[0.62,'#4080e8']]){
      const gX=Math.round(p.x+W*gx), gY=Math.round(p.y+H*0.3);
      const gW=Math.round(S*3.5), gH=Math.round(S*5);
      px(ctx,gc, gX, gY, gW, gH);
      px(ctx,'rgba(255,255,255,0.25)', gX, gY, Math.round(gW*0.35), gH);
    }
  }

  /* ── Vault shortcut table ────────────────────────────────────────────── */
  /* A low, sleek table with a glowing amber edge — clearly jump-able.     */
  _tableVault(ctx,p,W,H,S,T,hot){
    const isWide = W >= H; // horizontal vs vertical orientation
    // Leg studs at corners
    for(const[lx,ly] of[[0.08,0.12],[0.92,0.12],[0.08,0.88],[0.92,0.88]])
      px(ctx,C.vaultTableD, Math.round(p.x+W*lx-S), Math.round(p.y+H*ly-S), Math.round(S*2.2), Math.round(S*2.2));
    // Table body (slightly inset, lower profile than coffee table)
    px(ctx,C.vaultTableD, p.x+S, p.y+Math.round(H*0.10), W-Math.round(S*2), Math.round(H*0.74));
    px(ctx,hot?C.vaultTableL:C.vaultTable, p.x+Math.round(S*2), p.y+Math.round(H*0.14), W-Math.round(S*4), Math.round(H*0.65));
    // Glowing amber edge stripe — the "jump me" indicator
    const edgeAlpha = hot ? 1.0 : 0.75 + Math.sin(this._time / 420) * 0.25;
    ctx.globalAlpha = edgeAlpha;
    if(isWide){
      // Top and bottom amber edge strips
      px(ctx,C.vaultTableEdge, p.x+Math.round(S*2), p.y+Math.round(H*0.14), W-Math.round(S*4), Math.round(S*2));
      px(ctx,C.vaultTableEdge, p.x+Math.round(S*2), p.y+Math.round(H*0.14)+Math.round(H*0.65)-Math.round(S*2), W-Math.round(S*4), Math.round(S*2));
    } else {
      // Left and right amber edge strips
      px(ctx,C.vaultTableEdge, p.x+Math.round(S*2), p.y+Math.round(H*0.14), Math.round(S*2), Math.round(H*0.65));
      px(ctx,C.vaultTableEdge, p.x+Math.round(S*2)+W-Math.round(S*4)-Math.round(S*2), p.y+Math.round(H*0.14), Math.round(S*2), Math.round(H*0.65));
    }
    ctx.globalAlpha = 1;
    // Subtle sheen highlight
    px(ctx,'rgba(255,255,255,0.18)', p.x+Math.round(S*3), p.y+Math.round(H*0.18), W-Math.round(S*6), Math.round(H*0.22));
    // "🤸" hover glyph
    if(hot){
      ctx.save();
      ctx.font='bold '+Math.max(8,Math.round(S*5.5))+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🤸', Math.round(p.x+W/2), Math.round(p.y-Math.round(S*4)));
      ctx.restore();
    }
  }

  /* ── Pills / Medicine shelf ──────────────────────────────────────────── */
  _pills(ctx,p,W,H,S,T,hot){
    const cx=Math.round(p.x+W/2), cy=Math.round(p.y+H/2);
    /* shelf surface */
    px(ctx,C.shelf,    p.x,        p.y+Math.round(H*0.55), W,              Math.round(H*0.45));
    px(ctx,C.woodD,    p.x,        p.y+Math.round(H*0.55), W,              Math.round(S*1.5));
    /* main bottle (centre) */
    const bW=Math.round(W*0.32), bH=Math.round(H*0.62);
    const bX=cx-Math.round(bW/2), bY=Math.round(p.y+H*0.55)-bH;
    px(ctx,C.pillBottleD, bX+S,    bY+S,  bW,              bH);
    px(ctx,hot?C.pillB:C.pillBottle, bX, bY, bW,           bH);
    /* bottle label stripe */
    px(ctx,'rgba(200,64,64,0.35)', bX+Math.round(S), bY+Math.round(bH*0.28), bW-Math.round(S*2), Math.round(bH*0.30));
    /* bottle cap */
    const capH=Math.round(bH*0.18);
    px(ctx,C.pillBottleCapD, bX+S,  bY-capH+S, bW,         capH);
    px(ctx,hot?'#e06060':C.pillBottleCap, bX, bY-capH, bW, capH);
    /* cap highlight */
    px(ctx,'rgba(255,255,255,0.25)', bX+Math.round(S), bY-capH+Math.round(S), Math.round(bW*0.45), Math.round(capH*0.5));
    /* bottle shine */
    px(ctx,'rgba(255,255,255,0.22)', bX+Math.round(S*1.5), bY+Math.round(bH*0.12), Math.round(bW*0.22), Math.round(bH*0.38));
    /* small loose pills scattered on shelf */
    const pills=[
      {x:Math.round(p.x+W*0.10), y:Math.round(p.y+H*0.62), pw:Math.round(S*3.5), ph:Math.round(S*2)},
      {x:Math.round(p.x+W*0.62), y:Math.round(p.y+H*0.65), pw:Math.round(S*3),   ph:Math.round(S*2)},
      {x:Math.round(p.x+W*0.72), y:Math.round(p.y+H*0.58), pw:Math.round(S*3.5), ph:Math.round(S*2)},
    ];
    for(const [i,pl] of pills.entries()){
      px(ctx,i%2===0?C.pillA:C.pillB, pl.x+S, pl.y+S, pl.pw, pl.ph);
      px(ctx,i%2===0?C.pillA:C.pillB, pl.x,   pl.y,   pl.pw, pl.ph);
      /* pill dividing line */
      px(ctx,'rgba(0,0,0,0.18)', Math.round(pl.x+pl.pw/2)-Math.round(S*0.4), pl.y, Math.round(S*0.8), pl.ph);
    }
    /* hover glow cross / plus sign */
    if(hot){
      ctx.save();
      ctx.font='bold '+Math.max(8,Math.round(S*5))+'px sans-serif';
      ctx.fillStyle='rgba(232,88,152,0.9)';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('+',cx,Math.round(p.y-Math.round(S*3)));
      ctx.restore();
    }
  }

  /* ── Peptide shot ────────────────────────────────────────────────────── */
  _peptide(ctx,p,W,H,S,T,hot){
    const cx=Math.round(p.x+W/2), cy=Math.round(p.y+H/2);
    /* shelf surface */
    px(ctx,C.shelf,    p.x, p.y+Math.round(H*0.55), W, Math.round(H*0.45));
    px(ctx,C.woodD,    p.x, p.y+Math.round(H*0.55), W, Math.round(S*1.5));
    /* vial body — tall, narrow, glass */
    const vW=Math.round(W*0.22), vH=Math.round(H*0.68);
    const vX=cx-Math.round(vW/2), vY=Math.round(p.y+H*0.55)-vH;
    /* shadow */
    px(ctx,C.peptideVialD, vX+Math.round(S*1.5), vY+Math.round(S*1.5), vW, vH);
    /* glass body */
    px(ctx,hot?C.peptideVialL:C.peptideVial, vX, vY, vW, vH);
    /* glowing liquid fill (~70%) */
    const liqY=Math.round(vY+vH*0.30);
    const liqH=Math.round(vH*0.65);
    px(ctx,hot?C.peptideLiq:C.peptideLiqD, vX+Math.round(S*0.5), liqY, vW-Math.round(S), liqH);
    /* liquid shimmer */
    px(ctx,'rgba(255,255,255,0.30)', vX+Math.round(S*0.5), liqY+Math.round(S), Math.round(vW*0.35), Math.round(liqH*0.55));
    /* glass shine */
    px(ctx,'rgba(255,255,255,0.45)', vX+Math.round(S*0.5), vY+Math.round(S), Math.round(vW*0.30), Math.round(vH*0.35));
    /* vial rubber stopper (top) */
    const stH=Math.round(vH*0.12);
    px(ctx,'#484840', vX, vY-stH+Math.round(S), vW, stH);
    px(ctx,'#686860', vX, vY-stH, vW, Math.round(stH*0.5));
    /* syringe needle — diagonal, lower right */
    const nX=Math.round(p.x+W*0.62), nY=Math.round(p.y+H*0.52);
    const nL=Math.round(S*5);
    ctx.save();
    ctx.strokeStyle=hot?C.peptideNeedle:C.peptideNeedleD;
    ctx.lineWidth=Math.max(1,Math.round(S*0.9));
    ctx.beginPath();
    ctx.moveTo(nX, nY);
    ctx.lineTo(nX+nL, nY+Math.round(nL*0.7));
    ctx.stroke();
    /* needle tip */
    px(ctx,hot?'#f0f8ff':C.peptideNeedle, nX+nL-Math.round(S), nY+Math.round(nL*0.7)-Math.round(S), Math.round(S*2), Math.round(S*2));
    ctx.restore();
    /* hover glyph — skull + lightning */
    if(hot){
      ctx.save();
      ctx.font='bold '+Math.max(8,Math.round(S*5))+'px sans-serif';
      ctx.fillStyle='rgba(64,232,112,0.95)';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('⚡',cx,Math.round(p.y-Math.round(S*3)));
      ctx.restore();
    }
  }

  /* ── Floor Lamp ──────────────────────────────────────────────────────── */
  /* Top-down view: circular base, thin pole dot, wide lampshade ellipse.  */
  _lamp(ctx,p,W,H,S,T,hot){
    const lampOn = this._lampOn !== false;
    const cx=Math.round(p.x+W/2), cy=Math.round(p.y+H/2);

    /* warm glow pool on the floor when on (drawn first, under everything) */
    if(lampOn && !this.reducedMotion){
      const glowR=Math.round(T*1.6);
      const pulse=0.18+Math.sin(this._time/600)*0.06;
      ctx.globalAlpha=pulse;
      ctx.fillStyle=`rgba(255,180,60,1)`;
      ctx.beginPath();
      ctx.ellipse(cx, cy+Math.round(S*2), glowR, Math.round(glowR*0.55), 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha=1;
    }

    /* base shadow */
    const bR=Math.round(W*0.28);
    px(ctx,C.lampBaseD, cx-bR+S, cy+Math.round(H*0.32)+S, bR*2, Math.round(H*0.24));
    /* base disc */
    ctx.fillStyle=hot?C.lampBaseL:C.lampBase;
    ctx.beginPath();
    ctx.ellipse(cx, cy+Math.round(H*0.36), bR, Math.round(bR*0.45), 0, 0, Math.PI*2);
    ctx.fill();
    /* base highlight rim */
    ctx.globalAlpha=0.3;
    ctx.strokeStyle='rgba(255,220,160,0.8)'; ctx.lineWidth=Math.max(1,S*0.8);
    ctx.beginPath();
    ctx.ellipse(cx, cy+Math.round(H*0.36)-Math.round(S*0.5), bR-Math.round(S), Math.round((bR-Math.round(S))*0.4), 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.globalAlpha=1;

    /* pole (thin vertical bar from base up to shade) */
    const poleW=Math.max(2,Math.round(S*1.5));
    px(ctx,C.lampPole,   cx-Math.round(poleW/2), cy-Math.round(H*0.42), poleW, Math.round(H*0.78));
    px(ctx,C.lampPoleL,  cx-Math.round(poleW/2), cy-Math.round(H*0.42), Math.round(poleW*0.4), Math.round(H*0.78));

    /* shade — wide tapered trapezoid from above */
    const sW=Math.round(W*0.76), sWb=Math.round(W*0.44);
    const sTop=cy-Math.round(H*0.44), sH=Math.round(H*0.38);
    /* shade shadow */
    px(ctx,C.lampShadeD, cx-Math.round(sW/2)+S, sTop+S, sW, sH);
    /* shade body */
    ctx.fillStyle=lampOn?(hot?C.lampShadeL:C.lampShade):(hot?'#6a4820':C.lampShadeD);
    ctx.beginPath();
    ctx.moveTo(cx-Math.round(sW/2), sTop+sH);   // bottom-left
    ctx.lineTo(cx+Math.round(sW/2), sTop+sH);   // bottom-right
    ctx.lineTo(cx+Math.round(sWb/2), sTop);      // top-right
    ctx.lineTo(cx-Math.round(sWb/2), sTop);      // top-left
    ctx.closePath();
    ctx.fill();
    /* shade inner bright area when on */
    if(lampOn){
      const innerAlpha=0.55+Math.sin(this._time/500)*0.1;
      ctx.globalAlpha=innerAlpha;
      ctx.fillStyle='rgba(255,220,100,1)';
      ctx.beginPath();
      ctx.moveTo(cx-Math.round(sWb/2*0.7), sTop+Math.round(sH*0.15));
      ctx.lineTo(cx+Math.round(sWb/2*0.7), sTop+Math.round(sH*0.15));
      ctx.lineTo(cx+Math.round(sW/2*0.55), sTop+Math.round(sH*0.72));
      ctx.lineTo(cx-Math.round(sW/2*0.55), sTop+Math.round(sH*0.72));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha=1;
    }
    /* shade rim (top edge) */
    px(ctx,C.lampShadeRim, cx-Math.round(sWb/2), sTop, sWb, Math.round(S*1.5));
    /* shade rim (bottom edge) */
    px(ctx,C.lampShadeRim, cx-Math.round(sW/2), sTop+sH-Math.round(S*1.5), sW, Math.round(S*1.5));
    /* shade highlight line */
    px(ctx,'rgba(255,255,255,0.18)', cx-Math.round(sW/2)+Math.round(S*2), sTop+Math.round(S), Math.round(sW*0.28), sH-Math.round(S*2));

    /* hover glyph */
    if(hot){
      ctx.save();
      ctx.font='bold '+Math.max(8,Math.round(S*5))+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(lampOn?'🌕':'🌙', Math.round(p.x+W/2), Math.round(p.y-Math.round(S*4)));
      ctx.restore();
    }
  }

  /* ── Generator box ───────────────────────────────────────────────────── */
  /* A squat metal generator unit: ventilation slats, control panel, LED,   */
  /* and a rubber cable snaking right toward the cycling machine.            */
  _generator(ctx,p,W,H,S,T,hot){
    const cx=Math.round(p.x+W/2), cy=Math.round(p.y+H/2);
    /* body shadow */
    px(ctx,C.genBoxD, cx-Math.round(W*0.50)+S*2, cy-Math.round(H*0.28)+S*2, Math.round(W*0.90), Math.round(H*0.72));
    /* main box body */
    px(ctx,hot?C.genBoxL:C.genBox, cx-Math.round(W*0.50), cy-Math.round(H*0.28), Math.round(W*0.90), Math.round(H*0.72));
    /* top face */
    px(ctx,'#3a4e38', cx-Math.round(W*0.50), cy-Math.round(H*0.28), Math.round(W*0.90), Math.round(H*0.18));
    px(ctx,'rgba(255,255,255,0.10)', cx-Math.round(W*0.50), cy-Math.round(H*0.28), Math.round(W*0.90), Math.round(S*1.5));
    /* ventilation slats */
    const ventX=cx-Math.round(W*0.06), ventW=Math.round(W*0.34);
    const ventTop=cy-Math.round(H*0.18), slotH=Math.max(1,Math.round(S*0.8)), slotGap=Math.max(2,Math.round(S*2));
    for(let i=0;i<4;i++){
      px(ctx,C.genVent, ventX, ventTop+i*slotGap, ventW, slotH);
      px(ctx,'rgba(0,0,0,0.5)', ventX, ventTop+i*slotGap, ventW, Math.round(slotH*0.4));
    }
    /* control panel */
    const panX=cx-Math.round(W*0.46), panY=cy-Math.round(H*0.15);
    const panW=Math.round(W*0.34), panH=Math.round(H*0.28);
    px(ctx,C.genPanel, panX, panY, panW, panH);
    px(ctx,'rgba(255,255,255,0.06)', panX, panY, panW, Math.round(S*1.2));
    /* LED indicator with glow halo */
    const ledX=panX+Math.round(panW*0.22), ledY=panY+Math.round(panH*0.22);
    const ledSz=Math.max(2,Math.round(S*1.8));
    ctx.globalAlpha=0.45+Math.sin(this._time/600)*0.2;
    ctx.fillStyle=C.genLed;
    ctx.beginPath();
    ctx.arc(ledX+ledSz/2, ledY+ledSz/2, Math.round(S*3), 0, Math.PI*2);
    ctx.fill(); ctx.globalAlpha=1;
    px(ctx,C.genLed, ledX, ledY, ledSz, ledSz);
    /* dial */
    const dialX=panX+Math.round(panW*0.55), dialY=panY+Math.round(panH*0.18);
    const dialR=Math.max(2,Math.round(S*2.2));
    px(ctx,'#282828', dialX-dialR+S, dialY-dialR+S, dialR*2, dialR*2);
    ctx.strokeStyle='#505050'; ctx.lineWidth=Math.max(1,S*0.8);
    ctx.beginPath(); ctx.arc(dialX, dialY, dialR, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle='#909090'; ctx.lineWidth=Math.max(1,S*0.6);
    ctx.beginPath(); ctx.moveTo(dialX, dialY); ctx.lineTo(dialX+Math.round(dialR*0.8), dialY-Math.round(dialR*0.4)); ctx.stroke();
    /* rubber cable leaving right side toward bike */
    const cableStartX=cx+Math.round(W*0.38), cableY=cy+Math.round(H*0.18);
    ctx.strokeStyle=C.genCableD; ctx.lineWidth=Math.max(3,Math.round(S*2.2));
    ctx.beginPath();
    ctx.moveTo(cableStartX, cableY+Math.round(S));
    ctx.bezierCurveTo(cableStartX+Math.round(T*0.55),cableY+Math.round(S),cableStartX+Math.round(T*0.55),cableY+Math.round(H*0.28),cableStartX+Math.round(T*0.90),cableY+Math.round(H*0.28));
    ctx.stroke();
    ctx.strokeStyle=C.genCable; ctx.lineWidth=Math.max(2,Math.round(S*1.6));
    ctx.beginPath();
    ctx.moveTo(cableStartX, cableY);
    ctx.bezierCurveTo(cableStartX+Math.round(T*0.55),cableY,cableStartX+Math.round(T*0.55),cableY+Math.round(H*0.25),cableStartX+Math.round(T*0.90),cableY+Math.round(H*0.25));
    ctx.stroke();
    /* corner bolts */
    const boltOffs=[[Math.round(W*0.06),Math.round(H*0.08)],[Math.round(W*0.78),Math.round(H*0.08)],[Math.round(W*0.06),Math.round(H*0.68)],[Math.round(W*0.78),Math.round(H*0.68)]];
    for(const[bx,by] of boltOffs){
      const bsz=Math.max(1,Math.round(S*1.2));
      px(ctx,'#181818', cx-Math.round(W*0.50)+bx, cy-Math.round(H*0.28)+by, bsz, bsz);
    }
    /* hover glyph */
    if(hot){
      ctx.save(); ctx.font='bold '+Math.max(8,Math.round(S*5))+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('⚡', Math.round(p.x+W/2), Math.round(p.y-Math.round(S*4)));
      ctx.restore();
    }
  }

  /* ── Cycling machine (stationary exercise bike) ──────────────────────── */
  /* Top-down view: seat at lower-left, handlebars at upper-left, flywheel  */
  /* on the right. Dark blue-grey frame, black flywheel, green display.     */
  _cyclingMachine(ctx,p,W,H,S,T,hot){
    const cx=Math.round(p.x+W/2), cy=Math.round(p.y+H/2);
    const time=this._time;
    const pp=this._pedalPower||0;
    // Flywheel spin: speed scales with pedalPower (rad/ms)
    // At 0 power: essentially stopped. At 100: full spin ~2.5 rotations/s
    const spinSpeed = pp * 0.000025; // rad per ms
    const spokeAngle = (time * spinSpeed) % (Math.PI * 2);
    /* overall shadow */
    px(ctx,C.bikeFrameD, cx-Math.round(W*0.36)+S*2, cy-Math.round(H*0.32)+S*3, Math.round(W*0.72), Math.round(H*0.64));
    /* flywheel — large circle on the right side */
    const fwX=cx+Math.round(W*0.20), fwY=cy-Math.round(H*0.04);
    const fwR=Math.round(Math.min(W,H)*0.28);
    ctx.globalAlpha=0.35; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(fwX+S*2,fwY+S*2,fwR,Math.round(fwR*0.55),0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    ctx.strokeStyle=C.bikeWheelD; ctx.lineWidth=Math.max(3,Math.round(S*3));
    ctx.beginPath(); ctx.ellipse(fwX,fwY,fwR,Math.round(fwR*0.55),0,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle=C.bikeWheelL; ctx.lineWidth=Math.max(2,Math.round(S*2));
    ctx.beginPath(); ctx.ellipse(fwX,fwY,fwR,Math.round(fwR*0.55),0,0,Math.PI*2); ctx.stroke();
    /* hub */
    const hubR=Math.max(2,Math.round(S*2));
    ctx.fillStyle=C.bikeHandle;
    ctx.beginPath(); ctx.ellipse(fwX,fwY,hubR,Math.round(hubR*0.6),0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=C.bikeHandleL;
    ctx.beginPath(); ctx.ellipse(fwX,fwY,Math.max(1,hubR-Math.round(S)),Math.max(1,Math.round((hubR-Math.round(S))*0.6)),0,0,Math.PI*2); ctx.fill();
    /* 4 spokes — rotate with flywheel */
    ctx.strokeStyle='#282828'; ctx.lineWidth=Math.max(1,Math.round(S*0.7));
    for(let i=0;i<4;i++){
      const ang=spokeAngle+(i/4)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(fwX,fwY); ctx.lineTo(fwX+Math.round(Math.cos(ang)*fwR),fwY+Math.round(Math.sin(ang)*fwR*0.55)); ctx.stroke();
    }
    /* wheel sheen */
    ctx.globalAlpha=0.18; ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=Math.max(2,Math.round(S*2));
    ctx.beginPath(); ctx.ellipse(fwX,fwY,fwR-Math.round(S),Math.round((fwR-Math.round(S))*0.55),0,Math.PI*1.1,Math.PI*1.55); ctx.stroke(); ctx.globalAlpha=1;
    /* main frame tubes */
    const frameColor=hot?C.bikeFrameL:C.bikeFrame;
    ctx.strokeStyle=frameColor; ctx.lineWidth=Math.max(3,Math.round(S*2.8));
    /* down-tube: seat to flywheel */
    ctx.beginPath(); ctx.moveTo(cx-Math.round(W*0.26),cy+Math.round(H*0.22)); ctx.lineTo(fwX,fwY); ctx.stroke();
    /* top-tube: seat to handlebar */
    ctx.beginPath(); ctx.moveTo(cx-Math.round(W*0.26),cy+Math.round(H*0.22)); ctx.lineTo(cx-Math.round(W*0.14),cy-Math.round(H*0.26)); ctx.stroke();
    /* stem */
    ctx.beginPath(); ctx.moveTo(cx-Math.round(W*0.14),cy-Math.round(H*0.26)); ctx.lineTo(cx-Math.round(W*0.06),cy-Math.round(H*0.12)); ctx.stroke();
    /* seat */
    const seatX=cx-Math.round(W*0.26), seatY=cy+Math.round(H*0.24);
    const sW=Math.round(W*0.28), sH=Math.max(3,Math.round(H*0.16));
    px(ctx,C.bikeSeat, seatX-Math.round(sW/2)+S, seatY-Math.round(sH/2)+S, sW, sH);
    px(ctx,hot?C.bikeSeatL:C.bikeSeat, seatX-Math.round(sW/2), seatY-Math.round(sH/2), sW, sH);
    /* seat post */
    ctx.strokeStyle=C.bikeFrameD; ctx.lineWidth=Math.max(2,Math.round(S*1.4));
    ctx.beginPath(); ctx.moveTo(seatX,seatY); ctx.lineTo(seatX+Math.round(S*2),seatY+Math.round(H*0.08)); ctx.stroke();
    /* handlebars */
    const hbX=cx-Math.round(W*0.14), hbY=cy-Math.round(H*0.28);
    const hbW=Math.round(W*0.38);
    px(ctx,C.bikeHandle, hbX-Math.round(hbW/2)+S, hbY+S, hbW, Math.max(2,Math.round(S*1.8)));
    px(ctx,hot?C.bikeHandleL:C.bikeHandle, hbX-Math.round(hbW/2), hbY, hbW, Math.max(2,Math.round(S*1.8)));
    const gripW=Math.max(2,Math.round(S*2.5)), gripH=Math.max(3,Math.round(S*3.5));
    px(ctx,'#282828', hbX-Math.round(hbW/2)-Math.round(gripW*0.4), hbY-Math.round(gripH*0.3), gripW, gripH);
    px(ctx,'#282828', hbX+Math.round(hbW/2)-Math.round(gripW*0.6), hbY-Math.round(gripH*0.3), gripW, gripH);
    px(ctx,'#484848', hbX-Math.round(hbW/2)-Math.round(gripW*0.4), hbY-Math.round(gripH*0.3), Math.round(gripW*0.5), gripH);
    px(ctx,'#484848', hbX+Math.round(hbW/2)-Math.round(gripW*0.6), hbY-Math.round(gripH*0.3), Math.round(gripW*0.5), gripH);
    /* pedals */
    const pdY=fwY+Math.round(H*0.24);
    const pdW=Math.max(2,Math.round(S*3.5)), pdH=Math.max(1,Math.round(S*1.8));
    px(ctx,C.bikePedal, fwX-Math.round(W*0.22), pdY, pdW, pdH);
    px(ctx,C.bikePedalL, fwX-Math.round(W*0.22), pdY, Math.round(pdW*0.5), Math.round(pdH*0.5));
    px(ctx,C.bikePedal, fwX+Math.round(W*0.10), pdY-Math.round(S*2), pdW, pdH);
    px(ctx,C.bikePedalL, fwX+Math.round(W*0.10), pdY-Math.round(S*2), Math.round(pdW*0.5), Math.round(pdH*0.5));
    /* cable port */
    const portX=cx-Math.round(W*0.44), portY=cy+Math.round(H*0.10);
    const portW=Math.max(3,Math.round(S*3)), portH=Math.max(2,Math.round(S*2));
    px(ctx,'#101010', portX+S, portY+S, portW, portH);
    px(ctx,'#383838', portX, portY, portW, portH);
    px(ctx,'rgba(255,255,255,0.15)', portX, portY, portW, Math.round(S));
    /* display panel */
    const dpX=cx-Math.round(W*0.12), dpY=cy-Math.round(H*0.20);
    const dpW=Math.max(4,Math.round(S*5)), dpH=Math.max(3,Math.round(S*3.5));
    px(ctx,'#101820', dpX+S, dpY+S, dpW, dpH);
    px(ctx,'#182838', dpX, dpY, dpW, dpH);
    // Display brightness and colour reflect pedal power and breakdown state:
    // broken → rapid red flash; triple → yellow; double → lime; normal → green; idle → slow green
    const broken = this._bikeBreakdown > 0;
    const dpPulseSpeed = broken ? 150 : Math.max(200, 700 - pp * 5);
    const dpAlpha = (pp > 25 ? 0.85 : 0.7) + Math.sin(time/dpPulseSpeed)*0.15;
    const dpCol = broken ? '#e84040' : pp >= 75 ? '#f0e040' : pp >= 50 ? '#a0f040' : pp >= 25 ? '#40e870' : '#20c040';
    ctx.globalAlpha=Math.max(0.1,Math.min(1,dpAlpha));
    px(ctx,dpCol, dpX+Math.round(S), dpY+Math.round(S), Math.round(dpW*0.55), Math.round(dpH*0.55));
    ctx.globalAlpha=1;
    /* hover glyph */
    if(hot){
      ctx.save(); ctx.font='bold '+Math.max(8,Math.round(S*5))+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🚴', Math.round(p.x+W/2), Math.round(p.y-Math.round(S*5)));
      ctx.restore();
    }
  }

  /* ── Treadmill ───────────────────────────────────────────────────────── */
  /* Top-down view: long flat deck, two side rails, rollers at each end,   */
  /* animated belt stripes, and a display console at the back.             */
  _treadmill(ctx,p,W,H,S,T,hot){
    const cx=Math.round(p.x+W/2), cy=Math.round(p.y+H/2);
    const time=this._time;
    const sessions=this._treadmillSessions||0;

    /* ── Main deck shadow ── */
    px(ctx,C.tmFrameD, p.x+Math.round(S*2), p.y+Math.round(H*0.18)+Math.round(S*2), W-Math.round(S*2), Math.round(H*0.62));

    /* ── Deck surface (the flat running platform) ── */
    px(ctx,hot?C.tmFrameL:C.tmFrame, p.x, p.y+Math.round(H*0.18), W, Math.round(H*0.62));
    /* deck face highlight */
    px(ctx,C.tmDeck, p.x+Math.round(S), p.y+Math.round(H*0.22), W-Math.round(S*2), Math.round(H*0.54));

    /* ── Animated belt stripes (scroll forward = downward in top-down) ── */
    const beltX=p.x+Math.round(S*2), beltW=W-Math.round(S*4);
    const beltY=p.y+Math.round(H*0.25), beltH=Math.round(H*0.48);
    px(ctx,C.tmBelt, beltX, beltY, beltW, beltH);
    /* scrolling stripes — speed up when player is actively running */
    const stripeCount=4, stripeH=Math.max(1,Math.round(S*1.5));
    const runSpeed=this._isTreadmilling?(1+(this._runPower||0)/50):1;
    const beltScroll=this.reducedMotion?0:(time/180*runSpeed)%1;
    for(let i=0;i<stripeCount+1;i++){
      const rawY=beltY+((i/stripeCount+beltScroll)%1)*beltH;
      const sy=Math.round(rawY);
      if(sy>=beltY&&sy+stripeH<=beltY+beltH){
        px(ctx,C.tmBeltStripe, beltX, sy, beltW, stripeH);
      }
    }
    /* belt surface sheen */
    px(ctx,'rgba(255,255,255,0.06)', beltX, beltY, beltW, Math.round(S*2));

    /* ── Front roller (bottom edge of deck) ── */
    const rollerH=Math.max(3,Math.round(S*3));
    const rollerY=p.y+Math.round(H*0.73);
    px(ctx,C.tmRollerL, p.x, rollerY, W, rollerH);
    px(ctx,'rgba(255,255,255,0.18)', p.x+Math.round(S), rollerY, W-Math.round(S*2), Math.round(rollerH*0.4));

    /* ── Back roller (top edge of deck, partially behind console) ── */
    const backRollerY=p.y+Math.round(H*0.18);
    px(ctx,C.tmRoller, p.x, backRollerY, W, Math.round(S*3));

    /* ── Side rails (two handrails running along each long edge) ── */
    const railW=Math.max(3,Math.round(S*3));
    const railY=p.y+Math.round(H*0.06), railH=Math.round(H*0.70);
    /* left rail shadow */
    px(ctx,C.tmFrameD, p.x+Math.round(S*1.5), railY+Math.round(S), railW, railH);
    /* left rail */
    px(ctx,hot?C.tmRailL:C.tmRail, p.x+Math.round(S*1.5), railY, railW, railH);
    px(ctx,'rgba(255,255,255,0.20)', p.x+Math.round(S*1.5), railY, railW, Math.round(railH*0.12));
    /* right rail shadow */
    px(ctx,C.tmFrameD, W+p.x-Math.round(S*4)+Math.round(S), railY+Math.round(S), railW, railH);
    /* right rail */
    px(ctx,hot?C.tmRailL:C.tmRail, W+p.x-Math.round(S*4), railY, railW, railH);
    px(ctx,'rgba(255,255,255,0.20)', W+p.x-Math.round(S*4), railY, railW, Math.round(railH*0.12));

    /* ── Console / display panel (top of treadmill, against wall) ── */
    const conW=Math.round(W*0.60), conH=Math.max(4,Math.round(H*0.20));
    const conX=cx-Math.round(conW/2), conY=p.y;
    /* console shadow */
    px(ctx,C.tmFrameD, conX+Math.round(S), conY+Math.round(S), conW, conH);
    /* console body */
    px(ctx,hot?C.tmFrameL:C.tmFrame, conX, conY, conW, conH);
    /* display screen */
    const scrW=Math.round(conW*0.72), scrH=Math.max(3,Math.round(conH*0.60));
    const scrX=conX+Math.round((conW-scrW)/2), scrY=conY+Math.round((conH-scrH)/2);
    px(ctx,C.tmDisplay, scrX+Math.round(S), scrY+Math.round(S), scrW, scrH);
    px(ctx,hot?C.tmDisplayL:C.tmDisplay, scrX, scrY, scrW, scrH);
    /* display readout — green bar showing session count progress */
    if(sessions>0){
      const barW=Math.round(scrW*Math.min(1,sessions/10)*0.88);
      const barH=Math.max(2,Math.round(scrH*0.55));
      const pulse=this.reducedMotion?0.85:0.7+Math.sin(time/300)*0.3;
      ctx.globalAlpha=pulse;
      px(ctx,C.tmDisplayGreen, scrX+Math.round(scrW*0.06), scrY+Math.round(scrH*0.22), barW, barH);
      ctx.globalAlpha=1;
    }
    /* screen sheen */
    px(ctx,'rgba(255,255,255,0.10)', scrX+Math.round(S), scrY+Math.round(S), Math.round(scrW*0.4), Math.round(scrH*0.35));

    /* ── Hover glyph ── */
    if(hot){
      ctx.save();
      ctx.font='bold '+Math.max(8,Math.round(S*5))+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🏃', Math.round(p.x+W/2), Math.round(p.y-Math.round(S*4)));
      ctx.restore();
    }
  }

  /* ── Delivery Phone ──────────────────────────────────────────────────── */
  /* A battered wall-mount phone/tablet holder for ordering food delivery. */
  _phone(ctx,p,W,H,S,T,hot){
    const cx=Math.round(p.x+W/2), cy=Math.round(p.y+H/2);
    const time=this._time||0;

    /* wall-backing plate shadow */
    px(ctx,'rgba(0,0,0,0.3)', cx-Math.round(W*0.28)+S, cy-Math.round(H*0.42)+S, Math.round(W*0.56), Math.round(H*0.84));
    /* wall-backing plate */
    px(ctx,hot?'#3a3030':'#2a2020', cx-Math.round(W*0.28), cy-Math.round(H*0.42), Math.round(W*0.56), Math.round(H*0.84));
    /* backing plate highlight */
    px(ctx,'rgba(255,255,255,0.10)', cx-Math.round(W*0.28), cy-Math.round(H*0.42), Math.round(W*0.56), Math.round(S*1.5));

    /* phone body shadow */
    const phW=Math.round(W*0.38), phH=Math.round(H*0.68);
    const phX=cx-Math.round(phW/2), phY=cy-Math.round(phH*0.46);
    px(ctx,'rgba(0,0,0,0.45)', phX+S, phY+S, phW, phH);
    /* phone body */
    px(ctx,hot?'#505060':'#383848', phX, phY, phW, phH);
    /* phone body top edge highlight */
    px(ctx,'rgba(255,255,255,0.18)', phX, phY, phW, Math.round(S*1.5));
    /* phone body side highlight */
    px(ctx,'rgba(255,255,255,0.10)', phX, phY, Math.round(S*1.2), phH);

    /* screen bezel */
    const bezW=Math.round(phW*0.84), bezH=Math.round(phH*0.74);
    const bezX=phX+Math.round((phW-bezW)/2), bezY=phY+Math.round(phH*0.08);
    px(ctx,'#0a0a14', bezX, bezY, bezW, bezH);

    /* screen glow — pulses softly when not hovered; lights up when hovered */
    const glowAlpha=hot
      ? 0.92
      : this.reducedMotion ? 0.55 : 0.48+Math.sin(time/900)*0.14;
    ctx.globalAlpha=glowAlpha;
    /* screen background gradient feel — just a solid fill with a tint layer */
    px(ctx,'#0a1428', bezX+Math.round(S*0.5), bezY+Math.round(S*0.5), bezW-Math.round(S), bezH-Math.round(S));
    ctx.globalAlpha=1;

    /* app UI — pizza icon centred on screen */
    ctx.save();
    ctx.font='bold '+Math.max(6,Math.round(S*3.8))+'px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.globalAlpha=hot ? 1.0 : (this.reducedMotion ? 0.7 : 0.55+Math.sin(time/900)*0.15);
    ctx.fillText('\ud83d\udecd\ufe0f', Math.round(bezX+bezW/2), Math.round(bezY+bezH*0.38));
    ctx.globalAlpha=1;
    /* tiny "ORDER" text bar at bottom of screen */
    const barH=Math.max(2,Math.round(S*2.2));
    const barY=bezY+bezH-barH-Math.round(S*0.5);
    px(ctx,hot?'#e84040':'#882020', bezX+Math.round(S*0.5), barY, bezW-Math.round(S), barH);
    ctx.font=Math.max(4,Math.round(S*1.8))+'px sans-serif';
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.fillText('ORDER', Math.round(bezX+bezW/2), Math.round(barY+barH/2));
    ctx.restore();

    /* screen shine top-left */
    px(ctx,'rgba(255,255,255,0.12)', bezX+Math.round(S), bezY+Math.round(S), Math.round(bezW*0.38), Math.round(bezH*0.22));

    /* home button circle at bottom of phone */
    const btnR=Math.max(2,Math.round(S*1.8));
    const btnCx=cx, btnCy=phY+phH-Math.round(S*2.5);
    ctx.beginPath();
    ctx.arc(btnCx, btnCy, btnR, 0, Math.PI*2);
    ctx.fillStyle=hot?'#7080a0':'#484858';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(btnCx, btnCy, Math.round(btnR*0.55), 0, Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.25)';
    ctx.fill();

    /* cable hanging off bottom */
    const cableTopX=Math.round(phX+phW*0.42), cableTopY=phY+phH;
    const cableBotX=cableTopX+Math.round(S*1.5), cableBotY=cableTopY+Math.round(S*5);
    ctx.beginPath();
    ctx.moveTo(cableTopX, cableTopY);
    ctx.bezierCurveTo(cableTopX, cableTopY+Math.round(S*2.5), cableBotX, cableTopY+Math.round(S*2.5), cableBotX, cableBotY);
    ctx.strokeStyle='#181818';
    ctx.lineWidth=Math.max(1,Math.round(S*1.2));
    ctx.stroke();

    /* hover emoji */
    if(hot){
      ctx.save();
      ctx.font='bold '+Math.max(8,Math.round(S*5))+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('\ud83c\udf55', Math.round(p.x+W/2), Math.round(p.y-Math.round(S*4)));
      ctx.restore();
    }
  }

  /* ── Light Switch ────────────────────────────────────────────────────── */
  /* A wall-mounted rocker switch with a glowing indicator.               */
  _lightSwitch(ctx,p,W,H,S,T,hot){
    const lightsOn = this._lightOn !== false; // read the current state
    const cx=Math.round(p.x+W/2), cy=Math.round(p.y+H/2);
    /* wall-mount base / shadow */
    px(ctx,C.switchPlateD, cx-Math.round(W*0.32)+S, cy-Math.round(H*0.38)+S, Math.round(W*0.64), Math.round(H*0.76));
    /* face-plate */
    px(ctx,hot?C.switchPlateL:C.switchPlate, cx-Math.round(W*0.32), cy-Math.round(H*0.38), Math.round(W*0.64), Math.round(H*0.76));
    /* plate edge highlight */
    px(ctx,'rgba(255,255,255,0.3)', cx-Math.round(W*0.32), cy-Math.round(H*0.38), Math.round(W*0.64), Math.round(S*1.5));
    /* rocker (toggle body) */
    const rW=Math.round(W*0.34), rH=Math.round(H*0.46);
    const rX=cx-Math.round(rW/2), rY=cy-Math.round(rH/2);
    px(ctx,'#1a1a1a', rX+S, rY+S, rW, rH); // rocker shadow
    px(ctx,lightsOn?'#585858':'#282828', rX, rY, rW, rH);
    /* raised nub on whichever side is "on" */
    if(lightsOn){
      /* top half raised (on) */
      px(ctx,'#888888', rX+Math.round(S), rY+Math.round(S), rW-Math.round(S*2), Math.round(rH*0.46));
      px(ctx,'rgba(255,255,255,0.22)', rX+Math.round(S*1.5), rY+Math.round(S*1.5), rW-Math.round(S*4), Math.round(rH*0.18));
    } else {
      /* bottom half raised (off) */
      px(ctx,'#3a3a3a', rX+Math.round(S), Math.round(rY+rH*0.52), rW-Math.round(S*2), Math.round(rH*0.46));
    }
    /* LED indicator dot */
    const ledX=cx-Math.round(S), ledY=Math.round(p.y+H*0.80)-Math.round(S*2);
    if(lightsOn){
      /* glow halo */
      ctx.globalAlpha=0.35+Math.sin(this._time/400)*0.15;
      ctx.fillStyle=C.switchOnG;
      ctx.beginPath();
      ctx.arc(ledX+Math.round(S), ledY+Math.round(S), Math.round(S*3.5), 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha=1;
      px(ctx,C.switchOnG, ledX-Math.round(S*1.5), ledY-Math.round(S*1.5), Math.round(S*3), Math.round(S*3));
    } else {
      px(ctx,'#281808', ledX-Math.round(S*1.5), ledY-Math.round(S*1.5), Math.round(S*3), Math.round(S*3));
    }
    /* hover label */
    if(hot){
      ctx.save();
      ctx.font='bold '+Math.max(8,Math.round(S*5))+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(lightsOn?'💡':'🌑', Math.round(p.x+W/2), Math.round(p.y-Math.round(S*4)));
      ctx.restore();
    }
  }

  /* ── Cereal Station ──────────────────────────────────────────────────── */
  _cereal(ctx,p,W,H,S,T,hot){
    const stock=this._cerealStock||0;
    /* counter top / surface */
    px(ctx,'#5a3820', p.x+S, p.y+S, W, H);
    px(ctx,hot?'#c8a060':'#a07840', p.x, p.y, W, H);
    /* surface edge highlight */
    px(ctx,'rgba(255,255,255,0.18)', p.x, p.y, W, Math.round(S*1.5));
    /* counter lip / front edge */
    px(ctx,'#7a5830', p.x, Math.round(p.y+H-Math.round(S*2)), W, Math.round(S*2));

    /* bowl on the left side of counter */
    const bowlCx=Math.round(p.x+W*0.18), bowlCy=Math.round(p.y+H*0.55);
    const bowlR=Math.round(S*3.5);
    ctx.beginPath();
    ctx.arc(bowlCx, bowlCy, bowlR, 0, Math.PI*2);
    ctx.fillStyle=hot?'#f0e8d8':'#ddd0b8';
    ctx.fill();
    /* bowl inner shadow */
    ctx.beginPath();
    ctx.arc(bowlCx, bowlCy, Math.round(bowlR*0.72), 0, Math.PI*2);
    ctx.fillStyle=stock>0?'rgba(248,220,120,0.9)':'rgba(80,60,40,0.35)';
    ctx.fill();
    /* milk splash / cereal bits when stocked */
    if(stock>0){
      ctx.fillStyle='rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(Math.round(bowlCx-Math.round(S*1.2)), Math.round(bowlCy-Math.round(S*0.8)), Math.round(S*0.9), 0, Math.PI*2);
      ctx.fill();
      /* cereal O bits */
      const bits=[{x:-1.0,y:0.6},{x:0.5,y:-1.1},{x:1.2,y:0.3}];
      for(const b of bits){
        const bx=Math.round(bowlCx+b.x*S*1.5), by=Math.round(bowlCy+b.y*S*1.5);
        ctx.beginPath();
        ctx.arc(bx, by, Math.round(S*0.85), 0, Math.PI*2);
        ctx.fillStyle='rgba(210,140,40,0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by, Math.round(S*0.45), 0, Math.PI*2);
        ctx.fillStyle='rgba(248,220,120,0.9)';
        ctx.fill();
      }
    }

    /* cereal boxes — up to 3, standing on counter */
    const boxColors=['#e04040','#3898e0','#e8c030'];
    const boxLabels=['🌀','★','⚡'];
    const totalBoxes=3;
    const boxW=Math.round(W*0.16), boxH=Math.round(H*0.72);
    for(let i=0;i<totalBoxes;i++){
      const bx=Math.round(p.x+W*0.38+i*(boxW+Math.round(S*1.8)));
      const by=Math.round(p.y+H*0.12)-Math.round(boxH*0.5);
      const present=stock>i;
      const col=present?boxColors[i]:'#3a3030';
      /* box shadow */
      px(ctx,'rgba(0,0,0,0.25)', bx+S, by+S, boxW, boxH);
      /* box body */
      px(ctx,col, bx, by, boxW, boxH);
      /* box front panel */
      px(ctx,present?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.15)', bx+Math.round(S*0.8), by+Math.round(boxH*0.15), Math.round(boxW*0.7), Math.round(boxH*0.55));
      /* box top flap */
      px(ctx,present?'rgba(0,0,0,0.2)':'rgba(0,0,0,0.35)', bx, by, boxW, Math.round(boxH*0.14));
      /* box shine */
      px(ctx,'rgba(255,255,255,0.2)', bx+Math.round(S*0.5), by+Math.round(S*0.5), Math.round(S*1.2), Math.round(boxH*0.5));
      /* label glyph */
      if(present){
        ctx.save();
        ctx.font='bold '+Math.max(7,Math.round(S*2.8))+'px sans-serif';
        ctx.fillStyle='rgba(255,255,255,0.9)';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(boxLabels[i], Math.round(bx+boxW/2), Math.round(by+boxH*0.46));
        ctx.restore();
      }
    }

    /* hover glyph */
    if(hot){
      ctx.save();
      ctx.font='bold '+Math.max(8,Math.round(S*5))+'px sans-serif';
      ctx.fillStyle='rgba(255,200,40,0.95)';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(stock>0?'🥣':'🛒', Math.round(p.x+W/2), Math.round(p.y-Math.round(S*4)));
      ctx.restore();
    }
  }

  /* ── Bed ─────────────────────────────────────────────────────────────── */
  _bed(ctx,p,W,H,S,T,hot){
    /* bed frame (wooden border) */
    px(ctx,C.bedFrameD, p.x+S*2, p.y+S*2, W, H);
    px(ctx,hot?C.bedFrameL:C.bedFrame, p.x, p.y, W, H);
    /* headboard – top edge, taller bar */
    const hbH=Math.round(H*0.28);
    px(ctx,C.bedFrameD, p.x+S, p.y+S, W-S*2, hbH);
    px(ctx,hot?C.bedFrameL:C.bedFrame, p.x+S, p.y, W-S*2, hbH);
    /* headboard panel detail */
    px(ctx,'rgba(255,255,255,0.15)', p.x+Math.round(S*3), p.y+Math.round(S*1.5), W-Math.round(S*6), Math.round(hbH*0.45));
    /* footboard – bottom edge, shorter bar */
    const fbH=Math.round(H*0.14);
    px(ctx,C.bedFrameD, p.x+S, Math.round(p.y+H-fbH)+S, W-S*2, fbH);
    px(ctx,hot?C.bedFrameL:C.bedFrame, p.x+S, Math.round(p.y+H-fbH), W-S*2, fbH);
    /* mattress */
    const mX=p.x+Math.round(S*2), mY=p.y+hbH, mW=W-Math.round(S*4), mH=Math.round(H-hbH-fbH);
    px(ctx,C.mattressD, mX+S, mY+S, mW, mH);
    px(ctx,C.mattress,  mX, mY, mW, mH);
    /* mattress seam lines */
    ctx.strokeStyle='rgba(0,0,0,0.10)'; ctx.lineWidth=Math.max(1,Math.round(S*0.7));
    for(let i=1;i<3;i++){
      const lY=Math.round(mY+mH*(i/3));
      ctx.beginPath(); ctx.moveTo(mX+Math.round(S*2),lY); ctx.lineTo(mX+mW-Math.round(S*2),lY); ctx.stroke();
    }
    /* blanket (covers lower ~55% of mattress) */
    const blY=Math.round(mY+mH*0.32), blH=Math.round(mH*0.62);
    px(ctx,C.blanketD, mX+S, blY+S, mW, blH);
    px(ctx,hot?C.blanketL:C.blanket, mX, blY, mW, blH);
    /* blanket fold/turnover at top edge */
    px(ctx,hot?C.blanketL:C.mattress, mX, blY, mW, Math.round(blH*0.14));
    /* blanket highlight */
    px(ctx,'rgba(255,255,255,0.12)', mX+Math.round(S*2), blY+Math.round(blH*0.16), mW-Math.round(S*4), Math.round(blH*0.18));
    /* pillow (left side of mattress, top area) */
    const plW=Math.round(mW*0.40), plH=Math.round(mH*0.30);
    const plX=mX+Math.round(S*3), plY=mY+Math.round(S*2);
    px(ctx,C.pillowD, plX+S, plY+S, plW, plH);
    px(ctx,C.pillow,  plX, plY, plW, plH);
    px(ctx,'rgba(255,255,255,0.30)', plX+Math.round(S), plY+Math.round(S), Math.round(plW*0.45), Math.round(plH*0.38));
    ox(ctx,'rgba(0,0,0,0.12)', plX+Math.round(S*1.5), plY+Math.round(S*1.5), plW-Math.round(S*3), plH-Math.round(S*3));
    /* side rails */
    px(ctx,C.bedFrame, p.x, mY, Math.round(S*2), mH);
    px(ctx,C.bedFrame, Math.round(p.x+W-S*2), mY, Math.round(S*2), mH);
    /* small "zzz" hint when hot */
    if(hot){
      ctx.save();
      ctx.font='bold '+Math.max(6,Math.round(S*4.5))+'px sans-serif';
      ctx.fillStyle='rgba(180,200,255,0.85)';
      ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      const zx=Math.round(p.x+W*0.72), zy=Math.round(p.y-Math.round(S*2));
      ctx.fillText('z',zx,zy);
      ctx.font='bold '+Math.max(5,Math.round(S*3.5))+'px sans-serif';
      ctx.fillText('z',zx+Math.round(S*5),zy-Math.round(S*3));
      ctx.font='bold '+Math.max(4,Math.round(S*2.5))+'px sans-serif';
      ctx.fillText('z',zx+Math.round(S*9),zy-Math.round(S*5.5));
      ctx.restore();
    }
  }

  /* ── Character: pixel-art top-down sprite ────────────────────────────── */
  character(founder,dir,moving,time,jumpHeight=0,isSprinting=false,sitting=false,recline=0,isDancing=false){
    const ctx=this.ctx, S=this.scale, T=TILE_SIZE*S;
    const p=this.sp(founder.x,founder.y);
    // Jump: lift the sprite up (in isometric: up-left = higher z)
    const jumpOffsetY = Math.round(jumpHeight * S * TILE_SIZE * 0.5 / TILE_SIZE * 2);
    const cx=Math.round(p.x+T/2), cy=Math.round(p.y+T/2) - jumpOffsetY;

    /* helper: draw one "pixel" of the sprite, offset from character center */
    const r=(color,dx,dy,w,h)=>
      px(ctx,color,cx+Math.round(dx*S),cy+Math.round(dy*S),Math.round(w*S)||1,Math.round(h*S)||1);

    /* ── SEATED pose ──────────────────────────────────────────────────── */
    if(sitting){
      // recline drives how far back the character leans: 0=upright, 1=flat
      const rl = recline; // shorthand

      /* ground shadow — widens slightly when fully reclined */
      ctx.globalAlpha=0.15; ctx.fillStyle='#000';
      ctx.beginPath();
      ctx.ellipse(cx, cy+Math.round(S*6), Math.round(S*(6+rl*2)), Math.round(S*2.2), 0, 0, Math.PI*2);
      ctx.fill(); ctx.globalAlpha=1;

      // As we recline: torso lifts up the screen (negative dy), body widens & squishes
      // Legs go from hanging down to kicking up (footrest extends)
      const bodyRise   = rl * 5.5;  // torso travels up
      const legRise    = rl * 9.0;  // feet kick up a lot
      const legSpread  = rl * 3.0;  // feet spread apart when raised
      const bodyFlatten = rl * 1.8; // body gets a bit wider/shorter as it reclines

      /* legs / thighs */
      r(C.pants, -5.5 - legSpread*0.5,  3.0 - legRise*0.35, 4.5 + bodyFlatten, 2.2);
      r(C.pants,  0.5 + legSpread*0.5,  3.0 - legRise*0.35, 4.5 + bodyFlatten, 2.2);
      /* feet */
      r(C.shoe, -6.5 - legSpread, 3.2 - legRise, 2.5, 1.8);
      r(C.shoe,  4.5 + legSpread, 3.2 - legRise, 2.5, 1.8);

      /* body / shirt */
      r(C.shirtD, -2.8 - bodyFlatten*0.5, -4.2 - bodyRise, 6.2 + bodyFlatten, 6.5);
      r(C.shirt,  -3.0 - bodyFlatten*0.5, -4.8 - bodyRise, 6.2 + bodyFlatten, 6.5);
      r('rgba(255,255,255,0.18)', -2.5, -4.8 - bodyRise, 5.2 + bodyFlatten, 1.5);
      r(C.skin, -1.0, -5.0 - bodyRise, 2.5, 1.8); /* collar */

      /* arms — follow body back */
      r(C.shirt, -5.5, -3.5 - bodyRise, 2.2, 4.0);
      r(C.skin,  -5.5,  0.2 - bodyRise*0.6, 2.2, 1.8);
      r(C.shirt,  3.5, -3.5 - bodyRise, 2.2, 4.0);
      r(C.skin,   3.5,  0.2 - bodyRise*0.6, 2.2, 1.8);

      /* neck + head — head tilts back with body */
      const headRise = bodyRise + rl * 1.5;
      r(C.skin, -1.0, -5.5 - bodyRise, 2.5, 1.5);
      r(C.skinD, -3.8, -14.2 - headRise, 8.2, 9.5);
      r(C.skin,  -4.0, -14.8 - headRise, 8.2, 9.5);
      r(C.hair,  -4.0, -14.8 - headRise, 8.2, 3.0);
      r(C.hair,  -4.0, -14.8 - headRise, 1.5, 9.5);
      r(C.hair,   2.8, -14.8 - headRise, 1.5, 9.5);
      r('rgba(255,255,255,0.14)', -2.5, -14.8 - headRise, 3.5, 1.5);

      /* face — eyes get more closed the more reclined */
      const eyeH = Math.max(0.4, 1.6 - rl * 1.2); // narrows to a sliver
      r(C.eyeW, -2.0, -9.2 - headRise, 2.8, eyeH);
      r(C.eyeW,  1.2, -9.2 - headRise, 2.8, eyeH);
      if(rl < 0.85){ // pupils vanish when nearly shut
        r(C.eye, -1.5, -9.0 - headRise, 1.8, Math.max(0.3, 1.0 - rl));
        r(C.eye,  1.7, -9.0 - headRise, 1.8, Math.max(0.3, 1.0 - rl));
        r('rgba(255,255,255,0.9)', -0.7, -9.2 - headRise, 0.9, 0.9);
        r('rgba(255,255,255,0.9)',  2.5, -9.2 - headRise, 0.9, 0.9);
      }
      r(C.skinD, 0.0, -7.5 - headRise, 1.2, 1.2); /* nose */
      /* smile grows as we recline */
      r(C.skinD, -1.2 - rl*0.4, -5.8 - headRise, 3.2 + rl*0.8, 1.0);
      r(C.skinD, -1.2, -6.2 - headRise, 0.8, 0.8);
      r(C.skinD,  1.8 + rl*0.4, -6.2 - headRise, 0.8, 0.8);

      /* name tag — follows head up */
      ctx.save();
      const tagY=cy+Math.round(S*(-18.5 - headRise));
      ctx.font='bold '+Math.max(7,Math.round(S*5))+'px "Courier New",monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      const tw=Math.round(ctx.measureText('ALEX').width+S*6), th=Math.round(S*7);
      px(ctx,'rgba(8,12,18,0.85)', cx-Math.round(tw/2), tagY-Math.round(th/2), tw, th);
      ox(ctx,'rgba(100,180,255,0.65)', cx-Math.round(tw/2), tagY-Math.round(th/2), tw, th, 1);
      ctx.fillStyle='#a8d8ff'; ctx.fillText('ALEX',cx,tagY);
      ctx.restore();

      /* zzz — fades in and grows with recline */
      if(!this.reducedMotion){
        const zzzBase = 0.2 + rl * 0.6;
        const pulse = zzzBase + Math.sin(time/800) * (0.15 + rl * 0.15);
        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, pulse));
        ctx.fillStyle='rgba(180,200,255,0.9)';
        ctx.textAlign='left'; ctx.textBaseline='alphabetic';
        const zx=Math.round(cx+Math.round(S*5));
        const zy=Math.round(cy+Math.round(S*(-16 - headRise)));
        const zScale = 1 + rl * 0.6; // zzz get bigger when flat
        ctx.font='bold '+Math.max(6,Math.round(S*3.5*zScale))+'px sans-serif';
        ctx.fillText('z',zx,zy);
        ctx.font='bold '+Math.max(5,Math.round(S*2.8*zScale))+'px sans-serif';
        ctx.fillText('z',zx+Math.round(S*4*zScale),zy-Math.round(S*2.5*zScale));
        ctx.font='bold '+Math.max(4,Math.round(S*2.2*zScale))+'px sans-serif';
        ctx.fillText('z',zx+Math.round(S*7.5*zScale),zy-Math.round(S*4.5*zScale));
        ctx.globalAlpha=1;
        ctx.restore();
      }
      return; // skip the standing pose below
    }

    /* ── DANCE pose ──────────────────────────────────────────────────── */
    if(isDancing && !this.reducedMotion){
      /* 4-beat cycle at ~180ms per beat */
      const beat=Math.floor(time/180)%4;
      /* bounce: character bobs up slightly on beats 0 and 2 */
      const bounce=(beat===0||beat===2)?Math.round(S*1.5):0;
      const danceCy=cy-bounce;
      /* re-define r to use danceCy so every draw call is bounce-lifted */
      const rd=(color,dx,dy,w,h)=>
        px(ctx,color,cx+Math.round(dx*S),danceCy+Math.round(dy*S),Math.round(w*S)||1,Math.round(h*S)||1);

      /* ground shadow — shrinks on bounce */
      ctx.globalAlpha=bounce>0?0.12:0.20; ctx.fillStyle='#000';
      ctx.beginPath();
      ctx.ellipse(cx, Math.round(p.y+T/2)+Math.round(S*5.5), Math.round(S*(bounce>0?3.5:4.5)), Math.round(S*1.8), 0, 0, Math.PI*2);
      ctx.fill(); ctx.globalAlpha=1;

      /* ── feet: alternate side-steps ── */
      /* beat 0,1: left foot out; beat 2,3: right foot out */
      const leftOut =(beat===0||beat===1);
      const rightOut=(beat===2||beat===3);
      rd(C.shoe, leftOut  ? -4.5 : -2.5, 5.0, 2.5, 1.6);
      rd(C.shoe, rightOut ?  3.5 :  0.5, 5.0, 2.5, 1.6);

      /* legs */
      rd(C.pants, leftOut  ? -4.5 : -2.5, 1.5, 2.2, 3.8);
      rd(C.pants, rightOut ?  3.5 :  0.5, 1.5, 2.2, 3.8);
      rd('rgba(255,255,255,0.12)', -2.2, 1.8, 0.8, 2.5);
      rd('rgba(255,255,255,0.12)',  1.1, 1.8, 0.8, 2.5);

      /* body */
      rd(C.shirtD, -2.8, -4.5, 6.2, 6.8);
      rd(C.shirt,  -3.0, -5.0, 6.2, 6.8);
      rd('rgba(255,255,255,0.18)', -2.5, -5.0, 5.2, 1.5);
      rd(C.skin, -1.0, -5.2, 2.5, 1.8);

      /* ── arms: alternate raise ── */
      /* beat 0: both arms up; beat 1: left arm up right arm out;
         beat 2: both arms up (mirrored bob); beat 3: right arm up left arm out */
      const leftArmDy  = (beat===0||beat===2) ? -8.0 : (beat===1 ? -8.0 : 0.0);
      const rightArmDy = (beat===0||beat===2) ? -8.0 : (beat===3 ? -8.0 : 0.0);
      const leftArmDx  = (beat===3) ? -7.5 : -5.2;
      const rightArmDx = (beat===1) ?  5.5 :  3.2;
      /* left arm */
      rd(C.shirt, leftArmDx,  leftArmDy, 2.2, 4.8);
      rd(C.skin,  leftArmDx,  leftArmDy+4.5, 2.2, 2.0);
      /* right arm */
      rd(C.shirt, rightArmDx, rightArmDy, 2.2, 4.8);
      rd(C.skin,  rightArmDx, rightArmDy+4.5, 2.2, 2.0);

      /* neck + head */
      rd(C.skin, -1.0, -5.8, 2.5, 1.5);
      rd(C.skinD, -3.8, -14.5, 8.2, 9.5);
      rd(C.skin,  -4.0, -15.0, 8.2, 9.5);
      rd(C.hair,  -4.0, -15.0, 8.2, 3.0);
      rd(C.hair,  -4.0, -15.0, 1.5, 9.5);
      rd(C.hair,   2.8, -15.0, 1.5, 9.5);
      rd('rgba(255,255,255,0.14)', -2.5, -15.0, 3.5, 1.5);

      /* face — wide open smile */
      rd(C.eyeW, -2.0, -9.5, 2.8, 2.2);
      rd(C.eyeW,  1.2, -9.5, 2.8, 2.2);
      rd(C.eye,  -1.5, -9.0, 1.8, 1.5);
      rd(C.eye,   1.7, -9.0, 1.8, 1.5);
      rd('rgba(255,255,255,0.9)', -0.7, -9.2, 0.9, 0.9);
      rd('rgba(255,255,255,0.9)',  2.5, -9.2, 0.9, 0.9);
      rd(C.skinD, 0.0, -7.8, 1.2, 1.2); /* nose */
      /* big smile */
      rd(C.skinD, -2.0, -5.8, 4.5, 1.2);
      rd(C.skinD, -2.0, -6.4, 0.9, 0.9);
      rd(C.skinD,  2.5, -6.4, 0.9, 0.9);

      /* name tag */
      ctx.save();
      const tagY=danceCy+Math.round(S*(-19));
      ctx.font='bold '+Math.max(7,Math.round(S*5))+'px "Courier New",monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      const tw=Math.round(ctx.measureText('ALEX').width+S*6), th=Math.round(S*7);
      px(ctx,'rgba(8,12,18,0.85)', cx-Math.round(tw/2), tagY-Math.round(th/2), tw, th);
      ox(ctx,'rgba(100,180,255,0.65)', cx-Math.round(tw/2), tagY-Math.round(th/2), tw, th, 1);
      ctx.fillStyle='#a8d8ff'; ctx.fillText('ALEX',cx,tagY);
      ctx.restore();

      /* floating music notes */
      const notes=['\u266a','\u266b','\u2669'];
      const noteCount=3;
      ctx.save();
      for(let i=0;i<noteCount;i++){
        const phase=(time/600+i*(1/noteCount))%1;
        const nx=cx+Math.round(S*(i%2===0?7:-7)+Math.sin(phase*Math.PI*2)*S*2);
        const ny=danceCy+Math.round(S*(-20 - phase*14));
        ctx.globalAlpha=Math.sin(phase*Math.PI)*0.9;
        ctx.font='bold '+Math.max(7,Math.round(S*4.5))+'px sans-serif';
        ctx.fillStyle=i===0?'#ff88cc':i===1?'#88ddff':'#ffe066';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(notes[i%notes.length],nx,ny);
      }
      ctx.globalAlpha=1;
      ctx.restore();

      return; // skip standing pose
    }

    /* walk frame toggles every 180ms — faster when sprinting */
    const walkInterval = isSprinting ? 100 : 180;
    const frame=(moving&&!this.reducedMotion)?Math.floor(time/walkInterval)%2:0;

    /* dominant facing direction */
    const facing=Math.abs(dir.x)>=Math.abs(dir.y)
      ?(dir.x>0?'r':'l')
      :(dir.y>0?'d':'u');

    /* ── ground shadow (always on floor, not lifted with character) ── */
    const shadowCy = Math.round(p.y+T/2); // floor-level center
    const shadowScaleX = jumpHeight > 0 ? Math.max(0.3, 1 - jumpHeight * 0.18) : 1;
    const shadowAlpha = jumpHeight > 0 ? Math.max(0.06, 0.2 - jumpHeight * 0.04) : 0.2;
    ctx.globalAlpha = shadowAlpha; ctx.fillStyle='#000';
    ctx.beginPath();
    ctx.ellipse(cx, shadowCy+Math.round(S*5.5), Math.round(S*4.5*shadowScaleX), Math.round(S*1.8*shadowScaleX), 0, 0, Math.PI*2);
    ctx.fill(); ctx.globalAlpha=1;

    /* ── Sprint glow ring ── */
    if(isSprinting && !this.reducedMotion){
      ctx.globalAlpha=0.18+Math.sin(time/60)*0.08;
      ctx.fillStyle='#78c8ff';
      ctx.beginPath();
      ctx.ellipse(cx, shadowCy+Math.round(S*5.5), Math.round(S*7), Math.round(S*2.8), 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha=1;
    }

    /* ── SHOES ── */
    if(facing==='d'||facing==='r'||facing==='l'){
      const f0=frame===0;
      /* left foot forward or back */
      r(C.shoe, -2.5, f0?5.0:4.2, 2.5, 1.6);
      /* right foot opposite */
      r(C.shoe,  0.5, f0?4.2:5.0, 2.5, 1.6);
    } else {
      /* facing up – backs of feet visible */
      r(C.shoe, -2.5, 4.5, 2.2, 1.5);
      r(C.shoe,  0.8, frame===0?4.5:4.0, 2.2, 1.5);
    }

    /* ── LEGS ── */
    if(facing==='u'){
      r(C.pantsD, -2.5, 1.5, 2.2, 3.2);
      r(C.pantsD,  0.8, 1.5, 2.2, 3.2);
    } else {
      const f0=frame===0;
      r(C.pants,  -2.5, f0?1.5:2.2, 2.2, f0?3.5:2.8);
      r(C.pants,   0.8, f0?2.2:1.5, 2.2, f0?2.8:3.5);
      /* pant crease highlight */
      r('rgba(255,255,255,0.12)', -2.2, 1.8, 0.8, 2.5);
      r('rgba(255,255,255,0.12)',  1.1, 1.8, 0.8, 2.5);
    }

    /* ── BODY / SHIRT ── */
    /* shirt shadow */
    r(C.shirtD, -2.8, -4.5, 6.2, 6.8);
    /* shirt main */
    r(C.shirt, -3.0, -5.0, 6.2, 6.8);
    /* shirt highlight top edge */
    r('rgba(255,255,255,0.18)', -2.5, -5.0, 5.2, 1.5);
    /* collar */
    r(C.skin, -1.0, -5.2, 2.5, 1.8);

    /* ── ARMS ── */
    const armOff=(moving&&!this.reducedMotion)?(frame===0?0.8:-0.8):0;
    if(facing!=='u'){
      /* left arm + hand */
      r(C.shirt,  -5.2, -4.2+armOff,  2.2, 4.8);
      r(C.skin,   -5.2,  0.8+armOff,  2.2, 2.0);
      /* right arm + hand */
      r(C.shirt,   3.2, -4.2-armOff,  2.2, 4.8);
      r(C.skin,    3.2,  0.8-armOff,  2.2, 2.0);
    } else {
      r(C.shirt, -5.2, -4.2, 2.2, 4.5);
      r(C.shirt,  3.2, -4.2, 2.2, 4.5);
    }

    /* ── NECK ── */
    r(C.skin, -1.0, -5.8, 2.5, 1.5);

    /* ── HEAD SHADOW ── */
    r(C.skinD, -3.8, -14.5, 8.2, 9.5);

    /* ── HEAD ── */
    r(C.skin, -4.0, -15.0, 8.2, 9.5);

    /* ── HAIR ── */
    r(C.hair, -4.0, -15.0, 8.2, 3.0); /* top band */
    if(facing!=='r') r(C.hair, -4.0, -15.0, 1.5, 9.5); /* left side */
    if(facing!=='l') r(C.hair,  2.8, -15.0, 1.5, 9.5); /* right side */
    /* hair shine */
    r('rgba(255,255,255,0.14)', -2.5, -15.0, 3.5, 1.5);

    /* ── FACE (only when not facing up) ── */
    if(facing!=='u'){
      /* compute eye positions per facing */
      const eyeLX=facing==='r'?-0.5:(facing==='l'?-2.2:-2.0);
      const eyeRX=facing==='r'? 1.8:(facing==='l'?-0.2: 1.2);
      const eyeY=-9.5;
      /* eye whites */
      r(C.eyeW, eyeLX-0.3, eyeY,     2.8, 2.2);
      r(C.eyeW, eyeRX-0.3, eyeY,     2.8, 2.2);
      /* pupils */
      r(C.eye,  eyeLX+0.2, eyeY+0.5, 1.8, 1.5);
      r(C.eye,  eyeRX+0.2, eyeY+0.5, 1.8, 1.5);
      /* eye shines */
      r('rgba(255,255,255,0.9)', eyeLX+1.0, eyeY+0.3, 0.9, 0.9);
      r('rgba(255,255,255,0.9)', eyeRX+1.0, eyeY+0.3, 0.9, 0.9);
      /* nose */
      r(C.skinD, 0.0, -7.8, 1.2, 1.2);
      /* mouth */
      r(C.skinD, -1.5, -6.0, 3.8, 1.0);
      /* smile corners */
      if(facing==='d'){
        r(C.skinD, -1.5, -6.5, 0.8, 0.8);
        r(C.skinD,  2.0, -6.5, 0.8, 0.8);
      }
    } else {
      /* facing up – show back of head (no face), just ears */
      r(C.skin, -5.0, -12.0, 1.2, 2.5);
      r(C.skin,  4.2, -12.0, 1.2, 2.5);
    }

    /* ── NAME TAG ── */
    ctx.save();
    const tagY=cy+Math.round(S*(-19));
    ctx.font='bold '+Math.max(7,Math.round(S*5))+'px "Courier New",monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const tw=Math.round(ctx.measureText('ALEX').width+S*6), th=Math.round(S*7);
    px(ctx,'rgba(8,12,18,0.85)', cx-Math.round(tw/2), tagY-Math.round(th/2), tw, th);
    ox(ctx,'rgba(100,180,255,0.65)', cx-Math.round(tw/2), tagY-Math.round(th/2), tw, th, 1);
    ctx.fillStyle='#a8d8ff'; ctx.fillText('ALEX',cx,tagY);
    ctx.restore();
  }


  /* ── Destination marker: single blinking tile (no dashed line) ───────── */
  drawDestMarker(pathArr,time){
    if(!pathArr.length) return;
    const ctx=this.ctx, S=this.scale, T=TILE_SIZE*S;
    const last=pathArr[pathArr.length-1];
    const lp=this.sp(Math.floor(last.x),Math.floor(last.y));
    /* blink between 0.25 and 0.75 opacity */
    const blink=this.reducedMotion?0.6:0.25+Math.sin(time/200)*0.38;
    ctx.globalAlpha=blink;
    px(ctx,C.dest, lp.x, lp.y, T, T);
    ctx.globalAlpha=1;
    /* crisp 1-tile border */
    ox(ctx,C.destRing, lp.x, lp.y, T, T, Math.max(2,S));
    /* small footprint dots inside to make it feel like a marker */
    const fw=Math.round(S*2.5), fh=Math.round(S*2);
    px(ctx,'rgba(255,240,80,0.7)', Math.round(lp.x+T/2-fw/2-S*2), Math.round(lp.y+T/2-fh/2+S), fw, fh);
    px(ctx,'rgba(255,240,80,0.7)', Math.round(lp.x+T/2-fw/2+S*2), Math.round(lp.y+T/2-fh/2-S), fw, fh);
  }

  /* ── Sky / time-of-day colour overlay ───────────────────────────────── */
  /* minutes: 540 (9 AM) → 1079 (5:59 PM).  Paints a translucent wash over  */
  /* the whole room so the light gradually shifts from warm morning gold      */
  /* through neutral midday, amber afternoon, and finally deep dusk blue.     */
  _skyOverlay(minutes){
    const ctx=this.ctx, S=this.scale, T=TILE_SIZE*S;
    const tl=this.sp(0,0);
    const rw=ROOM.width*T, rh=ROOM.depth*T;

    // Normalise to [0,1]: 9 AM = 0, ~6 PM = 1
    const t=Math.max(0,Math.min(1,(minutes-540)/539));

    // Colour key-frames: [t, r, g, b, a]
    const stops=[
      [0.00, 255, 200,  80, 0.12],  // 9 AM  – warm morning gold
      [0.22, 255, 245, 200, 0.00],  // noon  – neutral (no tint)
      [0.55, 255, 160,  50, 0.07],  // 3 PM  – amber afternoon
      [0.80,  80,  60, 160, 0.20],  // 5 PM  – dusk violet
      [1.00,  15,  22,  70, 0.40],  // 6 PM  – deep evening blue
    ];

    // Find surrounding stops and lerp
    let lo=stops[0], hi=stops[stops.length-1];
    for(let i=0;i<stops.length-1;i++){
      if(t>=stops[i][0] && t<=stops[i+1][0]){ lo=stops[i]; hi=stops[i+1]; break; }
    }
    const u= lo[0]===hi[0] ? 0 : (t-lo[0])/(hi[0]-lo[0]);
    const lerp=(a,b)=>a+( b-a)*u;
    const r=Math.round(lerp(lo[1],hi[1]));
    const g=Math.round(lerp(lo[2],hi[2]));
    const b=Math.round(lerp(lo[3],hi[3]));
    const a=lerp(lo[4],hi[4]);
    if(a<0.005) return; // nothing to draw at pure midday

    // Tint the whole room (walls + floor)
    ctx.globalAlpha=a;
    px(ctx,`rgb(${r},${g},${b})`,tl.x,tl.y-T*3,rw,rh+T*3);
    ctx.globalAlpha=1;

    // Extra wall-top gradient: walls feel more saturated than the floor
    const wallAlpha=a*0.55;
    if(wallAlpha>0.003){
      const wGrad=ctx.createLinearGradient(0,tl.y-T*3,0,tl.y+T);
      wGrad.addColorStop(0,`rgba(${r},${g},${b},${wallAlpha.toFixed(3)})`);
      wGrad.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=wGrad;
      ctx.fillRect(tl.x,tl.y-T*3,rw,T*4);
    }

    // At dusk (t > 0.7): add a subtle moonrise shimmer on the right wall
    if(t>0.70){
      const moonStrength=(t-0.70)/0.30;
      const mx=tl.x+rw*0.85, my=tl.y-T*2;
      const moonR=Math.round(T*2.2);
      const moonGrad=ctx.createRadialGradient(mx,my,0,mx,my,moonR);
      moonGrad.addColorStop(0,`rgba(200,220,255,${(0.22*moonStrength).toFixed(3)})`);
      moonGrad.addColorStop(1,'rgba(200,220,255,0)');
      ctx.fillStyle=moonGrad;
      ctx.fillRect(tl.x,tl.y-T*3,rw,rh+T*3);
    }
  }

  /* ── Worker character: seated sprite with role colour ──────────────── */
  workerCharacter(worker, seat, time) {
    const ctx = this.ctx, S = this.scale, T = TILE_SIZE * S;
    const p = this.sp(seat.x, seat.y);
    const cx = Math.round(p.x + T / 2);
    const cy = Math.round(p.y + T / 2);

    const r = (color, dx, dy, w, h) =>
      px(ctx, color, cx + Math.round(dx * S), cy + Math.round(dy * S), Math.round(w * S) || 1, Math.round(h * S) || 1);

    // Subtle idle bob
    const bob = this.reducedMotion ? 0 : Math.sin(time / 900 + (worker.deskIndex * 1.7)) * 0.6;

    // Ground shadow
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, cy + Math.round(S * 7), Math.round(S * 5), Math.round(S * 2), 0, 0, Math.PI * 2);
    ctx.fill(); ctx.globalAlpha = 1;

    // Legs (seated — horizontal)
    r('#384050', -4.5, 3.5 + bob, 4.0, 2.0);
    r('#384050',  0.5, 3.5 + bob, 4.0, 2.0);
    r('#181008', -5.5, 3.8 + bob, 2.2, 1.6); // shoes
    r('#181008',  4.0, 3.8 + bob, 2.2, 1.6);

    // Body (use worker role colour as shirt)
    const shirt = worker.color || '#3868b8';
    r(shirt,    -3.0, -4.5 + bob, 6.0, 6.2);
    r('rgba(255,255,255,0.12)', -2.5, -4.5 + bob, 5.0, 1.4);

    // Arms reaching toward desk (leaning forward slightly)
    r(shirt,    -5.0, -3.2 + bob, 2.0, 4.0);
    r(shirt,     3.0, -3.2 + bob, 2.0, 4.0);
    r(C.skin,   -5.0,  0.5 + bob, 2.0, 1.6); // hands
    r(C.skin,    3.0,  0.5 + bob, 2.0, 1.6);

    // Head
    r(C.skinD,  -3.8, -14.0 + bob, 8.0, 9.2);
    r(C.skin,   -4.0, -14.5 + bob, 8.0, 9.2);
    r(C.hair,   -4.0, -14.5 + bob, 8.0, 2.8);
    r(C.hair,   -4.0, -14.5 + bob, 1.4, 9.2);
    r(C.hair,    2.8, -14.5 + bob, 1.4, 9.2);

    // Face — focused look (slightly narrowed eyes)
    r(C.eyeW,  -2.0, -9.0 + bob, 2.6, 1.2);
    r(C.eyeW,   1.2, -9.0 + bob, 2.6, 1.2);
    r(C.eye,   -1.5, -8.8 + bob, 1.6, 1.0);
    r(C.eye,    1.7, -8.8 + bob, 1.6, 1.0);
    r(C.skinD,  0.0, -7.4 + bob, 1.2, 1.0); // nose
    // Subtle focused mouth
    r(C.skinD, -1.0, -5.8 + bob, 2.8, 0.8);

    // Name tag above head
    ctx.save();
    const tagY = cy + Math.round(S * (-18.5 + bob));
    ctx.font = `bold ${Math.max(7, Math.round(S * 6))}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const label = `${worker.emoji} ${worker.name}`;
    const tw = ctx.measureText(label).width;
    const pad = Math.round(S * 2);
    const tagH = Math.round(S * 8);
    ctx.fillStyle = 'rgba(10,10,18,0.82)';
    ctx.fillRect(cx - Math.round(tw / 2) - pad, tagY - tagH, tw + pad * 2, tagH);
    ctx.fillStyle = worker.color || '#78c878';
    ctx.fillText(label, cx, tagY);
    ctx.restore();
  }

  /* ── Main render ─────────────────────────────────────────────────────── */
  render({founder,path,hovered,hoverFloor,direction,moving,time,jumpHeight=0,sprinting=false,dashTrail=[],lightOn=true,lampOn=true,sittingOnSofa=false,sofaRecline=0,minutes=540,isCycling=false,pedalPower=0,bikeBreakdown=0,workers=[],cerealStock=0,treadmillSessions=0,isTreadmilling=false,runPower=0,isDancing=false,jumpscareActive=false}){
    const ctx=this.ctx;
    this._time=time;
    this._lightOn=lightOn;
    this._lampOn=lampOn;
    this._sittingOnSofa=sittingOnSofa;
    this._sofaRecline=sofaRecline;
    this._pedalPower=pedalPower;
    this._isCycling=isCycling;
    this._bikeBreakdown=bikeBreakdown;
    this._cerealStock=cerealStock;
    this._treadmillSessions=treadmillSessions;
    this._isTreadmilling=isTreadmilling;
    this._runPower=runPower;
    this._isDancing=isDancing;
    ctx.imageSmoothingEnabled=false;
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    px(ctx,'#18120c',0,0,this.width,this.height);
    this.floor();

    /* destination tile blink */
    this.drawDestMarker(path,time);

    /* ── Worker desk positions (deskIndex 0 = ideas desk, 1 = ideas2 desk) ── */
    const WORKER_SEATS = [
      { x: 6.5, y: 5.5 },   // ideas desk (x:5,y:4,w:3,d:2) — front-centre
      { x: 6.5, y: 2.5 },   // ideas2 desk (x:5,y:1,w:3,d:2) — front-centre
    ];

    /* depth sort objects + player + workers, draw back-to-front */
    this.hits=[];
    const entries=OBJECTS.map(o=>({o,depth:o.y+o.d}));
    entries.push({player:true,depth:founder.y+1});
    for(const w of workers){
      const seat=WORKER_SEATS[w.deskIndex];
      if(seat) entries.push({worker:w,seat,depth:seat.y+1});
    }
    /* ── Ambient ghost — drifts in the top-left corner, depth-sorted live ── */
    const ghostPos=this._ghostPosition(time);
    entries.push({ghost:true,gx:ghostPos.x,gy:ghostPos.y,depth:ghostPos.y+1,jumpscareActive});
    entries.sort((a,b)=>a.depth-b.depth);

    /* ── Dash trail ghost sprites ── */
    if(dashTrail.length && !this.reducedMotion){
      for(let i=0;i<dashTrail.length;i++){
        const ghost=dashTrail[i];
        ctx.globalAlpha=ghost.alpha*0.6;
        this._drawGhostSprite(ghost,direction,time);
        ctx.globalAlpha=1;
      }
    }

    for(const entry of entries){
      if(entry.player) this.character(founder,direction,moving,time,jumpHeight,sprinting,sittingOnSofa,sofaRecline,isDancing);
      else if(entry.worker) this.workerCharacter(entry.worker,entry.seat,time);
      else if(entry.ghost) this._drawAmbientGhost(entry.gx,entry.gy,time,entry.jumpscareActive);
      else this.drawObject(entry.o,hovered);
    }

    /* ── Sky / time-of-day overlay (daylight → dusk) ── */
    this._skyOverlay(minutes);

    /* ── Darkness overlay when lights are off ── */
    if(!lightOn){
      const S=this.scale, T=TILE_SIZE*S;
      const tl=this.sp(0,0);
      const rw=ROOM.width*T, rh=ROOM.depth*T;
      /* deep dark base over the whole room */
      ctx.globalAlpha=0.86;
      px(ctx,'#04070a',tl.x,tl.y-T*3,rw,rh+T*3);
      ctx.globalAlpha=1;
      /* natural window light shafts cut through the dark */
      this._windowLight(minutes,time);
      /* soft radial monitor glow around workstation */
      const gx=this.sp(11.5,4).x, gy=this.sp(11.5,4).y;
      const grad=ctx.createRadialGradient(gx,gy,0,gx,gy,Math.round(T*3.5));
      grad.addColorStop(0,'rgba(26,58,90,0.55)');
      grad.addColorStop(1,'rgba(6,9,10,0)');
      ctx.fillStyle=grad;
      ctx.fillRect(tl.x,tl.y-T*3,rw,rh+T*3);
      /* warm lamp pool cuts through the dark when lamp is on */
      if(lampOn){
        const lx=this.sp(9.5,9.5).x, ly=this.sp(9.5,9.5).y;
        const lampR=Math.round(T*2.8);
        const pulse=0.62+Math.sin(time/600)*0.06;
        const lgrad=ctx.createRadialGradient(lx,ly,0,lx,ly,lampR);
        lgrad.addColorStop(0,`rgba(255,180,60,${pulse})`);
        lgrad.addColorStop(0.45,`rgba(200,120,20,${(pulse*0.38).toFixed(3)})`);
        lgrad.addColorStop(1,'rgba(6,9,10,0)');
        ctx.fillStyle=lgrad;
        ctx.fillRect(tl.x,tl.y-T*3,rw,rh+T*3);
      }
    }
  }

  /* ── Natural window light shafts ─────────────────────────────────────── */
  /* Called only when the overhead lights are off. Draws angled beams of    */
  /* sunlight (daytime) or moonlight (evening) from back-wall and left-wall  */
  /* windows using clipped parallelogram paths + linear gradients.           */
  _windowLight(minutes,time){
    const ctx=this.ctx, S=this.scale, T=TILE_SIZE*S;
    const tl=this.sp(0,0);
    const rw=ROOM.width*T, rh=ROOM.depth*T;

    // t: 0=9AM, 1=6PM; isNight: evening from ~4PM onward
    const t=Math.max(0,Math.min(1,(minutes-540)/539));
    const isNight=t>0.67;
    // subtle alive shimmer
    const flicker=0.93+Math.sin(time/900)*0.05+Math.sin(time/370)*0.02;

    // shaft colour & intensity
    let shR,shG,shB,shaftAlpha;
    if(!isNight){
      const dayT=t/0.67;
      shR=255; shG=Math.round(215-dayT*30); shB=Math.round(100-dayT*55);
      shaftAlpha=(0.30-dayT*0.10)*flicker;
    } else {
      const nightT=(t-0.67)/0.33;
      shR=180; shG=200; shB=255;
      shaftAlpha=(0.10+nightT*0.14)*flicker;
    }

    // draw one parallelogram shaft: wx,wy = top-centre; halfW = half-width;
    // slant = rightward pixel offset at the bottom; len = shaft length
    const drawShaft=(wx,wy,halfW,slant,len)=>{
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(wx-halfW,            wy);
      ctx.lineTo(wx+halfW,            wy);
      ctx.lineTo(wx+halfW+slant+halfW*0.4, wy+len);
      ctx.lineTo(wx-halfW+slant-halfW*0.4, wy+len);
      ctx.closePath();
      ctx.clip();
      const grad=ctx.createLinearGradient(wx,wy,wx+slant*0.5,wy+len);
      grad.addColorStop(0,   `rgba(${shR},${shG},${shB},${(shaftAlpha*0.9).toFixed(3)})`);
      grad.addColorStop(0.35,`rgba(${shR},${shG},${shB},${(shaftAlpha*0.55).toFixed(3)})`);
      grad.addColorStop(0.7, `rgba(${shR},${shG},${shB},${(shaftAlpha*0.18).toFixed(3)})`);
      grad.addColorStop(1,   `rgba(${shR},${shG},${shB},0)`);
      ctx.fillStyle=grad;
      const x0=Math.min(wx-halfW, wx-halfW+slant)-halfW;
      const x1=Math.max(wx+halfW, wx+halfW+slant)+halfW;
      ctx.fillRect(x0,wy,x1-x0,len+1);
      ctx.restore();
    };

    // back-wall shaft origins just above the floor line
    const wallY=tl.y-Math.round(T*0.4);
    const shaftLen=Math.round(rh*0.72);
    const daySlant=Math.round(T*2.2);   // sun from upper-left → slant right
    const nightSlant=Math.round(T*0.7); // moon more overhead → nearly vertical
    const slant=isNight?nightSlant:daySlant;

    // three back-wall windows, placed to avoid board (x4-8) and lightswitch (x15)
    const w1=this.sp(1.8,0);
    const w2=this.sp(9.5,0);
    const w3=this.sp(12.5,0);
    drawShaft(w1.x, wallY, Math.round(T*0.80), slant, shaftLen);
    drawShaft(w2.x, wallY, Math.round(T*0.90), slant, shaftLen);
    drawShaft(w3.x, wallY, Math.round(T*0.70), slant, shaftLen);

    // left-wall window (daytime only — morning sun enters from the left)
    if(!isNight){
      const lwp=this.sp(0,5.5);
      const lwHalf=Math.round(T*0.65);
      const lwLen=Math.round(rw*0.48);
      ctx.save();
      ctx.translate(lwp.x,lwp.y);
      ctx.rotate(-Math.PI*0.04);
      const lwGrad=ctx.createLinearGradient(0,0,lwLen,0);
      lwGrad.addColorStop(0,   `rgba(${shR},${shG},${shB},${(shaftAlpha*0.85).toFixed(3)})`);
      lwGrad.addColorStop(0.4, `rgba(${shR},${shG},${shB},${(shaftAlpha*0.40).toFixed(3)})`);
      lwGrad.addColorStop(0.75,`rgba(${shR},${shG},${shB},${(shaftAlpha*0.10).toFixed(3)})`);
      lwGrad.addColorStop(1,   `rgba(${shR},${shG},${shB},0)`);
      ctx.beginPath();
      ctx.moveTo(0,-lwHalf); ctx.lineTo(lwLen,-lwHalf*1.6);
      ctx.lineTo(lwLen,lwHalf*1.6); ctx.lineTo(0,lwHalf);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle=lwGrad;
      ctx.fillRect(0,-lwHalf*2,lwLen+1,lwHalf*4);
      ctx.restore();
    }

    // window-sill highlight strips on the back wall — sells the frame/glass
    const sillH=Math.max(2,Math.round(S*1.5));
    const sillY=Math.round(tl.y-T*1.0);
    const sillAlpha=Math.min(0.9,isNight?(shaftAlpha*1.2):(shaftAlpha*1.5));
    ctx.globalAlpha=sillAlpha;
    const sill=(wx,hw)=>px(ctx,`rgb(${shR},${shG},${shB})`,wx-hw,sillY,hw*2,sillH);
    sill(w1.x,Math.round(T*0.80)); sill(w2.x,Math.round(T*0.90)); sill(w3.x,Math.round(T*0.70));
    ctx.globalAlpha=1;

    // floor reflection pools where shafts land
    const poolAlpha=shaftAlpha*0.45;
    const pool=(wx)=>{
      const px2=wx+slant*0.6, py2=wallY+shaftLen*0.55;
      const pr=Math.round(T*1.4);
      const pg=ctx.createRadialGradient(px2,py2,0,px2,py2,pr);
      pg.addColorStop(0,`rgba(${shR},${shG},${shB},${(poolAlpha).toFixed(3)})`);
      pg.addColorStop(1,`rgba(${shR},${shG},${shB},0)`);
      ctx.fillStyle=pg; ctx.fillRect(px2-pr,py2-pr,pr*2,pr*2);
    };
    pool(w1.x); pool(w2.x); pool(w3.x);
  }

  /* ── Ghost afterimage (simplified sprite outline) ──────────────────── */
  /* ── Ambient ghost position ─────────────────────────────────────────── */
  /* Returns the ghost's current tile-space {x,y} based on time.          */
  /* Drifts lazily in the top-left corner using two slow, incommensurate  */
  /* sine waves so it never perfectly repeats.                             */
  _ghostPosition(time){
    // centre of the drift zone: top-left corner near the fern (x:1,y:1)
    const cx=1.5, cy=1.7;
    // two independent slow oscillators — irrational ratio keeps it aperiodic
    const dx=Math.sin(time/4200)*0.7 + Math.sin(time/7300)*0.35;
    const dy=Math.cos(time/5100)*0.55 + Math.cos(time/3800)*0.3;
    return {x: cx+dx, y: cy+dy};
  }

  /* ── Ambient ghost renderer ─────────────────────────────────────────── */
  /* Draws a classic sheet-ghost silhouette at tile position (gx, gy).    */
  /* Semi-transparent, gently bobbing, with glowing hollow eyes.          */
  _drawAmbientGhost(gx,gy,time,jumpscareActive=false){
    const ctx=this.ctx, S=this.scale, T=TILE_SIZE*S;
    const p=this.sp(gx,gy);
    const cx=Math.round(p.x+T/2);
    // vertical float bob — slow, dreamy; frozen + snapped forward during scare
    const bob=jumpscareActive ? 0 : (this.reducedMotion ? 0 : Math.sin(time/1800)*Math.round(S*2.5));
    const cy=Math.round(p.y+T/2)-bob;

    // overall ghost opacity — breathes very slowly; full opacity on jumpscare
    const breathe=jumpscareActive ? 1.0 : (this.reducedMotion ? 0.38 : 0.28+Math.sin(time/2600)*0.10);
    ctx.save();
    ctx.globalAlpha=breathe;

    // ── Body: dome top + tapered rectangular mid-section ──
    const bodyW=Math.round(S*9);
    const domeR=Math.round(bodyW/2);
    const bodyTop=cy-Math.round(S*12);   // top of dome
    const bodyMid=cy-Math.round(S*3);    // where dome meets straight sides
    const bodyBot=cy+Math.round(S*5);    // bottom of straight section

    ctx.fillStyle='#d8e8f8';
    ctx.beginPath();
    // dome arc
    ctx.arc(cx, bodyMid, domeR, Math.PI, 0, false);
    // right side down
    ctx.lineTo(cx+domeR, bodyBot);
    // wispy fringe — three rounded bumps at the bottom
    const bumpW=Math.round(domeR*0.68);
    const bumpR=Math.round(S*2.8);
    ctx.arc(cx+domeR-bumpW,   bodyBot, bumpR, 0, Math.PI, false);
    ctx.arc(cx,               bodyBot, bumpR, 0, Math.PI, false);
    ctx.arc(cx-domeR+bumpW,   bodyBot, bumpR, 0, Math.PI, false);
    // left side back up
    ctx.lineTo(cx-domeR, bodyMid);
    ctx.closePath();
    ctx.fill();

    // ── Inner body highlight (top of dome is brighter) ──
    ctx.globalAlpha=breathe*0.45;
    ctx.fillStyle='#ffffff';
    ctx.beginPath();
    ctx.arc(cx-Math.round(S*1.5), bodyMid-Math.round(S*2), Math.round(domeR*0.55), Math.PI, 0, false);
    ctx.fill();

    // ── Eyes — hollow dark ovals with a faint inner glow ──
    ctx.globalAlpha=breathe*1.4;   // eyes slightly more opaque than body
    const eyeY=bodyMid-Math.round(S*2);
    const eyeRx=Math.round(S*2.2), eyeRy=Math.round(S*3.0);
    const eyeSep=Math.round(S*3.5);

    // dark sockets
    ctx.fillStyle='#0a0814';
    ctx.beginPath();
    ctx.ellipse(cx-eyeSep, eyeY, eyeRx, eyeRy, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx+eyeSep, eyeY, eyeRx, eyeRy, 0, 0, Math.PI*2);
    ctx.fill();

    // soft inner glow — colour shifts slowly between blue and purple; red on jumpscare
    const hueShift=this.reducedMotion ? 0 : Math.sin(time/3500);
    const eyeR=jumpscareActive ? 255 : Math.round(155+hueShift*30);
    const eyeG=jumpscareActive ? 0   : Math.round(170+hueShift*10);
    const eyeB=jumpscareActive ? 0   : 255;
    ctx.globalAlpha=jumpscareActive ? 1.0 : breathe*(this.reducedMotion ? 0.55 : 0.45+Math.sin(time/1200)*0.15);
    ctx.fillStyle=`rgb(${eyeR},${eyeG},${eyeB})`;
    ctx.beginPath();
    ctx.ellipse(cx-eyeSep, eyeY, Math.round(eyeRx*0.55), Math.round(eyeRy*0.55), 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx+eyeSep, eyeY, Math.round(eyeRx*0.55), Math.round(eyeRy*0.55), 0, 0, Math.PI*2);
    ctx.fill();

    // ── Tiny ground shadow ──
    ctx.globalAlpha=breathe*0.35;
    ctx.fillStyle='#000';
    ctx.beginPath();
    ctx.ellipse(cx, bodyBot+Math.round(S*3.5), Math.round(S*4.5), Math.round(S*1.2), 0, 0, Math.PI*2);
    ctx.fill();

    ctx.globalAlpha=1;
    ctx.restore();
  }

  _drawGhostSprite(pos,dir,time){
    const ctx=this.ctx, S=this.scale, T=TILE_SIZE*S;
    const p=this.sp(pos.x,pos.y);
    const cx=Math.round(p.x+T/2), cy=Math.round(p.y+T/2);
    /* draw a simple blue-tinted silhouette */
    const r=(color,dx,dy,w,h)=>
      px(ctx,color,cx+Math.round(dx*S),cy+Math.round(dy*S),Math.round(w*S)||1,Math.round(h*S)||1);
    r('#3888d8',-3.0,-15.0,6.5,21.0); // full body silhouette
  }

  hitTest(sx,sy){
    const wp=this.floorPoint(sx,sy);
    for(const o of[...this.hits].reverse()){
      if(wp.x>=o.x&&wp.x<o.x+o.w&&wp.y>=o.y&&wp.y<o.y+o.d) return o;
    }
    return null;
  }
}
