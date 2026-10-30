import test from 'node:test';
import assert from 'node:assert/strict';
import {verticalStack,centeredBaseline,textCenterX,measureWrappedLines,MODULE_TITLE_PT} from '../src/pdfLayout.ts';
test('stack centers short content as a group',()=>{
  const stack=verticalStack({x:10,y:20,width:200,height:100},[{height:20},{height:20}],10);
  assert.deepEqual(stack.map(x=>x.y),[75,45]);
  assert.equal(stack[0].y+stack[0].height,95);
  assert.equal(stack[1].y,45);
});
test('unused room can grow content within caps without shifting outside frame',()=>{
  const stack=verticalStack({x:0,y:0,width:120,height:160},
    [{height:25},{height:30,grow:2,maxHeight:75},{height:25,grow:1,maxHeight:45}],8);
  assert.ok(stack[1].height>30);
  assert.ok(stack[2].height>25);
  assert.ok(stack[0].y+stack[0].height<=160);
  assert.ok(stack[2].y>=0);
});
test('text wrapping uses measured widths and never truncates words',()=>{
  const lines=measureWrappedLines('Daniel trusted God completely',115,t=>t.length*10);
  assert.deepEqual(lines,['Daniel','trusted God','completely']);
  assert.equal(measureWrappedLines('elephant',12,t=>t.length*10),null);
});
test('common title size and baselines are fixed print measurements',()=>{
  assert.equal(MODULE_TITLE_PT,25);
  assert.equal(textCenterX({x:10,y:0,width:120,height:20},20),60);
  assert.ok(centeredBaseline({x:0,y:5,width:100,height:30},12)>5);
});
