var loki = require('../../src/lokijs');

describe('cloning behavior', function () {
  beforeEach(function () {
    db = new loki('cloningDisabled'),
    items = db.addCollection('items');

    items.insert({ name : 'mjolnir', owner: 'thor', maker: 'dwarves' });
    items.insert({ name : 'gungnir', owner: 'odin', maker: 'elves' });
    items.insert({ name : 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' });
    items.insert({ name : 'draupnir', owner: 'odin', maker: 'elves' });
  });

  describe('cloning disabled', function() {
    it('works', function () {

      var mj = items.findOne({ name: 'mjolnir'});

      // you are modifying the actual object instance so this is worst case
      // where you modify that object and dont even call update().
      // this is not recommended, you should definately call update after modifying an object.
      mj.maker = "the dwarves";

      var mj2 = items.findOne({ name: 'mjolnir'});

      expect(mj2.maker).toBe("the dwarves");
    });
  });

  describe('cloning inserts are immutable', function() {
    it('works', function() {
      var cdb = new loki('clonetest');
      var citems = cdb.addCollection('items', { clone: true });
      var oldObject = { name: 'mjolnir', owner: 'thor', maker: 'dwarves' };
      var insObject = citems.insert(oldObject);

      // cant' have either of these polluting our collection
      oldObject.name = 'mewmew';
      insObject.name = 'mewmew';

      var result = citems.findOne({'owner': 'thor'});

      expect(result.name).toBe("mjolnir");
    });
  });

  describe('cloning insert events emit cloned object', function() {
    it('works', function() {
      var cdb = new loki('clonetest');
      var citems = cdb.addCollection('items', { clone: true });

      citems.on("insert", function(obj) {
        /// attempt to tamper with name
        obj.name = "zzz";
      });

      citems.insert({ name : 'mjolnir', owner: 'thor', maker: 'dwarves', count:0 });
      citems.insert({ name : 'gungnir', owner: 'odin', maker: 'elves', count:0 });
      citems.insert({ name : 'tyrfing', owner: 'Svafrlami', maker: 'dwarves', count:0 });
      citems.insert({ name : 'draupnir', owner: 'odin', maker: 'elves', count:0 });

      var results = citems.find();
      expect(results.length).toEqual(4);

      results.forEach(function(obj) {
        expect(obj.name === 'zzz').toEqual(false);
      });
    });
  });  

  describe('cloning updates are immutable', function() {
    it('works', function() {
      var cdb = new loki('clonetest');
      var citems = cdb.addCollection('items', { clone: true });
      var oldObject = { name: 'mjolnir', owner: 'thor', maker: 'dwarves' };
      citems.insert(oldObject);
      var rObject = citems.findOne({'owner': 'thor'});
      
      // after all that, just do this to ensure internal ref is different
      citems.update(rObject); 
      
      // can't have this polluting our collection
      rObject.name = 'mewmew';
      
      var result = citems.findOne({'owner': 'thor'});

      expect(result.name).toBe("mjolnir");
    });
  });

  describe('cloning updates events emit cloned object', function() {
    it('works', function() {
      var cdb = new loki('clonetest');
      var citems = cdb.addCollection('items', { clone: true });

      citems.insert({ name : 'mjolnir', owner: 'thor', maker: 'dwarves', count:0 });
      citems.insert({ name : 'gungnir', owner: 'odin', maker: 'elves', count:0 });
      citems.insert({ name : 'tyrfing', owner: 'Svafrlami', maker: 'dwarves', count:0 });
      citems.insert({ name : 'draupnir', owner: 'odin', maker: 'elves', count:0 });

      citems.on("update", function(obj) {
        /// attempt to tamper with name
        obj.name = "zzz";
      });

      citems.findAndUpdate({ name: "mjolnir" }, function(o) {
        // make an approved modification
        o.count++;
      });

      var results = citems.find();
      expect(results.length).toEqual(4);

      results.forEach(function(obj) {
        expect(obj.name === 'zzz').toEqual(false);
      });

      var mj=citems.findOne({name: "mjolnir"});
      expect(mj.count).toEqual(1);
    });
  });

  describe('cloning method "shallow" save prototype', function() {
    it('works', function() {
      function Item(name, owner, maker) {
        this.name = name;
        this.owner = owner;
        this.maker = maker;
      }

      var cdb = new loki('clonetest');
      var citems = cdb.addCollection('items', { clone: true, cloneMethod: "shallow" });
      var oldObject = new Item('mjolnir', 'thor', 'dwarves');
      var insObject = citems.insert(oldObject);

      // cant' have either of these polluting our collection
      oldObject.name = 'mewmew';
      insObject.name = 'mewmew';

      var result = citems.findOne({'owner': 'thor'});

      expect(result instanceof Item).toBe(true);
      expect(result.name).toBe("mjolnir");
    });
  });

  describe('collection find() cloning works', function() {
    it('works', function () {
      var cdb = new loki('cloningEnabled');
      var citems = cdb.addCollection('items', {
        clone: true
        //, clonemethod: "parse-stringify"
      });

      citems.insert({ name : 'mjolnir', owner: 'thor', maker: 'dwarves' });
      citems.insert({ name : 'gungnir', owner: 'odin', maker: 'elves' });
      citems.insert({ name : 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' });
      citems.insert({ name : 'draupnir', owner: 'odin', maker: 'elves' });

      // just to prove that resultset.data() is not giving the user the actual object reference we keep internally
      // we will modify the object and see if future requests for that object show the change
      var mj = citems.find({ name: 'mjolnir' })[0];
      mj.maker = "the dwarves";

      var mj2 = citems.find({ name: 'mjolnir' })[0];

      expect(mj2.maker).toBe("dwarves");
    });
  });

  describe('collection findOne() cloning works', function() {
    it('works', function () {
      var cdb = new loki('cloningEnabled');
      var citems = cdb.addCollection('items', {
        clone: true
        //, clonemethod: "parse-stringify"
      });

      citems.insert({ name : 'mjolnir', owner: 'thor', maker: 'dwarves' });
      citems.insert({ name : 'gungnir', owner: 'odin', maker: 'elves' });
      citems.insert({ name : 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' });
      citems.insert({ name : 'draupnir', owner: 'odin', maker: 'elves' });

      // just to prove that resultset.data() is not giving the user the actual object reference we keep internally
      // we will modify the object and see if future requests for that object show the change
      var mj = citems.findOne({ name: 'mjolnir' });
      mj.maker = "the dwarves";

      var mj2 = citems.findOne({ name: 'mjolnir' });

      expect(mj2.maker).toBe("dwarves");
    });
  });

  describe('collection where() cloning works', function() {
    it('works', function () {
      var cdb = new loki('cloningEnabled');
      var citems = cdb.addCollection('items', {
        clone: true
        //, clonemethod: "parse-stringify"
      });

      citems.insert({ name : 'mjolnir', owner: 'thor', maker: 'dwarves' });
      citems.insert({ name : 'gungnir', owner: 'odin', maker: 'elves' });
      citems.insert({ name : 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' });
      citems.insert({ name : 'draupnir', owner: 'odin', maker: 'elves' });

      // just to prove that resultset.data() is not giving the user the actual object reference we keep internally
      // we will modify the object and see if future requests for that object show the change
      var mj = citems.where(function(obj) {
        return obj.name === 'mjolnir' ;
      })[0];
      mj.maker = "the dwarves";

      var mj2 = citems.where(function(obj) {
        return obj.name === 'mjolnir' ;
      })[0];

      expect(mj2.maker).toBe("dwarves");
    });
  });

  describe('collection by() cloning works', function() {
    it('works', function () {
      var cdb = new loki('cloningEnabled');
      var citems = cdb.addCollection('items', {
        clone: true,
        unique: ['name']
        //, clonemethod: "parse-stringify"
      });

      citems.insert({ name : 'mjolnir', owner: 'thor', maker: 'dwarves' });
      citems.insert({ name : 'gungnir', owner: 'odin', maker: 'elves' });
      citems.insert({ name : 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' });
      citems.insert({ name : 'draupnir', owner: 'odin', maker: 'elves' });

      // just to prove that resultset.data() is not giving the user the actual object reference we keep internally
      // we will modify the object and see if future requests for that object show the change
      var mj = citems.by("name", "mjolnir");
      mj.maker = "the dwarves";

      var mj2 = citems.by("name", "mjolnir");

      expect(mj2.maker).toBe("dwarves");
    });
  });

  describe('collection by() cloning works with no data', function() {
    it('works', function () {
      var cdb = new loki('cloningEnabled');
      var citems = cdb.addCollection('items', {
        clone: true,
        unique: ['name']
      });

      citems.insert({ name : 'mjolnir', owner: 'thor', maker: 'dwarves' });
      
      // we dont have any items so this should return null
      var result = citems.by('name', 'gungnir');
      expect(result).toEqual(null);
      result = citems.by('name', 'mjolnir');
      expect(result.owner).toEqual('thor');
    });
  });

  describe('resultset data cloning works', function() {
    it('works', function () {
      var cdb = new loki('cloningEnabled');
      var citems = cdb.addCollection('items', {
        clone: true
        //, clonemethod: "parse-stringify"
      });

      citems.insert({ name : 'mjolnir', owner: 'thor', maker: 'dwarves' });
      citems.insert({ name : 'gungnir', owner: 'odin', maker: 'elves' });
      citems.insert({ name : 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' });
      citems.insert({ name : 'draupnir', owner: 'odin', maker: 'elves' });

      // just to prove that resultset.data() is not giving the user the actual object reference we keep internally
      // we will modify the object and see if future requests for that object show the change
      var mj = citems.chain().find({ name: 'mjolnir' }).data()[0];
      mj.maker = "the dwarves";

      var mj2 = citems.findOne({ name: 'mjolnir' });

      expect(mj2.maker).toBe("dwarves");
    });
  });

  describe('resultset data forced cloning works', function() {
    it('works', function () {
      // although our collection does not define cloning, we can choose to clone results
      // within resultset.data() options
      var mj = items.chain().find({ name: 'mjolnir' }).data({
        forceClones: true
        //,forceCloneMethod: 'parse-stringify'
      })[0];
      mj.maker = "the dwarves";

      var mj2 = items.findOne({ name: 'mjolnir' });

      expect(mj2.maker).toBe("dwarves");
    });
  });


});