var loki = require('../../src/lokijs');

describe('binary indices', function () {
  beforeEach(function () {
    testRecords = [
      { name : 'mjolnir', owner: 'thor', maker: 'dwarves' },
      { name : 'gungnir', owner: 'odin', maker: 'elves' },
      { name : 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' },
      { name : 'draupnir', owner: 'odin', maker: 'elves' }
    ];
  });

  describe('collection.clear affects binary indices correctly', function() {
    it('works', function () {
      var db = new loki('idxtest');
      var t2 = JSON.parse(JSON.stringify(testRecords));
      
      var items = db.addCollection('users', { indices: ['name'] });
      items.insert(testRecords);
      expect(items.binaryIndices.name.values.length).toBe(4);
      items.clear();
      expect(items.binaryIndices.hasOwnProperty('name')).toEqual(true);
      expect(items.binaryIndices.name.values.length).toBe(0);
      items.insert(t2);
      expect(items.binaryIndices.name.values.length).toBe(4);
      items.clear({ removeIndices: true });
      expect(items.binaryIndices.hasOwnProperty('name')).toEqual(false);
    });
  });
  
  describe('binary index loosly but reliably works across datatypes', function() {
    it('works', function() {
        var db = new loki('ugly.db');

        // Add a collection to the database
        var dirtydata = db.addCollection('dirtydata', { indices: ['b'] });

        // Add some documents to the collection
        dirtydata.insert({ a : 0 });
        var b4 = { a : 1, b: 4 }; dirtydata.insert(b4);
        dirtydata.insert({ a : 2, b: undefined});
        dirtydata.insert({ a: 3, b: 3.14});
        dirtydata.insert({ a: 4, b: new Date() });
        dirtydata.insert({ a: 5, b: false });
        dirtydata.insert({ a: 6, b: true });
        dirtydata.insert({ a: 7, b: null });
        dirtydata.insert({ a : 8, b: '0'});
        dirtydata.insert({ a : 9, b: 0});
        dirtydata.insert({ a : 10, b: 3});
        dirtydata.insert({ a : 11, b: '3'});
        dirtydata.insert({ a : 12, b: '4'});
    });
  });

  describe('index maintained across inserts', function() {
    it('works', function () {

      var db = new loki('idxtest');
      var items = db.addCollection('users', { indices: ['name'] });
      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir'});
      
      var bi = items.binaryIndices.name;
      expect(bi.values.length).toBe(4);
      expect(bi.values[0]).toBe(3);
      expect(bi.values[1]).toBe(1);
      expect(bi.values[2]).toBe(0);
      expect(bi.values[3]).toBe(2);
      
      items.insert({ name : 'gjallarhorn', owner: 'heimdallr', maker: 'Gjöll' });
      
      // force index build
      items.find({ name: 'mjolnir'});

      // reaquire values array
      bi = items.binaryIndices.name;

      expect(bi.values[0]).toBe(3);
      expect(bi.values[1]).toBe(4);
      expect(bi.values[2]).toBe(1);
      expect(bi.values[3]).toBe(0);
      expect(bi.values[4]).toBe(2);
    });
  });

  describe('index maintained across removes', function() {
    it('works', function () {

      var db = new loki('idxtest');
      var items = db.addCollection('users', { indices: ['name'] });
      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir'});
      
      var bi = items.binaryIndices.name;
      expect(bi.values.length).toBe(4);
      expect(bi.values[0]).toBe(3);
      expect(bi.values[1]).toBe(1);
      expect(bi.values[2]).toBe(0);
      expect(bi.values[3]).toBe(2);
      
      var tyrfing = items.findOne({name: 'tyrfing'});
      items.remove(tyrfing);
      
      // force index build
      items.find({ name: 'mjolnir'});

      // reaquire values array
      bi = items.binaryIndices.name;

      // values are data array positions which should be collapsed, decrementing all index positions after the deleted 
      expect(bi.values[0]).toBe(2);
      expect(bi.values[1]).toBe(1);
      expect(bi.values[2]).toBe(0);
    });
  });

  describe('index maintained across batch removes', function() {
    it('works', function() {
      var db = new loki('batch-removes');
      var items = db.addCollection('items', { indices: ['b'] });
      
      for(idx=0;idx<100;idx++) {
        a = Math.floor(Math.random() * 1000);
        b = Math.floor(Math.random() * 1000);
        items.insert({ "a": a, "b": b });
      }
      
      var result = items.find({ a: { $between: [300, 700] } });

      items.findAndRemove({ a: { $between: [300, 700] } });
      
      expect(items.checkIndex('b')).toEqual(true);

      expect(items.find().length).toEqual(100-result.length);
    });
  });

  describe('index maintained across updates', function() {
    it('works', function () {

      var db = new loki('idxtest');
      var items = db.addCollection('users', { indices: ['name'] });
      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir'});
      
      var bi = items.binaryIndices.name;
      expect(bi.values.length).toBe(4);
      expect(bi.values[0]).toBe(3);
      expect(bi.values[1]).toBe(1);
      expect(bi.values[2]).toBe(0);
      expect(bi.values[3]).toBe(2);
      
      var tyrfing = items.findOne({name: 'tyrfing'});
      tyrfing.name = 'etyrfing';
      items.update(tyrfing);
      
      // force index build
      items.find({ name: 'mjolnir'});

      // reaquire values array
      bi = items.binaryIndices.name;

      expect(bi.values[0]).toBe(3);
      expect(bi.values[1]).toBe(2);
      expect(bi.values[2]).toBe(1);
      expect(bi.values[3]).toBe(0);
    });
  });

  describe('positional lookup using get works', function() {
    it('works', function () {

      // Since we use coll.get's ability to do a positional lookup of a loki id during adaptive indexing we will test it here
      
      // let's base this off of our 'remove' test so data is more meaningful
      
      var db = new loki('idxtest');
      var items = db.addCollection('users', { indices: ['name'] });
      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir'});
      
      var item, dataPosition;

      var item = items.findOne({name: 'tyrfing'});
      items.remove(item);
      
      item = items.findOne({name: 'draupnir'});
      dataPosition = items.get(item.$loki, true);
      expect(dataPosition[1]).toBe(2);
      
      item = items.findOne({name: 'gungnir'});
      dataPosition = items.get(item.$loki, true);
      expect(dataPosition[1]).toBe(1);
      
      item = items.findOne({name: 'mjolnir'});
      dataPosition = items.get(item.$loki, true);
      expect(dataPosition[1]).toBe(0);
    });
  });

  describe('positional index lookup using getBinaryIndexPosition works', function() {
    it('works', function () {

      // Since our indexes contain -not loki id values- but coll.data[] positions
      // we shall verify our getBinaryIndexPosition method's ability to look up an 
      // index value based on data array position function (obtained via get)
      
      var db = new loki('idxtest');
      var items = db.addCollection('users', { indices: ['name'] });
      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir'});

      // tyrfing should be in coll.data[2] since it was third added item and we have not deleted yet
      var pos = items.getBinaryIndexPosition(2, 'name');
      // yet in our index it should be fourth (array index 3) since sorted alphabetically
      expect(pos).toBe(3);
      
      // now remove draupnir
      var draupnir = items.findOne({ name: 'draupnir' });
      items.remove(draupnir);
      
      // force index build
      items.find({ name: 'mjolnir'});

      // tyrfing should be in coll.data[2] since it was third added item and we have not deleted yet
      var pos = items.getBinaryIndexPosition(2, 'name');
      // yet in our index it should be now be third (array index 2) 
      expect(pos).toBe(2);
      
    });
  });

  describe('calculateRangeStart works for inserts', function() {
    it('works', function () {

      // calculateRangeStart is helper function for adaptive inserts/updates
      // we will use it to find position within index where (new) nonexistent value should be inserted into index
      
      var db = new loki('idxtest');
      var items = db.addCollection('users', { indices: ['name'] });
      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir'});

      var pos = items.calculateRangeStart('name', 'fff', true);
      expect(pos).toBe(1);

      var pos = items.calculateRangeStart('name', 'zzz', true);
      expect(pos).toBe(4);

      var pos = items.calculateRangeStart('name', 'aaa', true);
      expect(pos).toBe(0);

      var pos = items.calculateRangeStart('name', 'gungnir', true);
      expect(pos).toBe(1);
    });
  });

  describe('adaptiveBinaryIndexInsert works', function() {
    it('works', function () {

      // Since we use coll.get's ability to do a positional lookup of a loki id during adaptive indexing we will test it here
      // let's base this off of our 'remove' test so data is more meaningful

      var db = new loki('idxtest');
      var items = db.addCollection('users', {
        adaptiveBinaryIndices: false,
        indices: ['name'] 
      });
      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir'});

      // we know this will go in coll.data[4] as fifth document
      items.insert({
        name: 'fff'
      });
      
      items.adaptiveBinaryIndexInsert(4, "name");

      expect(items.binaryIndices.name.values[0]).toBe(3);  // draupnir at index position 0 and data[] position 3 (same as old)
      expect(items.binaryIndices.name.values[1]).toBe(4);  // fff at index position 1 and data[] position 4 (now)
      expect(items.binaryIndices.name.values[2]).toBe(1);  // gungnir at index position 2 (now) and data[] position 1
      expect(items.binaryIndices.name.values[3]).toBe(0);  // mjolnir at index position 3 (now) and data[] position 0 
      expect(items.binaryIndices.name.values[4]).toBe(2);  // tyrfing at index position 4 (now) and data[] position 2
    });
  });

  describe('adaptiveBinaryIndexUpdate works', function() {
    it('works', function () {

     var db = new loki('idxtest');
      var items = db.addCollection('users', {
        adaptiveBinaryIndices: false, // we are doing utility function testing
        indices: ['name'] 
      });
      
      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir'});

      expect(items.binaryIndices.name.values[0]).toBe(3);  
      expect(items.binaryIndices.name.values[1]).toBe(1);  
      expect(items.binaryIndices.name.values[2]).toBe(0);  
      expect(items.binaryIndices.name.values[3]).toBe(2);  
      
      // for this test, just update gungnir directly in collection.data
      items.data[1].name = 'ygungnir';
      
      // renegotiate index position of 2nd data element (ygungnir) within name index
      items.adaptiveBinaryIndexUpdate(1, "name");

      expect(items.binaryIndices.name.values[0]).toBe(3);  
      expect(items.binaryIndices.name.values[1]).toBe(0);  
      expect(items.binaryIndices.name.values[2]).toBe(2);  
      expect(items.binaryIndices.name.values[3]).toBe(1);  
    });
  });

  describe('adaptiveBinaryIndex batch updates work', function() {
    it('works', function() {
      var db = new loki('idxtest');
      var items = db.addCollection('items', {
        adaptiveBinaryIndices: true,
        indices: ['b'] 
      });
      
      // init 4 docs with bool 'b' all false
      var docs = [{a:8000, b:false}, {a:6000, b:false}, {a:4000, b: false}, {a:2000, b:false}];

      items.insert(docs);

      // update two docs to have 'b' true
      var results = items.find({a: {$in: [8000, 6000]}});
      results.forEach(function(obj) {
        obj.b = true;
      });
      items.update(results);

      // should be 2 of each
      expect(items.find({b: true}).length).toEqual(2);
      expect(items.find({b: false}).length).toEqual(2);

      // reset all bool 'b' props to false
      results = items.find({b: true});
      results.forEach(function(obj) {
        obj.b = false;
      });
      items.update(results);

      // should be no true and 4 false
      expect(items.find({b: true}).length).toEqual(0);
      expect(items.find({b: false}).length).toEqual(4);

      // update different 2 to be true
      results = items.find({a: {$in: [8000, 2000]}});
      results.forEach(function(obj) {
        obj.b = true;
      });
      items.update(results);

      // should be 2 true and 2 false
      expect(items.find({b: true}).length).toEqual(2);
      expect(items.find({b: false}).length).toEqual(2);
    });
  });

  describe('adaptiveBinaryIndexRemove works', function() {
    it('works', function () {

      // Since we use coll.get's ability to do a positional lookup of a loki id during adaptive indexing we will test it here
      
      // let's base this off of our 'remove' test so data is more meaningful
      
      var db = new loki('idxtest');
      var items = db.addCollection('users', { indices: ['name'] });
      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir'});

      // at this point lets break convention and use internal method directly, without calling higher level remove() to remove
      // from both data[] and index[].  We are not even removing from data we are just testing adaptiveBinaryIndexRemove as if we did/will.
      
      // lets 'remove' gungnir (which is in data array position 1) from our 'name' index
      items.adaptiveBinaryIndexRemove(1, "name");

      // should only be three index array elements now (ordered by name)
      expect(items.binaryIndices.name.values[0]).toBe(2);  // draupnir at index position 0 and data[] position 2 (now)
      expect(items.binaryIndices.name.values[1]).toBe(0);  // mjolnir at index position 1 and data[] position 0
      expect(items.binaryIndices.name.values[2]).toBe(1);  // tyrfing at index position 2 and data[] position 1 (now)
    });
  });

  describe('adaptiveBinaryIndex high level operability test', function() {
    it('works', function () {

      var db = new loki('idxtest');
      var coll = db.addCollection('users', { 
        adaptiveBinaryIndices: true,
        indices: ['customIdx'] 
      });

      var idx, result;
      
      // add 1000 records
      for (idx=0; idx<1000; idx++) {
        coll.insert({
          customIdx: idx,
          originalIdx: idx,
          desc: "inserted doc with customIdx of " + idx
        });
      }
      
      // update 1000 records causing index to move first in ordered list to last, one at a time
      // when finding each document we are also verifying it gave us back the correct document
      for(idx=0; idx<1000; idx++) {
        result = coll.findOne({customIdx: idx});
        expect(result).not.toEqual(null);
        expect(result.customIdx).toBe(idx);
        result.customIdx += 1000; 
        coll.update(result);
      }
      
      // find each document again (by its new customIdx), verify it is who we thought it was, then remove it
      for(idx=0; idx<1000; idx++) {
        result = coll.findOne({customIdx: idx+1000});
        expect(result).not.toEqual(null);
        expect(result.customIdx).toBe(idx+1000);
        coll.remove(result);
      }
      
      // all documents should be gone
      expect (coll.count()).toBe(0);
      
      // with empty collection , insert some records
      var one = coll.insert({ customIdx: 100 });
      var two = coll.insert({ customIdx: 200 });
      var three = coll.insert({ customIdx: 300 });
      var four = coll.insert({ customIdx: 400 });
      var five = coll.insert({ customIdx: 500 });
      
      // intersperse more records before and after previous each element
      coll.insert({customIdx:7});
      coll.insert({customIdx:123});
      coll.insert({customIdx:234});
      coll.insert({customIdx:345});
      coll.insert({customIdx:567});

      // verify some sampling returns correct objects
      expect(coll.findOne({customIdx: 300}).customIdx).toBe(300);
      expect(coll.findOne({customIdx: 234}).customIdx).toBe(234);
      expect(coll.findOne({customIdx: 7}).customIdx).toBe(7);
      expect(coll.findOne({customIdx: 567}).customIdx).toBe(567);
      
      // remove 4 records at various positions, forcing indices to be inserted and removed
      coll.remove(coll.findOne({customIdx: 567}));
      coll.remove(coll.findOne({customIdx: 234}));
      coll.remove(coll.findOne({customIdx: 7}));
      coll.remove(coll.findOne({customIdx: 300}));
      
      // verify find() returns correct document or null for all previously added customIdx's
      expect(coll.findOne({customIdx: 100}).customIdx).toBe(100);
      expect(coll.findOne({customIdx: 200}).customIdx).toBe(200);
      expect(coll.findOne({customIdx: 300})).toBe(null);
      expect(coll.findOne({customIdx: 400}).customIdx).toBe(400);
      expect(coll.findOne({customIdx: 500}).customIdx).toBe(500);
      expect(coll.findOne({customIdx: 7})).toBe(null);
      expect(coll.findOne({customIdx: 123}).customIdx).toBe(123);
      expect(coll.findOne({customIdx: 234})).toBe(null);
      expect(coll.findOne({customIdx: 345}).customIdx).toBe(345);
      expect(coll.findOne({customIdx: 567})).toBe(null);
    });
  });

  describe('adaptiveBinaryIndex high level random stress test', function() {
    it('works', function () {

      var db = new loki('idxtest');
      var coll = db.addCollection('users', { 
        adaptiveBinaryIndices: true,
        indices: ['customIdx'] 
      });

      var idx, result, minVal=1, maxVal=1000;
      
      var currId, idVector = [];
      
      // add 1000 records
      for (idx=0; idx<1000; idx++) {
        currId = Math.floor(Math.random() * (maxVal - minVal) + minVal);

        coll.insert({
          customIdx: currId,
          sequence: idx,
          desc: "inserted doc with sequence of " + idx
        });

        idVector.push(currId);
      }
      
      // update 1000 records causing index to move first in ordered list to last, one at a time
      // when finding each document we are also verifying it gave us back the correct document
      for(idx=0; idx<1000; idx++) {
        currId = idVector.pop();
        result = coll.findOne({customIdx: currId});
        expect(result).not.toEqual(null);
        expect(result.customIdx).toBe(currId);
      }
    });

  });

  describe('adaptiveBinaryIndex collection serializes correctly', function() {
    it('works', function () {

      var db = new loki('idxtest');
      var coll = db.addCollection('users', { 
        adaptiveBinaryIndices: true,
        indices: ['customIdx'] 
      });
      coll.insert({ customIdx: 1 });
      
      var jsonString = db.serialize();

      var newDatabase = new loki('idxtest');
      newDatabase.loadJSON(jsonString);
      
      expect(newDatabase.getCollection('users').adaptiveBinaryIndices).toBe(true);
      

      // repeat without option set
      db = new loki('idxtest');
      coll = db.addCollection('users', { 
        adaptiveBinaryIndices: false,
        indices: ['customIdx'] 
      });
      coll.insert({ customIdx: 1 });

      jsonString = db.serialize();
      newDatabase = new loki('idxtest');
      newDatabase.loadJSON(jsonString);
      
      expect(newDatabase.getCollection('users').adaptiveBinaryIndices).toBe(false);
    });
  });

  describe('checkIndex works', function() {
    it('works', function () {
      var db = new loki('bitest.db');
      var coll = db.addCollection('bitest', { indices: ['a'] });
      coll.insert([{ a: 9 }, { a: 3 }, { a: 7}, { a: 0 }, { a: 1 }]);

      // verify our initial order is valid
      expect(coll.checkIndex('a')).toBe(true);

      // now force index corruption by tampering with it
      coll.binaryIndices['a'].values.reverse();

      // verify out index is now invalid
      expect(coll.checkIndex('a')).toBe(false);

      // also verify our test of all indices reports false
      var result = coll.checkAllIndexes();
      expect(result.length).toBe(1);
      expect(result[0]).toBe('a');

      // let's just make sure that random sampling doesn't throw error
      coll.checkIndex('a', { randomSampling: true, randomSamplingFactor: .5 });

      // now have checkindex repair the index
      // also expect it to report that it was invalid before fixing
      expect(coll.checkIndex('a', { repair: true })).toBe(false);

      // now expect it to report that the index is valid
      expect(coll.checkIndex('a')).toBe(true);

      // now leave index ordering valid but remove the last value (from index)
      coll.binaryIndices['a'].values.pop();

      // expect checkIndex to report index to be invalid
      expect(coll.checkIndex('a')).toBe(false);

      // now have checkindex repair the index
      // also expect it to report that it was invalid before fixing
      expect(coll.checkIndex('a', { repair: true })).toBe(false);

      // now expect it to report that the index is valid
      expect(coll.checkIndex('a')).toBe(true);

      // verify the check all indexes function returns empty array
      expect(coll.checkAllIndexes().length).toBe(0);
    });
  });
});