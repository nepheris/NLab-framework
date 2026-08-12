import assert from 'node:assert/strict';
import { ComponentSizeConstraints, ComponentSizeConstraintError } from '../core/component-size-constraints.js';

const both = new ComponentSizeConstraints({minWidth:200,maxWidth:800,minHeight:100,maxHeight:600,step:10});
assert.equal(both.canResize('x'),true);
assert.equal(both.canResize('y'),true);
assert.equal(both.canResize('both'),true);
assert.equal(both.plan({width:400,height:300},{width:1000,height:50}).width,800);
assert.equal(both.plan({width:400,height:300},{width:1000,height:50}).height,100);
const viewport = both.plan({width:400,height:300},{width:700,height:500},{viewport:{width:600,height:450},origin:{x:50,y:25}});
assert.deepEqual({w:viewport.width,h:viewport.height},{w:550,h:425});
assert.deepEqual(both.keyboardDelta('ArrowRight'),{dx:10,dy:0,handled:true});
assert.deepEqual(both.keyboardDelta('ArrowDown',{shiftKey:true}),{dx:0,dy:50,handled:true});
assert.equal(both.planKeyboard({width:795,height:590},'ArrowRight').width,800);
assert.equal(both.handleDescriptors().length,3);

const x = new ComponentSizeConstraints({axis:'x',minWidth:100,maxWidth:500});
assert.deepEqual(x.plan({width:200,height:120},{width:450,height:400}),{width:450,height:120,changed:true,clamped:false,source:'x',limits:{minWidth:100,maxWidth:500,minHeight:0,maxHeight:Infinity},aspectRatio:null});
assert.deepEqual(x.keyboardDelta('ArrowDown'),{dx:0,dy:0,handled:false});
assert.deepEqual(x.handleDescriptors().map(h=>h.axis),['x']);

const none = new ComponentSizeConstraints({axis:'none'});
assert.equal(none.plan({width:200,height:100},{width:400,height:300}).changed,false);
assert.equal(none.handleDescriptors().length,0);

const ratio = new ComponentSizeConstraints({axis:'both',aspectRatio:16/9,minWidth:160,maxWidth:960,minHeight:90,maxHeight:540});
const byWidth = ratio.plan({width:320,height:180},{width:800,height:200},{anchor:'width'});
assert.equal(byWidth.width,800);
assert.equal(byWidth.height,450);
const byHeight = ratio.plan({width:320,height:180},{width:350,height:500},{anchor:'height'});
assert.equal(byHeight.height,500);
assert.ok(Math.abs(byHeight.width-(500*16/9))<1e-9);
const ratioViewport = ratio.plan({width:320,height:180},{width:900,height:500},{viewport:{width:640,height:360}});
assert.equal(ratioViewport.width,640);
assert.equal(ratioViewport.height,360);

const snap=both.snapshot(); snap.minWidth=999; assert.equal(both.snapshot().minWidth,200);
assert.throws(()=>new ComponentSizeConstraints({axis:'x',aspectRatio:2}),e=>e instanceof ComponentSizeConstraintError&&e.code==='ASPECT_REQUIRES_BOTH_AXES');
assert.throws(()=>new ComponentSizeConstraints({minWidth:500,maxWidth:100}),e=>e.code==='INVALID_WIDTH_RANGE');
assert.throws(()=>both.plan({width:1,height:1},{width:1,height:1},{anchor:'z'}),e=>e.code==='INVALID_ANCHOR');
assert.throws(()=>new ComponentSizeConstraints({aspectRatio:2,minWidth:500,maxWidth:600,minHeight:400,maxHeight:500}).plan({width:500,height:250},{width:550,height:275}),e=>e.code==='UNSATISFIABLE_ASPECT_RATIO');
const low = both.plan({width:400,height:300},{width:-50,height:0});
assert.equal(low.width,200);
assert.equal(low.height,100);
const keyboardLow = both.planKeyboard({width:205,height:105},'ArrowLeft',{shiftKey:true});
assert.equal(keyboardLow.width,200);
console.log('component size constraints tests: ok');
